import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getSecretKey(): string {
  const keysRaw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (keysRaw) {
    const keys = JSON.parse(keysRaw) as Record<string, string>
    const key = keys.default ?? Object.values(keys)[0]
    if (key) return key
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  throw new Error('Supabase Secret Key fehlt in der Edge-Function-Umgebung.')
}

function getPublishableKey(): string {
  const keysRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (keysRaw) {
    const keys = JSON.parse(keysRaw) as Record<string, string>
    const key = keys.default ?? Object.values(keys)[0]
    if (key) return key
  }
  const legacy = Deno.env.get('SUPABASE_ANON_KEY')
  if (legacy) return legacy
  throw new Error('Supabase Publishable Key fehlt.')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Methode nicht erlaubt.' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const url = Deno.env.get('SUPABASE_URL')
    if (!url) throw new Error('SUPABASE_URL fehlt.')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Nicht angemeldet.')

    const userClient = createClient(url, getPublishableKey(), {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Nicht angemeldet.')

    const admin = createClient(url, getSecretKey())
    const { data: membership, error: membershipError } = await admin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (membershipError) throw membershipError
    if (membership?.role !== 'admin') throw new Error('Nur Admins dürfen Einladungen erstellen.')

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')

    const { error } = await admin.from('invitations').insert({
      token_hash: tokenHash,
      created_by: user.id,
      uses_remaining: 1,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    })
    if (error) throw error

    const site = (Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? '').replace(/\/$/, '')
    if (!site) throw new Error('SITE_URL ist nicht konfiguriert.')
    return new Response(JSON.stringify({ url: site + '/?invite=' + token }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Fehler' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
