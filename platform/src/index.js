const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const generateRoute = require('./routes/generate')
const planRoute = require('./routes/plan')
const buildRoute = require('./routes/build')

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet({
  contentSecurityPolicy: false // allow SSE
}))
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))

// Routes
app.use('/api/generate', generateRoute)
app.use('/api/plan', planRoute)
app.use('/api/build', buildRoute)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: '44gen' })
})

app.listen(PORT, () => {
  console.log(`44gen platform running on port ${PORT}`)
})
