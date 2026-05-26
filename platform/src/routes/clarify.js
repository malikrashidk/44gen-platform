import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { clarifyRequest, isTemporaryGeminiError } from '../services/gemini.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

router.post('/', requireAuth, async (req, res) => {
  const { prompt, projectId, mode = 'plan' } = req.body
  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' })

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
