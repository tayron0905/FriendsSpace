import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { email, password, username, invite_token } = await req.json()
    if (typeof email !== 'string' || typeof password !== 'string' || typeof username !== 'string' || typeof invite_token !== 'string') throw new Error('Bitte alle Felder ausfüllen.')
    if (password.length < 8) throw new Error('Das Passwort muss mindestens 8 Zeichen haben.')
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw new Error('Benutzername: 3–24 Zeichen, nur Buchstaben, Zahlen und _.')
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(invite_token))
    const tokenHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    const { data: claimed, error: claimError } = await admin.rpc('consume_invitation', { p_token_hash: tokenHash })
    if (claimError || !claimed) throw new Error('Einladung ungültig, abgelaufen oder bereits verwendet.')
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { username, display_name: username },
    })
    if (createError || !created.user) {
      await admin.from('invitations').update({ uses_remaining: 1 }).eq('token_hash', tokenHash)
      throw new Error(createError?.message ?? 'Konto konnte nicht erstellt werden.')
    }
    const { error: membershipError } = await admin.from('memberships').insert({ user_id: created.user.id, role: 'member' })
    if (membershipError) {
      await admin.auth.admin.deleteUser(created.user.id)
      throw membershipError
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Fehler' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
