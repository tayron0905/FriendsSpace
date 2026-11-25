import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Nicht angemeldet.')
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Nicht angemeldet.')
    const admin = createClient(url, serviceKey)
    const { data: membership } = await admin.from('memberships').select('role').eq('user_id', user.id).maybeSingle()
    if (membership?.role !== 'admin') throw new Error('Nur Admins dürfen Einladungen erstellen.')
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    const { error } = await admin.from('invitations').insert({ token_hash: tokenHash, created_by: user.id, uses_remaining: 1, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() })
    if (error) throw error
    const site = Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? ''
    return new Response(JSON.stringify({ url: site + '/?invite=' + token }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Fehler' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
