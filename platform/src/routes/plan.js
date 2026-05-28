import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { generatePlan, isTemporaryGeminiError } from '../services/gemini.js'
import { requireAuth } from '../middleware/auth.js'

// #38: Validate UUID format before passing to Supabase to avoid DB errors on malformed input
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}


const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { prompt, projectId } = req.body
  const userId = req.user.id

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' })
  if (projectId && !isValidUUID(projectId))
    return res.status(400).json({ error: 'Invalid project ID' })

  const { data: profile } = await supabase
    .from('profiles').select('credits').eq('id', userId).single()
  if (!profile || profile.credits < 0.1)
    return res.status(402).json({ error: 'Insufficient credits' })

  try {
    const { plan, tokens_used } = await generatePlan(prompt)
    const credits_used = parseFloat((tokens_used / 10000).toFixed(2))

    const { data: updated } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - credits_used })
      .eq('id', userId)
      .gte('credits', credits_used)
      .select('credits')
      .single()

    if (!updated) {
      return res.status(402).json({ error: 'Insufficient credits' })
    }

    if (projectId) {
      await supabase.from('plans').insert({
        project_id: projectId,
        user_id: userId,
        prompt,
        plan,
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

    res.json({ ...plan, credits_used, tokens_used })
  } catch (error) {
    console.error('[Plan] Error:', error)
    if (isTemporaryGeminiError(error)) {
      return res.status(503).json({
        error: 'AI is busy right now. Please try again in a moment.',
        retryable: true
      })
    }
    res.status(500).json({ error: 'Failed to generate plan', retryable: true })
  }
})

export default router
