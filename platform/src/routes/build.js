const express = require('express')
const router = express.Router()
const { generateCode } = require('../services/gemini')
const { buildAndDeploy } = require('../services/builder')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

router.post('/', async (req, res) => {
  const { plan, projectId, userId } = req.body

  if (!plan || !projectId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Check user has enough credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    if (!profile || profile.credits < 1) {
      return res.status(402).json({ error: 'Insufficient credits' })
    }

    // Generate code
    const { code, tokens_used } = await generateCode(plan, plan.current_phase)

    // Calculate credits dynamically
    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    // Build and deploy
    const subdomain = await buildAndDeploy(projectId, code)

    // Save to project files
    await supabase.from('project_files').upsert({
      project_id: projectId,
      file_path: 'src/App.jsx',
      content: code
    })

    // Log credit transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      project_id: projectId,
      action: 'build',
      credits_before: profile.credits,
      credits_used,
      credits_after: profile.credits - credits_used,
      tokens_used,
      description: `Built phase ${plan.current_phase} of ${plan.total_phases}`
    })

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: profile.credits - credits_used })
      .eq('id', userId)

    res.json({
      subdomain,
      credits_used,
      tokens_used,
      phase: plan.current_phase,
      total_phases: plan.total_phases
    })

  } catch (error) {
    console.error('Build error:', error)
    res.status(500).json({ error: 'Build failed: ' + error.message })
  }
})

module.exports = router
