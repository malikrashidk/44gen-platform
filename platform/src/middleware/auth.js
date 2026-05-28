import { supabase } from '../lib/supabase.js'


export async function requireAuth(req, res, next) {
  const token =
    req.headers.authorization?.split('Bearer ')[1] ||
    req.query.token

  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  req.user = user
  next()
}
