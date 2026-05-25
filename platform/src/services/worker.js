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
    jobStore.set(jobId, { listeners: new Set(), history: [] })
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
  // Persist to DB async (non-blocking)
  persistProgress(jobId, eventWithTs)
}

async function persistProgress(jobId, event) {
  try {
    const { data } = await supabase
      .from('build_jobs').select('progress').eq('id', jobId).single()
    const progress = Array.isArray(data?.progress) ? data.progress : []
    progress.push(event)
    await supabase.from('build_jobs')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch {}
}

function subscribeToJob(jobId, listener) {
  const store = getStore(jobId)
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
    if (store.listeners.size === 0) {
      setTimeout(() => jobStore.delete(jobId), 10 * 60 * 1000)
    }
  }
}

function getJobHistory(jobId) {
  return jobStore.get(jobId)?.history || []
}

async function processJob(jobId) {
  const emit = (type, data = {}) => emitJobEvent(jobId, { type, ...data })

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

    // Code generation with streaming
    emit('code_start', { file: 'src/App.jsx', message: 'Writing src/App.jsx...' })

    const { code, tokens_used } = await generateCodeStream(
      job.plan,
      job.plan.current_phase || 1,
      (chunk) => emit('code_chunk', { text: chunk }),
      (thought) => emit('thought', { text: thought })
    )

    emit('code_end', { message: 'Code generation complete' })

    // Save code
    await supabase.from('project_files').upsert({
      project_id: job.project_id,
      file_path: 'src/App.jsx',
      content: code
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

    // Summary
    emit('summarizing', { message: 'Generating summary...' })
    const summary = await generateSummary(job.plan, ['src/App.jsx'])

    // Update project
    await supabase.from('projects').update({
      name: job.plan.app_name || 'My App',
      prompt: job.plan.understanding,
      status: 'deployed',
      subdomain
    }).eq('id', job.project_id)

    // Deduct credits
    await supabase.from('credit_transactions').insert({
      user_id: job.user_id,
      project_id: job.project_id,
      action: 'build',
      credits_before: profile.credits,
      credits_used,
      credits_after: profile.credits - credits_used,
      tokens_used,
      description: `Phase ${job.plan.current_phase}/${job.plan.total_phases}`
    })

    await supabase.from('profiles')
      .update({ credits: profile.credits - credits_used })
      .eq('id', job.user_id)

    // Save completion to conversations
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

    emit('done', {
      subdomain, credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[1]?.description,
      summary
    })

  } catch (err) {
    console.error('[Worker] Job failed:', err.message)
    await supabase.from('build_jobs')
      .update({ status: 'failed', error: err.message }).eq('id', jobId)
    emit('error', { message: err.message })
  }
}

module.exports = { processJob, subscribeToJob, getJobHistory }
