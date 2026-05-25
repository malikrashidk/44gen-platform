const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const generateRoute = require('./routes/generate')
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

// Global rate limit: 200 requests per 15 min per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}))

// Tighter limit on expensive endpoints
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

app.use('/api/generate', generateRoute)
app.use('/api/plan', planLimiter, planRoute)
app.use('/api/build', buildLimiter, buildRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok', platform: '44gen' }))

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

app.listen(PORT, () => console.log(`44gen platform running on port ${PORT}`))
