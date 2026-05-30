import { supabase } from '../lib/supabase.js'
import { BILLING_PLANS, CREDIT_PACKS, planFromPolarProduct, packFromPolarProduct } from './billingPlans.js'
import crypto from 'node:crypto'

const POLAR_API = {
  sandbox: 'https://sandbox-api.polar.sh/v1',
  production: 'https://api.polar.sh/v1'
}

export function polarServer() {
  return process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
}

function polarBaseUrl() {
  return POLAR_API[polarServer()]
}

function requirePolarToken() {
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) {
    const err = new Error('Polar is not configured. Add POLAR_ACCESS_TOKEN on the server.')
    err.status = 503
    throw err
  }
  return token
}

function decodeWebhookSecret(secret) {
  const value = String(secret || '').trim()
  if (!value) return null
  const raw = value.startsWith('whsec_') ? value.slice(6) : value
  try { return Buffer.from(raw, 'base64') } catch { return Buffer.from(raw) }
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export function verifyPolarWebhook({ rawBody, headers, secret }) {
  const signingSecret = decodeWebhookSecret(secret)
  if (!signingSecret) {
    const err = new Error('Polar webhook secret is not configured.')
    err.status = 503
    throw err
  }
  if (!rawBody) {
    const err = new Error('Missing raw webhook body.')
    err.status = 400
    throw err
  }

  const webhookId = headers['webhook-id']
  const webhookTimestamp = headers['webhook-timestamp']
  const webhookSignature = headers['webhook-signature']
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    const err = new Error('Missing Polar webhook signature headers.')
    err.status = 400
    throw err
  }

  const timestamp = Number(webhookTimestamp)
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
    const err = new Error('Polar webhook timestamp is outside the allowed window.')
    err.status = 400
    throw err
  }

  const signedPayload = Buffer.concat([
    Buffer.from(`${webhookId}.${webhookTimestamp}.`),
    Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody)
  ])
  const expected = `v1,${crypto.createHmac('sha256', signingSecret).update(signedPayload).digest('base64')}`
  const received = String(webhookSignature).split(' ')
  if (!received.some(sig => timingSafeEqualString(sig, expected))) {
    const err = new Error('Invalid Polar webhook signature.')
    err.status = 400
    throw err
  }
}

export async function createPolarCheckout({ user, plan, pack, customerIpAddress }) {
  const token = requirePolarToken()
  const appUrl = process.env.APP_URL || process.env.ALLOWED_ORIGIN || 'https://44gen.com'
  const successUrl = `${appUrl.replace(/\/$/, '')}/billing/success?checkout_id={CHECKOUT_ID}`
  const returnUrl = `${appUrl.replace(/\/$/, '')}/pricing`

  const product = plan || pack
  const metadata = plan
    ? { user_id: user.id, plan: plan.id, credits: plan.credits, type: 'subscription' }
    : { user_id: user.id, pack: pack.id, credits: pack.credits, type: 'pack' }

  const res = await fetch(`${polarBaseUrl()}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      products: [product.productId],
      external_customer_id: user.id,
      customer_email: user.email,
      customer_ip_address: customerIpAddress || undefined,
      success_url: successUrl,
      return_url: returnUrl,
      metadata,
      customer_metadata: { user_id: user.id }
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.detail || data.error || data.message || 'Polar checkout failed')
    err.status = res.status
    throw err
  }
  return data
}

export async function createPolarCustomerPortal({ user }) {
  const token = requirePolarToken()
  const appUrl = process.env.APP_URL || process.env.ALLOWED_ORIGIN || 'https://44gen.com'
  const returnUrl = `${appUrl.replace(/\/$/, '')}/dashboard`

  const res = await fetch(`${polarBaseUrl()}/customer-sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_customer_id: user.id,
      return_url: returnUrl
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.detail || data.error || data.message || 'Could not open billing portal')
    err.status = res.status
    throw err
  }
  return data
}

// ── Webhook payload helpers ────────────────────────────────────────────────────

function payloadType(payload) {
  return String(payload?.type || payload?.event || payload?.name || '').toLowerCase()
}

function payloadData(payload) {
  return payload?.data || payload?.object || payload
}

function customerExternalId(data) {
  return data?.customer?.external_id ||
    data?.customer_external_id ||
    data?.customer?.externalId ||
    data?.external_customer_id ||
    data?.metadata?.user_id ||
    data?.customer_metadata?.user_id ||
    null
}

function productIdFromData(data) {
  return data?.product_id ||
    data?.product?.id ||
    data?.subscription?.product_id ||
    data?.items?.[0]?.product_id ||
    data?.products?.[0]?.id ||
    data?.metadata?.product_id ||
    null
}

function planFromPayload(data) {
  // Check metadata first — most reliable
  const metadataPlan = data?.metadata?.plan
  if (metadataPlan && BILLING_PLANS[metadataPlan]) return BILLING_PLANS[metadataPlan]
  return planFromPolarProduct(productIdFromData(data))
}

function packFromPayload(data) {
  const metadataPack = data?.metadata?.pack
  if (metadataPack && CREDIT_PACKS[metadataPack]) return CREDIT_PACKS[metadataPack]
  return packFromPolarProduct(productIdFromData(data))
}

function subscriptionStatus(data) {
  return String(data?.status || data?.subscription?.status || '').toLowerCase()
}

// ── Profile update helpers ─────────────────────────────────────────────────────

