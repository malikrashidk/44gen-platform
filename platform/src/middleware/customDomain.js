import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { supabase } from '../lib/supabase.js'

const USERS_DIR = '/var/www/44gen/users'

// In-memory cache: domain → subdomain, refreshed every 60s
// Avoids hitting the DB on every static file request
const domainCache = new Map()
let cacheExpiry = 0

async function lookupDomain(host) {
  const now = Date.now()
  if (now < cacheExpiry && domainCache.has(host)) {
    return domainCache.get(host)
  }

  const { data } = await supabase
    .from('custom_domains')
    .select('subdomain, status')
    .eq('domain', host)
    .eq('status', 'verified')
    .single()

  if (data?.subdomain) {
    domainCache.set(host, data.subdomain)
    cacheExpiry = now + 60_000  // refresh cache every 60s
    return data.subdomain
  }

  // Cache negative results for 10s to avoid DB spam on invalid domains
  domainCache.set(host, null)
  return null
}

// Called by Caddy's on_demand TLS ask URL before issuing a cert
// GET /internal/domain-check?domain=myapp.com
// Returns 200 if domain is verified, 403 if not
export function domainCheckHandler(req, res) {
  const domain = String(req.query.domain || '').trim().toLowerCase()
  if (!domain) return res.status(400).send('No domain')

  lookupDomain(domain).then(subdomain => {
    if (subdomain) {
      res.status(200).send('ok')
    } else {
      res.status(403).send('Domain not verified')
    }
  }).catch(() => res.status(500).send('Lookup failed'))
}

// Middleware: if the request host is a verified custom domain,
// serve the correct app's static files
export function customDomainMiddleware(req, res, next) {
  const host = req.hostname?.toLowerCase()

  // Skip 44gen.com subdomains and localhost
  if (!host || host.endsWith('.44gen.com') || host === '44gen.com' ||
      host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.')) {
    return next()
  }

  lookupDomain(host).then(subdomain => {
    if (!subdomain) return next()  // not a custom domain — fall through to 404

    const appDir = path.join(USERS_DIR, subdomain, 'current')

    if (!fs.existsSync(appDir)) {
      console.warn(`[CustomDomain] ${host} → ${subdomain} but ${appDir} doesn't exist`)
      return res.status(503).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>App not published yet</h2>
        <p>This app hasn't been published. The owner needs to click Publish in 44Gen.</p>
        </body></html>
      `)
    }

    // Serve static files with SPA fallback
    const staticMiddleware = express.static(appDir, {
      index: 'index.html',
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // HTML files must not be cached (SPA routing needs fresh index.html)
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        }
      }
    })

    staticMiddleware(req, res, () => {
      // SPA fallback — serve index.html for any unmatched path
      const indexPath = path.join(appDir, 'index.html')
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath)
      } else {
        res.status(404).send('Not found')
      }
    })
  }).catch(err => {
    console.error('[CustomDomain] Lookup error:', err.message)
    next()
  })
}
