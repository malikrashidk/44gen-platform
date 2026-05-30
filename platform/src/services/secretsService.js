import crypto from 'node:crypto'
import { supabase } from '../lib/supabase.js'

// Validated key name: alphanumeric + underscore only, must start with letter
const KEY_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/
const MAX_VALUE_BYTES = 4096

function encryptionKey() {
  const k = process.env.SECRET_ENCRYPTION_KEY || process.env.GITHUB_TOKEN_ENCRYPTION_KEY
  if (!k) console.warn('[Secrets] SECRET_ENCRYPTION_KEY is not set. Set a dedicated key in .env.')
  return crypto.createHash('sha256').update(k || '44gen-secrets-dev-key-CHANGE-IN-PROD').digest()
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

function decrypt(payload) {
  const [ivText, tagText, encText] = String(payload || '').split('.')
  if (!ivText || !tagText || !encText) throw new Error('Invalid secret payload')
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encText, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

export function validateKeyName(name) {
  return KEY_NAME_RE.test(String(name || ''))
}

export function validateKeyValue(value) {
  return Buffer.byteLength(String(value || ''), 'utf8') <= MAX_VALUE_BYTES
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function getProjectSecrets(projectId) {
  const { data, error } = await supabase
    .from('project_secrets')
    .select('id, key_name, created_at, updated_at')
    .eq('project_id', projectId)
    .order('key_name')
  if (error) throw error
  // Return key names only — never return encrypted values to the frontend
  return data || []
}

export async function upsertSecret(projectId, userId, keyName, value) {
  if (!validateKeyName(keyName)) throw Object.assign(new Error('Invalid key name. Use only letters, numbers, and underscores. Must start with a letter.'), { status: 400 })
  if (!validateKeyValue(value)) throw Object.assign(new Error('Secret value too large. Maximum 4KB.'), { status: 400 })

  const encrypted = encrypt(String(value))
  const now = new Date().toISOString()

  // Check if exists
  const { data: existing } = await supabase
    .from('project_secrets')
    .select('id')
    .eq('project_id', projectId)
    .eq('key_name', keyName)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('project_secrets')
      .update({ encrypted_value: encrypted, updated_at: now })
      .eq('id', existing.id)
    if (error) throw error
    return { id: existing.id, key_name: keyName, updated: true }
  }

  const { data, error } = await supabase
    .from('project_secrets')
    .insert({ project_id: projectId, user_id: userId, key_name: keyName, encrypted_value: encrypted, created_at: now, updated_at: now })
    .select('id, key_name')
    .single()
  if (error) throw error
  return { ...data, updated: false }
}

export async function deleteSecret(projectId, keyName) {
  const { error } = await supabase
    .from('project_secrets')
    .delete()
    .eq('project_id', projectId)
    .eq('key_name', keyName)
  if (error) throw error
}

// ── Build-time: decrypt all secrets for a project ────────────────────────────
// Returns { KEY_NAME: 'plaintext_value' }
// Called only from worker.js during build — never exposed to frontend.
export async function getDecryptedSecrets(projectId) {
  const { data, error } = await supabase
    .from('project_secrets')
    .select('key_name, encrypted_value')
    .eq('project_id', projectId)
  if (error) {
    console.warn('[Secrets] Failed to fetch secrets for build:', error.message)
    return {}
  }
  const result = {}
  for (const row of (data || [])) {
    try {
      result[row.key_name] = decrypt(row.encrypted_value)
    } catch (err) {
      console.warn(`[Secrets] Failed to decrypt secret ${row.key_name}:`, err.message)
    }
  }
  return result
}
