const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { processJob, subscribeToJob, getJobHistory } = require('../services/worker')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// POST /api/build — create job and start processing
router.post('/', async (req, res) => {
  const { plan, projectId, userId } = req.body

  if (!plan || !projectId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Check credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    if (!profile || profile.credits < 0.5) {
      return res.status(402).json({ error: 'Insufficient credits' })
    }

    // Create build job
    const { data: job, error } = await supabase
      .from('build_jobs')
      .insert({
        project_id: projectId,
        user_id: userId,
        plan,
        status: 'queued',
        progress: []
      })
      .select()
      .single()

    if (error) throw error

    // Start processing in background (don't await)
    processJob(job.id).catch(err => {
      console.error('[Build] Job processing error:', err.message)
    })

    res.json({ job_id: job.id })

  } catch (err) {
    console.error('[Build] Error creating job:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/build/stream/:jobId — SSE stream for a job
router.get('/stream/:jobId', async (req, res) => {
  const { jobId } = req.params

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const send = (event) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    } catch (err) {
      console.error('[SSE] Write error:', err.message)
    }
  }

  // Send keepalive every 15s
  const keepalive = setInterval(() => {
    try {
      res.write(': keepalive\n\n')
    } catch {}
  }, 15000)

  try {
    // Check if job exists and get status
    const { data: job } = await supabase
      .from('build_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job) {
      send({ type: 'error', message: 'Job not found' })
      res.end()
      return
    }

    // If job already done/failed, replay history and close
    if (job.status === 'done' || job.status === 'failed') {
      const history = job.progress || []
      history.forEach(event => send(event))
      clearInterval(keepalive)
      res.end()
      return
    }

    // Replay history so far for reconnecting clients
    const history = getJobHistory(jobId)
    if (history.length > 0) {
      history.forEach(event => send(event))
    } else if (job.progress?.length > 0) {
      // Replay from DB if not in memory
      job.progress.forEach(event => send(event))
    }

    // Subscribe to new events
    const unsubscribe = subscribeToJob(jobId, (event) => {
      send(event)
      if (event.type === 'done' || event.type === 'error') {
        clearInterval(keepalive)
        setTimeout(() => res.end(), 500)
      }
    })

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
    })

  } catch (err) {
    console.error('[Stream] Error:', err.message)
    send({ type: 'error', message: err.message })
    clearInterval(keepalive)
    res.end()
  }
})

// GET /api/build/status/:jobId — check job status
router.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params
  const { data: job } = await supabase
    .from('build_jobs')
    .select('id, status, subdomain, credits_used, error, created_at')
    .eq('id', jobId)
    .single()

  if (!job) return res.status(404).json({ error: 'Job not found' })
  res.json(job)
})

module.exports = router
