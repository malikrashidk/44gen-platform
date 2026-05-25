const express = require('express')
const router = express.Router()
const { generatePlan } = require('../services/gemini')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

router.post('/', async (req, res) => {
  const { prompt, projectId } = req.body

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' })

  try {
    const { plan, tokens_used } = await generatePlan(prompt)

    // Calculate credits (dynamic based on tokens)
    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    // Save plan to database
    if (projectId) {
      await supabase.from('plans').insert({
        project_id: projectId,
        prompt,
        understanding: plan.understanding,
        steps: plan.steps,
        files: plan.files,
        questions: plan.questions,
        out_of_scope: plan.out_of_scope,
        phases: plan.phases,
        is_complex: plan.is_complex,
        current_phase: plan.current_phase,
        total_phases: plan.total_phases,
        status: 'pending',
        credits_used,
        tokens_used
      })
    }

    res.json({
      ...plan,
      credits_used,
      tokens_used
    })

  } catch (error) {
    console.error('Plan error:', error)
    res.status(500).json({ error: 'Failed to generate plan' })
  }
})

module.exports = router
