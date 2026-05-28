import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const PEXELS_BASE = 'https://api.pexels.com/v1'

// Check if user is on paid plan
async function isPaidUser(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()
  const plan = (data?.plan || 'free').toLowerCase()
  return plan === 'pro' || plan === 'business'
}

// GET /api/images/search?query=office+team&per_page=12&orientation=landscape
router.get('/search', requireAuth, async (req, res) => {
  const userId = req.user.id

  // Paid-only feature
  const paid = await isPaidUser(userId)
  if (!paid) {
    return res.status(403).json({
      error: 'Stock photos are available on Pro and Business plans.',
      upgrade_required: true
    })
  }

  if (!PEXELS_API_KEY) {
    return res.status(500).json({ error: 'Pexels API not configured.' })
  }

  const { query, per_page = 12, orientation = 'landscape', page = 1 } = req.query
  if (!query?.trim()) return res.status(400).json({ error: 'Query is required' })

  try {
    const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=${per_page}&orientation=${orientation}&page=${page}`
    const response = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`)
    const data = await response.json()

    // Return optimized photo data only
    const photos = (data.photos || []).map(p => ({
      id: p.id,
      width: p.width,
      height: p.height,
      photographer: p.photographer,
      alt: p.alt || query,
      // Different sizes for different use cases
      urls: {
        large: p.src.large,        // 940px wide — hero images
        medium: p.src.medium,      // 350px wide — cards, thumbnails
        small: p.src.small,        // 130px wide — previews only
        original: p.src.original,  // Full res
      },
      // Pexels attribution link (required by their license)
      pexels_url: p.url
    }))

    res.json({ photos, total_results: data.total_results, page: data.page })
  } catch (err) {
    console.error('[Images] Pexels search error:', err.message)
    res.status(500).json({ error: 'Failed to search photos. Try again.' })
  }
})

// POST /api/images/upload — base64 image → Supabase Storage → public URL
// Free users can upload their own images
router.post('/upload', requireAuth, async (req, res) => {
  const userId = req.user.id
  const { base64, mimeType, filename } = req.body

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'base64 and mimeType required' })
  }

  // Size limit: 5MB
  const sizeBytes = (base64.length * 3) / 4
  if (sizeBytes > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image too large. Max 5MB.' })
  }

  try {
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const safeName = filename?.replace(/[^a-zA-Z0-9._-]/g, '_') || `image_${Date.now()}`
    const filePath = `${userId}/${Date.now()}_${safeName}.${ext}`

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64')

    const { error } = await supabase.storage
      .from('user-images')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-images')
      .getPublicUrl(filePath)

    res.json({ url: publicUrl, path: filePath })
  } catch (err) {
    console.error('[Images] Upload error:', err.message)
    res.status(500).json({ error: 'Upload failed. Try again.' })
  }
})

export default router
