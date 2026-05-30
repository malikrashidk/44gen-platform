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

// ── Credit packs (one-time purchases, available to Pro and Business users) ────
// Pack credits add on top of existing credits and never reset monthly.
// Add POLAR_PACK_50_PRODUCT_ID, POLAR_PACK_150_PRODUCT_ID, POLAR_PACK_300_PRODUCT_ID
// to your .env after creating them as one-time products in Polar.
export const CREDIT_PACKS = {
  pack_50: {
    id: 'pack_50',
    label: '50 Credits',
    credits: 50,
    price: 9.90,
    productEnv: 'POLAR_PACK_50_PRODUCT_ID',
    description: 'Top up 50 credits — great for a few extra builds'
  },
  pack_150: {
    id: 'pack_150',
    label: '150 Credits',
    credits: 150,
    price: 24.90,
    productEnv: 'POLAR_PACK_150_PRODUCT_ID',
    description: 'Top up 150 credits — best value for active builders',
    popular: true
  },
  pack_300: {
    id: 'pack_300',
    label: '300 Credits',
    credits: 300,
    price: 44.90,
    productEnv: 'POLAR_PACK_300_PRODUCT_ID',
    description: 'Top up 300 credits — for heavy usage or team projects'
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

// Returns all packs that have a product ID configured
export function getAvailablePacks() {
  return Object.values(CREDIT_PACKS).filter(pack =>
    pack.productEnv && process.env[pack.productEnv]
  ).map(pack => ({
    ...pack,
    productId: process.env[pack.productEnv],
    available: true
  }))
}
