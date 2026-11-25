# FriendsSpace – Supabase Edge Functions

Projekt: `knpmfhxqahwwdwefrwtk`

## Enthaltene Funktionen

- `create-invite`: Nur angemeldete Admins dürfen einen Einmal-Link erstellen. Links laufen nach 7 Tagen ab.
- `redeem-invite`: Prüft und verbraucht einen Einmal-Link und legt danach ein bestätigtes Mitgliedskonto an.

Die Funktionen verwenden die von Supabase bereitgestellten `SUPABASE_SECRET_KEYS` (bevorzugt) bzw. den Legacy-`SUPABASE_SERVICE_ROLE_KEY`. Niemals einen Secret-/Service-Role-Key in Vite, den Browser oder Git committen.

## Einmalige GitHub-Einrichtung für automatisches Deployment

1. Supabase Access Token unter https://supabase.com/dashboard/account/tokens erzeugen.
2. Im GitHub-Repository zu Settings → Secrets and variables → Actions → New repository secret gehen.
3. Den Namen `SUPABASE_ACCESS_TOKEN` setzen und den Token als Wert speichern. Den Token nicht in Issues, Chat oder Dateien einfügen.
4. Unter Actions den Workflow **Deploy Supabase Edge Functions** öffnen und **Run workflow** ausführen. Danach werden beide Funktionen bereitgestellt. Änderungen unter `supabase/functions/**` werden künftig automatisch bei Push auf `main` deployed.

## Erste Admin-Person anlegen

Da Einladungen nur von Admins erstellt werden dürfen, muss der erste Admin einmalig initialisiert werden:

1. In Supabase → Authentication → Users einen Benutzer anlegen (E-Mail und temporäres Passwort). Der SQL-Trigger legt automatisch das Profil an.
2. Die UUID dieses Benutzers kopieren.
3. Im SQL Editor ausführen (UUID ersetzen):

```sql
insert into public.memberships (user_id, role)
values ('UUID-DES-ERSTEN-ADMINS', 'admin')
on conflict (user_id) do update set role = 'admin';
```

Danach meldet sich der Admin in FriendsSpace an und erstellt im Adminbereich Einladungen.

## SITE_URL

Wenn die Website unter einer festen Domain läuft, unter Supabase → Edge Functions → Secrets den Wert `SITE_URL` auf die öffentliche Website-URL setzen, z. B. `https://friendsspace.example`. Ohne diese Einstellung verwendet die Funktion den Request-Origin. Für lokale Entwicklung kann die lokale Origin-Adresse genutzt werden.

## Manuelles Deployment alternativ

Mit installierter Supabase CLI:

```bash
supabase login
supabase link --project-ref knpmfhxqahwwdwefrwtk
supabase functions deploy --project-ref knpmfhxqahwwdwefrwtk
```

Siehe auch die [offizielle Supabase-Dokumentation](https://supabase.com/docs/guides/functions/deploy).
