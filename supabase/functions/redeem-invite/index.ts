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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Methode nicht erlaubt.' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const { email, password, username, invite_token } = body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string' || typeof username !== 'string' || typeof invite_token !== 'string') {
      throw new Error('Bitte alle Felder ausfüllen.')
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.')
    if (password.length < 8 || password.length > 128) throw new Error('Das Passwort muss zwischen 8 und 128 Zeichen lang sein.')
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error('Benutzername: 3–24 Zeichen, nur Buchstaben, Zahlen und _.')
    if (!/^[a-f0-9]{64}$/i.test(invite_token)) throw new Error('Einladung ungültig oder fehlerhaft.')

    const url = Deno.env.get('SUPABASE_URL')
    if (!url) throw new Error('SUPABASE_URL fehlt.')
    const admin = createClient(url, getSecretKey())

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(invite_token))
    const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    const { data: claimed, error: claimError } = await admin.rpc('consume_invitation', { p_token_hash: tokenHash })
    if (claimError || !claimed) throw new Error('Einladung ungültig, abgelaufen oder bereits verwendet.')

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: username },
    })
    if (createError || !created.user) {
      await admin.from('invitations').update({ uses_remaining: 1 }).eq('token_hash', tokenHash)
      throw new Error(createError?.message ?? 'Konto konnte nicht erstellt werden.')
    }

    const { error: membershipError } = await admin.from('memberships').insert({
      user_id: created.user.id,
      role: 'member',
    })
    if (membershipError) {
      await admin.auth.admin.deleteUser(created.user.id)
      await admin.from('invitations').update({ uses_remaining: 1 }).eq('token_hash', tokenHash)
      throw membershipError
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Fehler' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
