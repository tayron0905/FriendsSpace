# FriendsSpace

**Ein gemeinsamer Ort für Fotos, Videos und Erinnerungen – für deinen Freundeskreis.**

FriendsSpace verbindet ein öffentlich sichtbares Fotoalbum mit einem geschlossenen Mitgliederbereich. Neue Mitglieder können später ausschließlich über gültige Einladungslinks beitreten.

## Tech-Stack
- React 18 + TypeScript + Vite
- Tailwind CSS (Basis eingerichtet) und responsives eigenes Styling
- Lucide Icons
- Supabase für Auth, Datenbank und Storage (später verbinden)

## Lokal starten
```bash
npm install
npm run dev
```

Produktionsbuild und Typprüfung:
```bash
npm run typecheck
npm run build
```

## Enthalten
- Responsive Startseite mit Feed und Fotogalerie
- Story-Leiste, Freundesübersicht und Suche
- Interaktive Demo-Likes und Merkliste
- Dialoge zum Vorbereiten eines Beitrags und Einladen von Freunden
- Supabase-Schema-Grundlage unter `supabase/schema.sql`
- Umgebungsvariablen-Vorlage unter `.env.example`

**Hinweis:** Das Frontend nutzt derzeit Beispieldaten. Anmeldung, echte Beiträge, Uploads, Kommentare, Benachrichtigungen und Einladungen benötigen die spätere Supabase-Anbindung.

## Supabase später verbinden
1. Neues Supabase-Projekt erstellen.
2. `supabase/schema.sql` im SQL Editor ausführen und die Policies vor Produktivbetrieb sorgfältig prüfen.
3. `.env.example` nach `.env.local` kopieren und URL sowie anon key eintragen.
4. Supabase Client, Auth und Storage integrieren.
5. Einladungstokens ausschließlich serverseitig (z. B. Supabase Edge Function) hashen und validieren.

## Sicherheitsregeln
- Öffentliche Fotos und öffentliche Beiträge sind ohne Anmeldung sichtbar.
- Nur eingeladene Personen dürfen Mitglied werden und Inhalte veröffentlichen.
- Rollen und Mitgliedschaften werden serverseitig kontrolliert.
- Ein Einladungslink verleiht niemals Adminrechte.
- Service-Role-Keys dürfen niemals im Browser-Frontend hinterlegt werden.
