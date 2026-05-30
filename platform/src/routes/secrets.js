import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import {
  getProjectSecrets,
  upsertSecret,
  deleteSecret,
  validateKeyName,
} from '../services/secretsService.js'

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

async function getOwnedProject(projectId, userId) {
  if (!isValidUUID(projectId)) return null
  const { data } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  return data || null
}

const router = Router()

// GET /api/secrets/:projectId — list key names (no values ever returned)
router.get('/:projectId', requireAuth, async (req, res) => {
  const { projectId } = req.params
  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const secrets = await getProjectSecrets(projectId)
    res.json({ secrets })
  } catch (err) {
    console.error('[Secrets] GET error:', err)
    res.status(500).json({ error: 'Failed to load secrets' })
  }
})

// PUT /api/secrets/:projectId — add or update a secret
// Body: { key_name: 'STRIPE_KEY', value: 'sk_live_...' }
router.put('/:projectId', requireAuth, async (req, res) => {
  const { projectId } = req.params
  const { key_name, value } = req.body

  if (!key_name || !value) return res.status(400).json({ error: 'key_name and value are required' })
  if (!validateKeyName(key_name)) return res.status(400).json({ error: 'Invalid key name. Use letters, numbers, and underscores. Must start with a letter.' })

  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const result = await upsertSecret(projectId, req.user.id, key_name, value)
    res.json({ success: true, ...result })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error('[Secrets] PUT error:', err)
    res.status(500).json({ error: 'Failed to save secret' })
  }
})

// DELETE /api/secrets/:projectId/:keyName — remove a secret
router.delete('/:projectId/:keyName', requireAuth, async (req, res) => {
  const { projectId, keyName } = req.params

  if (!validateKeyName(keyName)) return res.status(400).json({ error: 'Invalid key name' })

  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    await deleteSecret(projectId, keyName)
    res.json({ success: true })
  } catch (err) {
    console.error('[Secrets] DELETE error:', err)
    res.status(500).json({ error: 'Failed to delete secret' })
  }
})

export default router