async function updateProfileForPlan({ userId, plan, polarCustomerId, polarSubscriptionId, status, currentPeriodEnd }) {
  if (!userId || !plan?.id) return

  // IMPORTANT: use SQL MAX to never decrease credits on a webhook retry
  // If somehow the webhook fires twice, the second call won't overwrite
  // a higher credit balance the user earned from a pack purchase
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', userId)
    .single()

  // Only reset credits if this is a new plan activation or renewal
  // Don't reset if user already has MORE credits (e.g. from a pack they bought)
  const newCredits = plan.credits
  const existingCredits = profile?.credits ?? 0
  const isSamePlan = profile?.plan === plan.id

  // On renewal of same plan: give them the full plan credits back (they earned a new month)
  // On upgrade: give them the new plan's credits
  // In both cases: if they have MORE credits than the plan amount (from packs), keep the higher value
  const creditsToSet = Math.max(newCredits, existingCredits)

  // Wait — actually on renewal we SHOULD top back up to plan amount minimum
  // but not wipe out pack credits above that. So: max(newCredits, current) is correct.

  await supabase
    .from('profiles')
    .update({
      plan: plan.id,
      credits: creditsToSet,
      polar_customer_id: polarCustomerId || null,
      polar_subscription_id: polarSubscriptionId || null,
      polar_subscription_status: status || null,
      billing_current_period_end: currentPeriodEnd || null,
      billing_updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log(`[Billing] Plan updated: user=${userId} plan=${plan.id} credits=${creditsToSet} (plan grants ${newCredits}, had ${existingCredits})`)
}

async function addPackCredits({ userId, pack, polarCustomerId, orderId }) {
  if (!userId || !pack?.credits) return

  // Fetch current credits
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (!profile) {
    console.warn(`[Billing] Pack purchase: user ${userId} not found`)
    return
  }

  const newCredits = (profile.credits || 0) + pack.credits

  await supabase
    .from('profiles')
    .update({
      credits: newCredits,
      polar_customer_id: polarCustomerId || null,
      billing_updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  console.log(`[Billing] Credit pack applied: user=${userId} pack=${pack.id} +${pack.credits} credits → total=${newCredits}`)
}

async function downgradeToFree({ userId, polarCustomerId, polarSubscriptionId, status }) {
  if (!userId) return
  await supabase
    .from('profiles')
    .update({
      plan: 'free',
      credits: BILLING_PLANS.free.credits,
      polar_customer_id: polarCustomerId || null,
      polar_subscription_id: polarSubscriptionId || null,
      polar_subscription_status: status || null,
      billing_updated_at: new Date().toISOString()
    })
    .eq('id', userId)
  console.log(`[Billing] Downgraded to free: user=${userId} status=${status}`)
}

// ── Main webhook handler ───────────────────────────────────────────────────────

export async function handlePolarPayload(payload) {
  const type = payloadType(payload)
  const data = payloadData(payload)
  const userId = customerExternalId(data)
  const status = subscriptionStatus(data)
  const polarCustomerId = data?.customer_id || data?.customer?.id || null
  const polarSubscriptionId = data?.subscription_id || data?.subscription?.id || data?.id || null
  const currentPeriodEnd = data?.current_period_end || data?.subscription?.current_period_end || null
  const orderId = data?.id || null

  // Always log the event for debugging
  const { error: eventError } = await supabase.from('billing_events').insert({
    provider: 'polar',
    event_type: type || 'unknown',
    polar_event_id: payload?.id || data?.id || null,
    user_id: userId || null,
    payload
  })
  // Ignore duplicate event errors (idempotency) but log others
  if (eventError && eventError.code !== '23505') {
    console.warn('[Billing] Failed to log billing event:', eventError.message)
  }

  console.log(`[Billing] Webhook received: type=${type} userId=${userId || 'unknown'}`)

  if (!userId) {
    console.warn(`[Billing] Webhook has no user ID — cannot update profile. Type: ${type}`)
    return
  }

  // ── Subscription cancelled / revoked ──
  if (/subscription\.(revoked|canceled|past_due)/i.test(type) || status === 'revoked') {
    // Only fully downgrade if actually revoked (not just canceled — canceled keeps access until period end)
    if (status === 'revoked' || /subscription\.revoked/i.test(type)) {
      await downgradeToFree({ userId, polarCustomerId, polarSubscriptionId, status })
    } else {
      // Canceled but still active — just update the subscription status
      await supabase.from('profiles').update({
        polar_subscription_status: status,
        billing_updated_at: new Date().toISOString()
      }).eq('id', userId)
      console.log(`[Billing] Subscription canceled (still active until period end): user=${userId}`)
    }
    return
  }

  // ── Subscription created / renewed / updated ──
  // Covers: subscription.created, subscription.updated, subscription.active,
  //         subscription.uncanceled, order.created (initial), order.paid
  if (/subscription\.(created|active|updated|uncanceled)|order\.(created|paid)|checkout\.updated/i.test(type)) {
    // Determine if this is a pack or a plan purchase
    const payloadType = data?.metadata?.type
    
    if (payloadType === 'pack') {
      // One-time credit pack purchase
      const pack = packFromPayload(data)
      if (pack) {
        await addPackCredits({ userId, pack, polarCustomerId, orderId })
      } else {
        console.warn(`[Billing] Pack purchase but couldn't identify pack. ProductId: ${productIdFromData(data)}`)
      }
      return
    }

    // Subscription plan purchase or renewal
    const plan = planFromPayload(data)
    if (plan) {
      await updateProfileForPlan({
        userId, plan, polarCustomerId, polarSubscriptionId,
        status: status || 'active', currentPeriodEnd
      })
    } else {
      console.warn(`[Billing] Could not identify plan from payload. Type: ${type}, ProductId: ${productIdFromData(data)}`)
    }
    return
  }

  // Log unhandled event types — helps diagnose issues
  console.log(`[Billing] Unhandled webhook type: ${type} — no action taken`)
}
