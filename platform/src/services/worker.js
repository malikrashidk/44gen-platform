const { generateCodeStream, generateSummary } = require('./gemini')
const { buildAndDeploy } = require('./builder')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// In-memory store per job
const jobStore = new Map()

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
  // Debounced DB persist — write the full history at most every 2s,
  // which avoids read-modify-write races from concurrent event emissions
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

// Force-flush any pending persist immediately (call at job end)
async function flushPersist(jobId) {
  const store = jobStore.get(jobId)
  if (!store) return
  if (store.persistTimer) {
    clearTimeout(store.persistTimer)
    store.persistTimer = null
  }
  const snapshot = [...store.history]
  try {
    await supabase.from('build_jobs')
      .update({ progress: snapshot, updated_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch {}
}

function subscribeToJob(jobId, listener) {
  const store = getStore(jobId)
  store.listeners.add(listener)

  let cleanupTimer = null
  return () => {
    store.listeners.delete(listener)
    if (store.listeners.size === 0) {
      cleanupTimer = setTimeout(() => {
        const s = jobStore.get(jobId)
        // Only delete if still empty (no new listeners arrived)
        if (s && s.listeners.size === 0) jobStore.delete(jobId)
      }, 10 * 60 * 1000)
    }
  }
}

function getJobHistory(jobId) {
  return jobStore.get(jobId)?.history || []
}

const JOB_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

async function processJob(jobId) {
  const emit = (type, data = {}) => emitJobEvent(jobId, { type, ...data })

  // Hard timeout — mark job failed if it runs too long
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

    // Re-check credits at build time (user might have been refunded/spent since queue)
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

    // Save code — delete first to avoid duplicate rows (requires no unique constraint)
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

    // Build and deploy
    const subdomain = await buildAndDeploy(
      job.project_id,
      code,
      (progress) => emit(progress.type, { message: progress.message })
    )

    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    emit('summarizing', { message: 'Generating summary...' })
    const summary = await generateSummary(job.plan, ['src/App.jsx'])

    // Update project
    await supabase.from('projects').update({
      name: job.plan.app_name || 'My App',
      prompt: job.plan.understanding,
      status: 'deployed',
      subdomain
    }).eq('id', job.project_id)

    // Atomic credit deduction — WHERE credits >= amount prevents going negative
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
      credits_after: (updatedProfile?.credits ?? profile.credits - credits_used),
      tokens_used,
      description: `Phase ${job.plan.current_phase}/${job.plan.total_phases}`
    })

    const completionData = {
      type: 'complete', subdomain, credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[1]?.description,
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

    emit('done', {
      subdomain, credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[1]?.description,
      summary
    })

  } catch (err) {
    clearTimeout(timeoutHandle)
    console.error('[Worker] Job failed:', err.message)
    await supabase.from('build_jobs')
      .update({ status: 'failed', error: err.message }).eq('id', jobId)
    await flushPersist(jobId)
    emit('error', { message: err.message })
  }
}

module.exports = { processJob, subscribeToJob, getJobHistory }
