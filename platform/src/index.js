import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { supabase } from './lib/supabase.js'
import 'dotenv/config'

import planRoute from './routes/plan.js'
import buildRoute from './routes/build.js'
import projectsRoute from './routes/projects.js'
import clarifyRoute from './routes/clarify.js'
import imagesRoute from './routes/images.js'
import githubRoute from './routes/github.js'
import { billingRouter, polarWebhookHandler } from './routes/billing.js'
import secretsRoute from './routes/secrets.js'
import domainsRoute from './routes/domains.js'
import { customDomainMiddleware, domainCheckHandler } from './middleware/customDomain.js'

const app = express()
const PORT = process.env.PORT || 4000

app.set('trust proxy', 1)
app.use(compression())
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || false,
  credentials: true
}))

app.use(express.json({
  limit: '20mb',
  verify: (req, _res, buf) => {
    if (req.originalUrl === '/api/billing/webhook') req.rawBody = buf
  }
}))
app.post('/api/billing/webhook', polarWebhookHandler)

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}))

const buildLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  message: { error: 'Too many build requests per minute.' }
})
const planLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  message: { error: 'Too many plan requests per minute.' }
})

app.use('/api/plan', planLimiter, planRoute)
app.use('/api/build', buildLimiter, buildRoute)
app.use('/api/projects', projectsRoute)
app.use('/api/clarify', planLimiter, clarifyRoute)
app.use('/api/images', imagesRoute)
app.use('/api/github', githubRoute)
app.use('/api/secrets', secretsRoute)
app.use('/api/domains', domainsRoute)
app.use('/api/billing', billingRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok', platform: '44gen' }))

// Caddy asks this before issuing a TLS cert for a custom domain
// Must be fast and unauthenticated — Caddy calls it internally
app.get('/internal/domain-check', domainCheckHandler)

// Serve static files for verified custom domains
// Must come AFTER /api/ routes so API calls still work
app.use(customDomainMiddleware)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

async function recoverStaleJobs() {
  try {

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
