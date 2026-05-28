import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

function tokenSecret() {
  return process.env.GITHUB_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.JWT_SECRET ||
    '44gen-dev-token-secret'
}

function key() {
  return crypto.createHash('sha256').update(tokenSecret()).digest()
}

export function encryptToken(token) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptToken(payload) {
  const [ivText, tagText, encryptedText] = String(payload || '').split('.')
  if (!ivText || !tagText || !encryptedText) throw new Error('Invalid GitHub token payload')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

export async function getGithubConnection(userId) {
  const { data } = await supabase
    .from('github_connections')
    .select('user_id,github_login,github_name,avatar_url,access_token_encrypted,scope,updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  return data || null
}

export async function getGithubAccessToken(userId) {
  const connection = await getGithubConnection(userId)
  if (!connection?.access_token_encrypted) return null
  return decryptToken(connection.access_token_encrypted)
}

export async function saveGithubConnection({ userId, token, githubUser, scope }) {
  const row = {
    user_id: userId,
    github_login: githubUser.login,
    github_name: githubUser.name || null,
    avatar_url: githubUser.avatar_url || null,
    access_token_encrypted: encryptToken(token),
    scope: scope || null,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('github_connections')
    .upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  return row
}

export async function deleteGithubConnection(userId) {
  await supabase.from('github_connections').delete().eq('user_id', userId)
}

export async function githubRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    const err = new Error(data?.message || `GitHub request failed (${response.status})`)
    err.status = response.status
    err.data = data
    throw err
  }
  return data
}
