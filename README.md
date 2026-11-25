# FriendsSpace

FriendsSpace ist ein öffentlich sichtbares Foto- und Videoalbum mit sozialem Feed und geschlossenem Mitgliederkreis. Neue Konten können ausschließlich über einen gültigen Einladungslink erstellt werden.

## Lokal starten
```bash
npm install
cp .env.example .env.local
# Supabase URL und anon key in .env.local eintragen
npm run dev
```

## Supabase einrichten
1. Supabase-Projekt erstellen.
2. Den vollständigen Inhalt von `supabase/schema.sql` im SQL Editor ausführen.
3. Project URL und anon/public key aus Project Settings > API in `.env.local` eintragen.
4. Supabase CLI installieren und im Projekt anmelden.
5. Edge Functions deployen:
   ```bash
   supabase functions deploy create-invite
   supabase functions deploy redeem-invite
   ```
6. Für `create-invite` das Function Secret `SITE_URL=https://DEINE-DOMAIN` setzen.
7. In Supabase Authentication die öffentliche Registrierung/Signups deaktivieren. Neue Konten werden ausschließlich über die serverseitige Redeem-Function erstellt.
8. Den ersten Admin nach dem Erstellen des ersten Kontos einmalig im SQL Editor festlegen:
   ```sql
   insert into public.memberships(user_id, role)
   select id, 'admin' from auth.users where email = 'DEINE-ADMIN-EMAIL'
   on conflict (user_id) do update set role = 'admin';
   ```
   Nur deine eigene, verifizierte Admin-E-Mail verwenden.

## Enthalten
- Öffentlicher Feed und Fotoalbum
- Anmeldung und Einladungscode-Registrierung
- Beiträge mit Bild- und Video-Upload (max. 50 MB)
- Likes, Kommentare und In-App-Benachrichtigungen
- Mitgliederübersicht und Profilbearbeitung
- Highlights
- Einmalige, sieben Tage gültige Admin-Einladungslinks
- Supabase Row Level Security und Storage Policies
- GitHub Actions Build-Workflow

## Sicherheitsregeln
- Öffentliche Beiträge, Profile, Kommentare, Likes und Medien sind lesbar.
- Schreiben ist Mitgliedern vorbehalten; Profile können nur selbst bearbeitet werden.
- Einladungen werden serverseitig gehasht, laufen nach sieben Tagen ab und sind einmalig verwendbar.
- Nur Admins können Einladungen erstellen. Einladungscodes vergeben keine Adminrechte.
- Der Service-Role-Key wird ausschließlich in Edge Functions verwendet und gehört niemals in das Frontend.
- Es gibt keine Demo-Benutzer oder Beispieldatensätze im Repository.
