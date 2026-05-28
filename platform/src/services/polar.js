import { supabase } from '../lib/supabase.js'
import { BILLING_PLANS, planFromPolarProduct } from './billingPlans.js'

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

export async function createPolarCheckout({ user, plan, customerIpAddress }) {
  const token = requirePolarToken()
  const appUrl = process.env.APP_URL || process.env.ALLOWED_ORIGIN || 'https://44gen.com'
  const successUrl = `${appUrl.replace(/\/$/, '')}/billing/success?checkout_id={CHECKOUT_ID}`
  const returnUrl = `${appUrl.replace(/\/$/, '')}/pricing`

  const res = await fetch(`${polarBaseUrl()}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      products: [plan.productId],
      external_customer_id: user.id,
      customer_email: user.email,
      customer_ip_address: customerIpAddress || undefined,
      success_url: successUrl,
      return_url: returnUrl,
      metadata: {
        user_id: user.id,
        plan: plan.id,
        credits: plan.credits
      },
      customer_metadata: {
        user_id: user.id
      }
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

function payloadType(payload) {
  return payload?.type || payload?.event || payload?.name || ''
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
  const metadataPlan = data?.metadata?.plan
  if (metadataPlan && BILLING_PLANS[metadataPlan]) return BILLING_PLANS[metadataPlan]
  return planFromPolarProduct(productIdFromData(data))
}

function subscriptionStatus(data) {
  return String(data?.status || data?.subscription?.status || '').toLowerCase()
}

async function updateProfileForPlan({ userId, plan, polarCustomerId, polarSubscriptionId, status, currentPeriodEnd }) {
  if (!userId || !plan?.id) return

  await supabase
    .from('profiles')
    .update({
      plan: plan.id,
      credits: plan.credits,
      polar_customer_id: polarCustomerId || null,
      polar_subscription_id: polarSubscriptionId || null,
      polar_subscription_status: status || null,
      billing_current_period_end: currentPeriodEnd || null,
      billing_updated_at: new Date().toISOString()
    })
    .eq('id', userId)
}

async function downgradeToFree({ userId, polarCustomerId, polarSubscriptionId, status }) {
  if (!userId) return
  await updateProfileForPlan({
    userId,
    plan: BILLING_PLANS.free,
    polarCustomerId,
    polarSubscriptionId,
    status,
    currentPeriodEnd: null
  })
}

export async function handlePolarPayload(payload) {
  const type = payloadType(payload)
  const data = payloadData(payload)
  const userId = customerExternalId(data)
  const plan = planFromPayload(data)
  const status = subscriptionStatus(data)
  const polarCustomerId = data?.customer_id || data?.customer?.id || null
  const polarSubscriptionId = data?.subscription_id || data?.subscription?.id || data?.id || null
  const currentPeriodEnd = data?.current_period_end || data?.subscription?.current_period_end || null

  const { error: eventError } = await supabase.from('billing_events').insert({
    provider: 'polar',
    event_type: type || 'unknown',
    polar_event_id: payload?.id || data?.id || null,
    user_id: userId || null,
    payload
  })
  if (eventError && eventError.code !== '23505') throw eventError

  if (!userId) return

  if (/subscription\.(revoked|past_due)/i.test(type) || status === 'revoked') {
    await downgradeToFree({ userId, polarCustomerId, polarSubscriptionId, status })
    return
  }

  if (/subscription\.(created|active|updated|uncanceled)|customer\.state_changed|order\.paid/i.test(type) && plan) {
    await updateProfileForPlan({
      userId,
      plan,
      polarCustomerId,
      polarSubscriptionId,
      status: status || 'active',
      currentPeriodEnd
    })
  }
}
