import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getPaidPlan } from '../services/billingPlans.js'
import { createPolarCheckout, createPolarCustomerPortal, handlePolarPayload, polarServer, verifyPolarWebhook } from '../services/polar.js'

export const billingRouter = Router()

billingRouter.get('/config', (_req, res) => {
  res.json({
    provider: 'polar',
    server: polarServer(),
    plans: {
      pro: Boolean(process.env.POLAR_PRO_PRODUCT_ID),
      business: Boolean(process.env.POLAR_BUSINESS_PRODUCT_ID)
    }
  })
})

billingRouter.post('/checkout', requireAuth, async (req, res) => {
  try {
    const plan = getPaidPlan(req.body?.plan)
    if (!plan) {
      return res.status(400).json({
        error: 'This plan is not configured for checkout yet.'
      })
    }

    const customerIpAddress = req.headers['cf-connecting-ip'] ||
      String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.ip

    const checkout = await createPolarCheckout({
      user: req.user,
      plan,
      customerIpAddress
    })

    res.json({
      url: checkout.url,
      checkout_id: checkout.id,
      server: polarServer()
    })
  } catch (err) {
    console.error('[Billing] Checkout failed:', err)
    res.status(err.status || 500).json({ error: err.message || 'Checkout failed' })
  }
})

billingRouter.post('/portal', requireAuth, async (req, res) => {
  try {
    const portal = await createPolarCustomerPortal({ user: req.user })
    res.json({
      url: portal.customer_portal_url,
      customer_id: portal.customer_id,
      server: polarServer()
    })
  } catch (err) {
    console.error('[Billing] Portal failed:', err)
    res.status(err.status || 500).json({ error: err.message || 'Could not open billing portal' })
  }
})

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
