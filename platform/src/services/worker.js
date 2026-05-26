import { createClient } from '@supabase/supabase-js'
import { generateCodeStream, generateSummary } from './gemini.js'
import { buildAndDeploy } from './builder.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const jobStore = new Map()

const MAX_CONCURRENT = 3
let activeBuilds = 0
const pendingQueue = []

function getStore(jobId) {
  if (!jobStore.has(jobId)) {
    jobStore.set(jobId, { listeners: new Set(), history: [], persistTimer: null })
  }
  return jobStore.get(jobId)
}

function emitJobEvent(jobId, event) {
  const store = getStore(jobId)
  const eventWithTs = { ...event, ts: Date.now() }
  store.history.push(eventWithTs)
  store.listeners.forEach(fn => {
    try { fn(eventWithTs) } catch {}
  })
  schedulePersist(jobId, store)
}

function schedulePersist(jobId, store) {
  if (store.persistTimer) return
  store.persistTimer = setTimeout(async () => {
    store.persistTimer = null
    const snapshot = [...store.history]
    try {
      await supabase.from('build_jobs')
        .update({ progress: snapshot, updated_at: new Date().toISOString() })
        .eq('id', jobId)
    } catch {}
  }, 2000)
}

async function flushPersist(jobId) {
  const store = jobStore.get(jobId)
  if (!store) return
  if (store.persistTimer) {
    clearTimeout(store.persistTimer)
    store.persistTimer = null
  }
  try {
    await supabase.from('build_jobs')
      .update({ progress: [...store.history], updated_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch {}
}

export function subscribeToJob(jobId, listener) {
  const store = getStore(jobId)
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
    if (store.listeners.size === 0) {
      setTimeout(() => {
        const s = jobStore.get(jobId)
        if (s && s.listeners.size === 0) jobStore.delete(jobId)
      }, 10 * 60 * 1000)
    }
  }
}

export function getJobHistory(jobId) {
  return jobStore.get(jobId)?.history || []
}

export async function processJob(jobId) {
  if (activeBuilds >= MAX_CONCURRENT) {
    pendingQueue.push(jobId)
    emitJobEvent(jobId, { type: 'queued', message: `Build queued — waiting for a slot (${pendingQueue.length} ahead)...` })
    return
  }
  activeBuilds++
  try {
    await runJob(jobId)
  } finally {
    activeBuilds--
    const next = pendingQueue.shift()
    if (next) processJob(next)
  }
}

const JOB_TIMEOUT_MS = 10 * 60 * 1000

async function runJob(jobId) {
  const emit = (type, data = {}) => emitJobEvent(jobId, { type, ...data })

  const timeoutHandle = setTimeout(async () => {
    await supabase.from('build_jobs')
      .update({ status: 'failed', error: 'Job timed out after 10 minutes' })
      .eq('id', jobId)
    emit('error', { message: 'Build timed out. Please try again.' })
  }, JOB_TIMEOUT_MS)

  try {
    const { data: job } = await supabase
      .from('build_jobs').select('*').eq('id', jobId).single()
    if (!job) throw new Error('Job not found')

    await supabase.from('build_jobs')
      .update({ status: 'building' }).eq('id', jobId)

    const { data: profile } = await supabase
      .from('profiles').select('credits').eq('id', job.user_id).single()
    if (!profile || profile.credits < 0.5) throw new Error('Insufficient credits')

    emit('start', { message: 'Starting code generation...' })
    emit('code_start', { file: 'src/App.jsx', message: 'Writing src/App.jsx...' })

    const { code, tokens_used } = await generateCodeStream(
      job.plan,
      job.plan.current_phase || 1,
      (chunk) => emit('code_chunk', { text: chunk }),
      (thought) => emit('thought', { text: thought })
    )

    emit('code_end', { message: 'Code generation complete' })

    await supabase.from('project_files')
      .delete()
      .eq('project_id', job.project_id)
      .eq('file_path', 'src/App.jsx')
    await supabase.from('project_files').insert({
      project_id: job.project_id,
      file_path: 'src/App.jsx',
      content: code,
      updated_at: new Date().toISOString()
    })

    await supabase.from('conversations').insert({
      project_id: job.project_id,
      role: 'assistant',
      content: code,
      type: 'code'
    })

    const subdomain = await buildAndDeploy(
      job.project_id,
      code,
      (progress) => emit(progress.type, { message: progress.message })
    )

    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    emit('summarizing', { message: 'Generating summary...' })
    const summary = await generateSummary(job.plan, ['src/App.jsx'])

    await supabase.from('projects').update({
      name: job.plan.app_name || 'My App',
      prompt: job.plan.understanding,
      status: 'deployed',
      subdomain
    }).eq('id', job.project_id)

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - credits_used })
      .eq('id', job.user_id)
      .gte('credits', credits_used)
      .select('credits')
      .single()

    if (!updatedProfile) {
      console.warn('[Worker] Credit deduction skipped — balance changed during build')
    }

    await supabase.from('credit_transactions').insert({
      user_id: job.user_id,
      project_id: job.project_id,
      action: 'build',
      credits_before: profile.credits,
      credits_used,
      credits_after: updatedProfile?.credits ?? profile.credits - credits_used,
      tokens_used,
      description: `Phase ${job.plan.current_phase}/${job.plan.total_phases}`
    })

    const completionData = {
      type: 'complete', subdomain, credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[job.plan.current_phase]?.description,
      plan: job.plan,
      summary
    }

    await supabase.from('conversations').insert({
      project_id: job.project_id,
      role: 'assistant',
      content: JSON.stringify(completionData),
      type: 'complete',
      credits_used,
      tokens_used
    })

    await supabase.from('build_jobs')
      .update({ status: 'done', subdomain, credits_used })
      .eq('id', jobId)

    clearTimeout(timeoutHandle)
    await flushPersist(jobId)

    emit('done', completionData)

  } catch (err) {
    clearTimeout(timeoutHandle)
    console.error('[Worker] Job failed:', err.message)
    await supabase.from('build_jobs')
      .update({ status: 'failed', error: err.message }).eq('id', jobId)
    await flushPersist(jobId)
    emit('error', { message: err.message })
  }
}
