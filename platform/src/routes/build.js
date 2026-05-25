const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { processJob, subscribeToJob, getJobHistory } = require('../services/worker')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// POST /api/build — create job
router.post('/', async (req, res) => {
  const { plan, projectId, userId } = req.body
  if (!plan || !projectId || !userId)
    return res.status(400).json({ error: 'Missing required fields' })

  try {
    const { data: profile } = await supabase
      .from('profiles').select('credits').eq('id', userId).single()
    if (!profile || profile.credits < 0.5)
      return res.status(402).json({ error: 'Insufficient credits' })

    const { data: job, error } = await supabase
      .from('build_jobs')
      .insert({ project_id: projectId, user_id: userId, plan, status: 'queued', progress: [] })
      .select().single()
    if (error) throw error

    // Delay start so SSE client can connect first
    setTimeout(() => {
      processJob(job.id).catch(err => console.error('[Build] Job error:', err.message))
    }, 1500)

    res.json({ job_id: job.id })
  } catch (err) {
    console.error('[Build] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/build/stream/:jobId — SSE stream
router.get('/stream/:jobId', async (req, res) => {
  const { jobId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (event) => {
    try { res.write(`data: ${JSON.stringify(event)}\n\n`) } catch {}
  }

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n') } catch {}
  }, 10000)

  try {
    const { data: job } = await supabase
      .from('build_jobs').select('*').eq('id', jobId).single()

    if (!job) {
      send({ type: 'error', message: 'Job not found' })
      clearInterval(keepalive)
      res.end()
      return
    }

    // Replay history from memory first
    const history = getJobHistory(jobId)
    if (history.length > 0) {
      history.forEach(e => send(e))
    } else if (job.progress?.length > 0) {
      job.progress.forEach(e => send(e))
    }

    // If already done/failed replay and close
    if (job.status === 'done' || job.status === 'failed') {
      clearInterval(keepalive)
      setTimeout(() => res.end(), 300)
      return
    }

    // Subscribe to live events
    const unsubscribe = subscribeToJob(jobId, (event) => {
      send(event)
      if (event.type === 'done' || event.type === 'error') {
        clearInterval(keepalive)
        setTimeout(() => res.end(), 500)
      }
    })

    req.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
    })
  } catch (err) {
    send({ type: 'error', message: err.message })
    clearInterval(keepalive)
    res.end()
  }
})

// GET /api/build/status/:jobId
router.get('/status/:jobId', async (req, res) => {
  const { data: job } = await supabase
    .from('build_jobs')
    .select('id,status,subdomain,credits_used,error,created_at')
    .eq('id', req.params.jobId).single()
  if (!job) return res.status(404).json({ error: 'Job not found' })
  res.json(job)
})

module.exports = router
