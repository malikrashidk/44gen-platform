const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function requireAuth(req, res, next) {
  // Support Bearer header (REST) and ?token= query param (EventSource)
  const token =
    req.headers.authorization?.split('Bearer ')[1] ||
    req.query.token

  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  req.user = user
  next()
}

module.exports = { requireAuth }
