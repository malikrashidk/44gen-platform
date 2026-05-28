import { Router } from 'express'
import crypto from 'node:crypto'
import { requireAuth } from '../middleware/auth.js'
import {
  deleteGithubConnection,
  getGithubConnection,
  githubRequest,
  saveGithubConnection
} from '../services/githubAuth.js'

const router = Router()

function oauthSecret() {
  return process.env.GITHUB_OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.JWT_SECRET ||
    '44gen-dev-oauth-secret'
}

function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', oauthSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyState(state) {
  const [body, sig] = String(state || '').split('.')
  if (!body || !sig) throw new Error('Invalid OAuth state')
  const expected = crypto.createHmac('sha256', oauthSecret()).update(body).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Invalid OAuth state')
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (!payload.exp || Date.now() > payload.exp) throw new Error('OAuth session expired')
  return payload
}

function callbackHtml({ origin, ok, error = '', login = '' }) {
  const payload = JSON.stringify({ type: '44gen_github_oauth', ok, error, login })
  const target = JSON.stringify(origin || '*')
  const message = ok
    ? 'GitHub connected. You can close this window.'
    : `GitHub connection failed: ${String(error).replace(/[<>&"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[char])}`
  return `<!doctype html>
<html><body>
<script>
  if (window.opener) window.opener.postMessage(${payload}, ${target});
  window.close();
</script>
<p>${message}</p>
</body></html>`
}

router.get('/status', requireAuth, async (req, res) => {
  const connection = await getGithubConnection(req.user.id)
  res.json({
    connected: Boolean(connection),
    login: connection?.github_login || null,
    name: connection?.github_name || null,
    avatar_url: connection?.avatar_url || null,
    updated_at: connection?.updated_at || null
  })
})

router.post('/connect/start', requireAuth, async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'GitHub OAuth is not configured.' })
  }

  const origin = String(req.body?.origin || process.env.ALLOWED_ORIGIN || '').trim()
  const state = signState({
    userId: req.user.id,
    origin,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(12).toString('base64url')
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo read:user',
    state
  })

  res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` })
})

router.get('/connect/callback', async (req, res) => {
  let origin = process.env.ALLOWED_ORIGIN || ''
  try {
    const { code, state } = req.query
    if (!code || !state) throw new Error('Missing OAuth code')
    const payload = verifyState(state)
    origin = payload.origin || origin

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = process.env.GITHUB_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) throw new Error('GitHub OAuth is not configured')

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'GitHub token exchange failed')
    }

    const githubUser = await githubRequest(tokenData.access_token, 'https://api.github.com/user')
    await saveGithubConnection({
      userId: payload.userId,
      token: tokenData.access_token,
      githubUser,
      scope: tokenData.scope
    })

    res.setHeader('Content-Type', 'text/html')
    res.send(callbackHtml({ origin, ok: true, login: githubUser.login }))
  } catch (err) {
    console.error('[GitHub OAuth] Error:', err.message)
    res.status(400).setHeader('Content-Type', 'text/html')
    res.send(callbackHtml({ origin, ok: false, error: err.message }))
  }
})

router.delete('/connection', requireAuth, async (req, res) => {
  await deleteGithubConnection(req.user.id)
  res.json({ disconnected: true })
})

export default router
