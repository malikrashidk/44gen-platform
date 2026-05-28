import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { clarifyRequest, isTemporaryGeminiError } from '../services/gemini.js'
import { requireAuth } from '../middleware/auth.js'

// #38: Validate UUID format before passing to Supabase to avoid DB errors on malformed input
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}


const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { prompt, projectId, mode = 'plan' } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' })
  if (projectId && !isValidUUID(projectId))
    return res.status(400).json({ error: 'Invalid project ID' })

  try {
    let project = null
    if (projectId) {
      const { data } = await supabase
        .from('projects')
        .select('id,name,status,prompt,subdomain,user_id')
        .eq('id', projectId)
        .eq('user_id', req.user.id)
        .single()
      project = data
    }

    const result = await clarifyRequest({ mode, prompt, project })

    if (!['answer', 'questions', 'proceed'].includes(result.action)) {
      return res.json({ action: 'proceed', refined_prompt: prompt })
    }

    res.json({
      action: result.action,
      answer: result.answer || '',
      refined_prompt: result.refined_prompt || prompt,
      questions: Array.isArray(result.questions) ? result.questions.slice(0, 3) : []
    })
  } catch (error) {
    console.error('[Clarify] Error:', error)
    if (isTemporaryGeminiError(error)) {
      return res.status(503).json({
        error: 'AI is busy right now. Please try again in a moment.',
        retryable: true
      })
    }
    res.status(500).json({ error: 'Failed to understand request', retryable: true })
  }
})

export default router
