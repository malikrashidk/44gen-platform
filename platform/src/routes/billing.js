import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getPaidPlan, getCreditPack, getAvailablePacks } from '../services/billingPlans.js'
import { createPolarCheckout, createPolarCustomerPortal, handlePolarPayload, polarServer, verifyPolarWebhook } from '../services/polar.js'
import { supabase } from '../lib/supabase.js'

export const billingRouter = Router()

// GET /api/billing/config — what's available
billingRouter.get('/config', (_req, res) => {
  res.json({
    provider: 'polar',
    server: polarServer(),
    plans: {
      pro: Boolean(process.env.POLAR_PRO_PRODUCT_ID),
      business: Boolean(process.env.POLAR_BUSINESS_PRODUCT_ID)
    },
    packs: getAvailablePacks().map(p => ({
      id: p.id,
      label: p.label,
      credits: p.credits,
      price: p.price,
      description: p.description,
      popular: p.popular || false
    }))
  })
})

// POST /api/billing/checkout — subscription plan checkout
billingRouter.post('/checkout', requireAuth, async (req, res) => {
  try {
    const plan = getPaidPlan(req.body?.plan)
    if (!plan) {
      return res.status(400).json({ error: 'This plan is not configured for checkout yet.' })
    }

    const customerIpAddress = req.headers['cf-connecting-ip'] ||
      String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.ip

    const checkout = await createPolarCheckout({ user: req.user, plan, customerIpAddress })
    res.json({ url: checkout.url, checkout_id: checkout.id, server: polarServer() })
  } catch (err) {
    console.error('[Billing] Checkout failed:', err)
    res.status(err.status || 500).json({ error: err.message || 'Checkout failed' })
  }
})

// POST /api/billing/pack-checkout — credit pack checkout (Pro/Business only)
billingRouter.post('/pack-checkout', requireAuth, async (req, res) => {
  try {
    // Only allow paid users to buy packs
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', req.user.id)
      .single()

    if (!profile || profile.plan === 'free') {
      return res.status(403).json({
        error: 'Credit packs are available on Pro and Business plans. Upgrade your plan first.'
      })
    }

    const pack = getCreditPack(req.body?.pack)
    if (!pack) {
      return res.status(400).json({ error: 'This credit pack is not available yet.' })
    }

    const customerIpAddress = req.headers['cf-connecting-ip'] ||
      String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.ip

    const checkout = await createPolarCheckout({ user: req.user, pack, customerIpAddress })
    res.json({ url: checkout.url, checkout_id: checkout.id, server: polarServer() })
  } catch (err) {
    console.error('[Billing] Pack checkout failed:', err)
    res.status(err.status || 500).json({ error: err.message || 'Checkout failed' })
  }
})

// POST /api/billing/portal — customer billing portal
billingRouter.post('/portal', requireAuth, async (req, res) => {
  try {
    const portal = await createPolarCustomerPortal({ user: req.user })
    res.json({ url: portal.customer_portal_url, customer_id: portal.customer_id, server: polarServer() })
  } catch (err) {
    console.error('[Billing] Portal failed:', err)
    res.status(err.status || 500).json({ error: err.message || 'Could not open billing portal' })
  }
})

// POST /api/billing/webhook — Polar webhook receiver
export async function polarWebhookHandler(req, res) {
  try {
    verifyPolarWebhook({
      rawBody: req.rawBody,
      headers: req.headers,
      secret: process.env.POLAR_WEBHOOK_SECRET
    })
    await handlePolarPayload(req.body)
    res.json({ ok: true })
  } catch (err) {
    console.error('[Billing] Webhook failed:', err.message)
    res.status(err.status || 400).json({ error: err.message || 'Webhook failed' })
  }
}
