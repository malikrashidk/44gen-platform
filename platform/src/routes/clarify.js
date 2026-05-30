import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { clarifyRequest, isTemporaryGeminiError } from '../services/gemini.js'
import { requireAuth } from '../middleware/auth.js'

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
    let existingFiles = []

    if (projectId) {
      // Fetch project metadata
      const { data } = await supabase
        .from('projects')
        .select('id, name, status, prompt, subdomain, user_id')
        .eq('id', projectId)
        .eq('user_id', req.user.id)
        .single()
      project = data

      // Fetch existing files so the AI can give context-aware answers and advice.
      // For example: "how should I add auth?" benefits from knowing what already exists.
      if (project) {
        const { data: fileRows } = await supabase
          .from('project_files')
          .select('file_path, content')
          .eq('project_id', projectId)
          .order('file_path')
        if (fileRows?.length) {
          existingFiles = fileRows.map(f => ({ path: f.file_path, content: f.content }))
        }
      }
    }

    const result = await clarifyRequest({ mode, prompt, project, existingFiles })

    if (!['answer', 'questions', 'proceed'].includes(result.action)) {
      return res.json({ action: 'proceed', refined_prompt: prompt })
    }

    res.json({
      action: result.action,
      answer: result.answer || '',
      refined_prompt: result.refined_prompt || prompt,
      questions: Array.isArray(result.questions) ? result.questions.slice(0, 3) : [],
    })
  } catch (error) {
    console.error('[Clarify] Error:', error)
    if (isTemporaryGeminiError(error)) {
      return res.status(503).json({
        error: 'AI is busy right now. Please try again in a moment.',
        retryable: true,
      })
    }
    res.status(500).json({ error: 'Failed to understand request', retryable: true })
  }
})

export default router
