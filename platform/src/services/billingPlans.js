// ── Subscription plans ────────────────────────────────────────────────────────
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
    price: 19.90,
    productEnv: 'POLAR_PRO_PRODUCT_ID'
  },
  business: {
    id: 'business',
    label: 'Business',
    credits: 260,
    price: 49.90,
    productEnv: 'POLAR_BUSINESS_PRODUCT_ID'
  }
}

// ── Credit packs (one-time purchases, Pro and Business users only) ─────────────
// Add POLAR_PACK_50_PRODUCT_ID etc. to .env after creating in Polar as one-time products.
export const CREDIT_PACKS = {
  pack_50: {
    id: 'pack_50',
    label: '50 Credits',
    credits: 50,
    price: 10,
    productEnv: 'POLAR_PACK_50_PRODUCT_ID'
  },
  pack_100: {
    id: 'pack_100',
    label: '100 Credits',
    credits: 100,
    price: 20,
    productEnv: 'POLAR_PACK_100_PRODUCT_ID',
    popular: true
  },
  pack_250: {
    id: 'pack_250',
    label: '250 Credits',
    credits: 250,
    price: 50,
    productEnv: 'POLAR_PACK_250_PRODUCT_ID'
  },
  pack_500: {
    id: 'pack_500',
    label: '500 Credits',
    credits: 500,
    price: 100,
    productEnv: 'POLAR_PACK_500_PRODUCT_ID'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export function getCreditPack(value) {
  const key = String(value || '').trim().toLowerCase()
  const pack = CREDIT_PACKS[key]
  if (!pack) return null
  const productId = process.env[pack.productEnv]
  if (!productId) return null
  return { ...pack, productId }
}

export function planFromPolarProduct(productId) {
  const id = String(productId || '').trim()
  if (!id) return null
  return Object.values(BILLING_PLANS).find(plan =>
    plan.productEnv && process.env[plan.productEnv] === id
  ) || null
}

export function packFromPolarProduct(productId) {
  const id = String(productId || '').trim()
  if (!id) return null
  return Object.values(CREDIT_PACKS).find(pack =>
    pack.productEnv && process.env[pack.productEnv] === id
  ) || null
}

export function getAvailablePacks() {
  return Object.values(CREDIT_PACKS)
    .filter(pack => pack.productEnv && process.env[pack.productEnv])
    .map(pack => ({ ...pack, productId: process.env[pack.productEnv] }))
}
