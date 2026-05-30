import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import dns from 'node:dns/promises'

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// Validate domain format — no protocol, no path, basic hostname check
function isValidDomain(domain) {
  const clean = String(domain || '').trim().toLowerCase()
  return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(clean) &&
    !clean.endsWith('.44gen.com') // don't allow linking our own subdomains
}

function sanitizeDomain(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

async function getOwnedProject(projectId, userId) {
  if (!isValidUUID(projectId)) return null
  const { data } = await supabase
    .from('projects')
    .select('id, user_id, subdomain')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  return data || null
}

const router = Router()

// GET /api/domains/:projectId — list domains for a project
router.get('/:projectId', requireAuth, async (req, res) => {
  const { projectId } = req.params
  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const { data } = await supabase
    .from('custom_domains')
    .select('id, domain, status, verification_token, verified_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  res.json({ domains: data || [] })
})

// POST /api/domains/:projectId — add a domain
// Body: { domain: 'myapp.com' }
router.post('/:projectId', requireAuth, async (req, res) => {
  const { projectId } = req.params
  const domain = sanitizeDomain(req.body?.domain)

  if (!isValidDomain(domain)) {
    return res.status(400).json({ error: 'Invalid domain format. Example: myapp.com or app.mysite.com' })
  }

  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  // Check this domain isn't already registered on any project
  const { data: existing } = await supabase
    .from('custom_domains')
    .select('id, project_id, user_id')
    .eq('domain', domain)
    .maybeSingle()

  if (existing) {
    if (existing.user_id === req.user.id && existing.project_id === projectId) {
      return res.status(409).json({ error: 'This domain is already added to this project.' })
    }
    return res.status(409).json({ error: 'This domain is already registered on another project.' })
  }

  // Generate a unique verification token for DNS TXT record
  const { randomBytes } = await import('node:crypto')
  const token = `44gen-verify-${randomBytes(12).toString('hex')}`

  const { data, error } = await supabase
    .from('custom_domains')
    .insert({
      project_id: projectId,
      user_id: req.user.id,
      domain,
      subdomain: project.subdomain,
      status: 'pending',
      verification_token: token,
    })
    .select('id, domain, status, verification_token')
    .single()

  if (error) {
    console.error('[Domains] Insert error:', error)
    return res.status(500).json({ error: 'Failed to add domain' })
  }

  res.json({
    domain: data,
    instructions: {
      step1: {
        type: 'TXT',
        name: `_44gen-verify.${domain}`,
        value: token,
        purpose: 'Proves you own this domain'
      },
      step2: {
        type: 'CNAME',
        name: domain.startsWith('www.') ? domain : `www.${domain}`,
        value: `${project.subdomain}.44gen.com`,
        purpose: 'Points your domain to your 44Gen app'
      },
      note: 'DNS changes can take up to 48 hours to propagate. Click Verify once the TXT record is added.'
    }
  })
})

// POST /api/domains/:projectId/:domainId/verify — check DNS TXT record
router.post('/:projectId/:domainId/verify', requireAuth, async (req, res) => {
  const { projectId, domainId } = req.params

  if (!isValidUUID(domainId)) return res.status(400).json({ error: 'Invalid domain ID' })

  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const { data: domainRow } = await supabase
    .from('custom_domains')
    .select('id, domain, verification_token, status')
    .eq('id', domainId)
    .eq('project_id', projectId)
    .single()

  if (!domainRow) return res.status(404).json({ error: 'Domain not found' })
  if (domainRow.status === 'verified') return res.json({ verified: true, already: true })

  const txtRecordName = `_44gen-verify.${domainRow.domain}`

  try {
    const records = await dns.resolveTxt(txtRecordName)
    const flat = records.flat()
    const found = flat.some(r => r === domainRow.verification_token)

    if (!found) {
      return res.json({
        verified: false,
        message: `TXT record not found yet. Looking for: ${domainRow.verification_token} at ${txtRecordName}. DNS propagation can take up to 48 hours.`,
        found_values: flat.length ? flat : []
      })
    }

    // Verified — update status
    await supabase
      .from('custom_domains')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', domainId)

    res.json({
      verified: true,
      message: `Domain ${domainRow.domain} is verified. Add a CNAME record pointing to ${project.subdomain}.44gen.com to complete setup.`
    })
  } catch (dnsErr) {
    res.json({
      verified: false,
      message: `Could not look up TXT record. Make sure ${txtRecordName} exists in your DNS.`,
      error: dnsErr.code || dnsErr.message
    })
  }
})

// DELETE /api/domains/:projectId/:domainId — remove a domain
router.delete('/:projectId/:domainId', requireAuth, async (req, res) => {
  const { projectId, domainId } = req.params

  if (!isValidUUID(domainId)) return res.status(400).json({ error: 'Invalid domain ID' })

  const project = await getOwnedProject(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })

  const { error } = await supabase
    .from('custom_domains')
    .delete()
    .eq('id', domainId)
    .eq('project_id', projectId)

  if (error) return res.status(500).json({ error: 'Failed to delete domain' })
  res.json({ success: true })
})

export default router
