const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const planRoute = require('./routes/plan')
const buildRoute = require('./routes/build')

const app = express()
const PORT = process.env.PORT || 4000

app.use(compression())
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || false,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}))

const buildLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many build requests per minute.' }
})
const planLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many plan requests per minute.' }
})

app.use('/api/plan', planLimiter, planRoute)
app.use('/api/build', buildLimiter, buildRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok', platform: '44gen' }))

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// On startup, mark any jobs that were interrupted mid-build as failed
async function recoverStaleJobs() {
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY)

    const { data: stale } = await supabase
      .from('build_jobs')
      .select('id, project_id')
      .in('status', ['building', 'queued'])

    if (stale?.length) {
      console.log(`[Startup] Recovering ${stale.length} stale job(s) — marking as failed`)
      const ids = stale.map(j => j.id)
      await supabase.from('build_jobs')
        .update({ status: 'failed', error: 'Server restarted during build. Please try again.' })
        .in('id', ids)

      // Reset project status so they don't stay stuck on 'building'
      const projectIds = stale.map(j => j.project_id)
      await supabase.from('projects')
        .update({ status: 'draft' })
        .in('id', projectIds)
        .eq('status', 'building')
    }
  } catch (err) {
    console.error('[Startup] Stale job recovery failed:', err.message)
  }
}

app.listen(PORT, async () => {
  console.log(`44gen platform running on port ${PORT}`)
  await recoverStaleJobs()
})
