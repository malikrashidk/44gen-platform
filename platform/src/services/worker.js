const { generateCodeStream, generateSummary } = require('./gemini')
const { buildAndDeploy } = require('./builder')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// In-memory event emitters per job
const jobEmitters = new Map()

function getJobEmitter(jobId) {
  if (!jobEmitters.has(jobId)) {
    jobEmitters.set(jobId, { listeners: [], history: [] })
  }
  return jobEmitters.get(jobId)
}

function emitJobEvent(jobId, event) {
  const emitter = getJobEmitter(jobId)
  // Save to history for reconnecting clients
  emitter.history.push(event)
  // Notify all active listeners
  emitter.listeners.forEach(listener => listener(event))
  // Also persist progress to DB
  appendJobProgress(jobId, event)
}

async function appendJobProgress(jobId, event) {
  try {
    const { data } = await supabase
      .from('build_jobs')
      .select('progress')
      .eq('id', jobId)
      .single()

    const progress = data?.progress || []
    progress.push({ ...event, ts: Date.now() })

    await supabase
      .from('build_jobs')
      .update({ progress, updated_at: new Date().toISOString() })
      .eq('id', jobId)
  } catch (err) {
    console.error('[Worker] Failed to save progress:', err.message)
  }
}

function subscribeToJob(jobId, listener) {
  const emitter = getJobEmitter(jobId)
  emitter.listeners.push(listener)
  return () => {
    emitter.listeners = emitter.listeners.filter(l => l !== listener)
    if (emitter.listeners.length === 0) {
      // Clean up after 5 min if no listeners
      setTimeout(() => jobEmitters.delete(jobId), 5 * 60 * 1000)
    }
  }
}

function getJobHistory(jobId) {
  return jobEmitters.get(jobId)?.history || []
}

async function processJob(jobId) {
  const emit = (type, data) => emitJobEvent(jobId, { type, ...data })

  try {
    // Get job from DB
    const { data: job } = await supabase
      .from('build_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job) throw new Error('Job not found')

    // Update status to building
    await supabase
      .from('build_jobs')
      .update({ status: 'building' })
      .eq('id', jobId)

    // Get user profile for credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', job.user_id)
      .single()

    if (!profile || profile.credits < 0.5) {
      throw new Error('Insufficient credits')
    }

    emit('start', { message: 'Starting code generation...' })

    // Stream code generation
    let codeBuffer = ''
    emit('code_start', { file: 'src/App.jsx', message: 'Writing src/App.jsx...' })

    const { code, tokens_used } = await generateCodeStream(
      job.plan,
      job.plan.current_phase || 1,
      // onChunk - stream code tokens
      (chunk) => {
        codeBuffer += chunk
        emit('code_chunk', { text: chunk })
      },
      // onThought - stream AI thinking
      (thought) => {
        emit('thought', { text: thought })
      }
    )

    emit('code_end', { message: 'Code generation complete' })

    // Save code to project files
    await supabase.from('project_files').upsert({
      project_id: job.project_id,
      file_path: 'src/App.jsx',
      content: code
    })

    // Save conversation message for code
    await supabase.from('conversations').insert({
      project_id: job.project_id,
      role: 'assistant',
      content: code,
      type: 'code'
    })

    // Build and deploy with progress
    const subdomain = await buildAndDeploy(
      job.project_id,
      code,
      (progress) => emit(progress.type, { message: progress.message })
    )

    // Calculate credits
    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    // Generate summary
    emit('summarizing', { message: 'Generating summary...' })
    const summary = await generateSummary(job.plan, ['src/App.jsx'])

    // Update project
    await supabase
      .from('projects')
      .update({
        name: job.plan.app_name || 'My App',
        prompt: job.plan.understanding,
        status: 'deployed',
        subdomain
      })
      .eq('id', job.project_id)

    // Log credit transaction
    await supabase.from('credit_transactions').insert({
      user_id: job.user_id,
      project_id: job.project_id,
      action: 'build',
      credits_before: profile.credits,
      credits_used,
      credits_after: profile.credits - credits_used,
      tokens_used,
      description: `Built phase ${job.plan.current_phase} of ${job.plan.total_phases}`
    })

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: profile.credits - credits_used })
      .eq('id', job.user_id)

    // Save completion message to conversations
    const completionMsg = {
      type: 'complete',
      subdomain,
      credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[1]?.description,
      summary
    }
    await supabase.from('conversations').insert({
      project_id: job.project_id,
      role: 'assistant',
      content: JSON.stringify(completionMsg),
      type: 'complete',
      credits_used,
      tokens_used
    })

    // Update job as done
    await supabase
      .from('build_jobs')
      .update({ status: 'done', subdomain, credits_used })
      .eq('id', jobId)

    emit('done', {
      subdomain,
      credits_used,
      phase: job.plan.current_phase,
      total_phases: job.plan.total_phases,
      next_phase_description: job.plan.phases?.[1]?.description,
      summary
    })

  } catch (err) {
    console.error('[Worker] Job failed:', err.message)
    await supabase
      .from('build_jobs')
      .update({ status: 'failed', error: err.message })
      .eq('id', jobId)

    emit('error', { message: err.message })
  }
}

module.exports = { processJob, subscribeToJob, getJobHistory, getJobEmitter }
