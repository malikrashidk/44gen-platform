export const BILLING_PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    credits: 10,
    productEnv: null
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    credits: 100,
    productEnv: 'POLAR_PRO_PRODUCT_ID'
  },
  business: {
    id: 'business',
    label: 'Business',
    credits: 260,
    productEnv: 'POLAR_BUSINESS_PRODUCT_ID'
  }
}

export function normalizeBillingPlan(value) {
  const key = String(value || '').trim().toLowerCase()
  return BILLING_PLANS[key] ? key : ''
}

export function getPaidPlan(value) {
  const key = normalizeBillingPlan(value)
  if (!key || key === 'free') return null
  const productId = process.env[BILLING_PLANS[key].productEnv]
  if (!productId) return null
  return { ...BILLING_PLANS[key], productId }
}

export function planFromPolarProduct(productId) {
  const id = String(productId || '').trim()
  if (!id) return null
  return Object.values(BILLING_PLANS).find(plan =>
    plan.productEnv && process.env[plan.productEnv] === id
  ) || null
}
