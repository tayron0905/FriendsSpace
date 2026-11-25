import { useMemo, useState } from 'react'
import {
  Activity, Bell, Bookmark, Camera, Check, ChevronDown, Compass, Heart,
  Home, Image, Link2, LogOut, Menu, MessageCircle, MoreHorizontal,
  Plus, Search, Send, Settings, Shield, Sparkles, Users, X
} from 'lucide-react'

type Photo = { id: number; src: string; caption: string; user: string; avatar: string; likes: number; place: string }
const photos: Photo[] = [
  { id: 1, src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=85', caption: 'Einfach mal raus. 🌿', user: 'Lena Weber', avatar: 'LW', likes: 28, place: 'Dolomiten' },
  { id: 2, src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=900&q=85', caption: 'Meer geht immer.', user: 'Jonas Richter', avatar: 'JR', likes: 16, place: 'Am Meer' },
  { id: 3, src: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=900&q=85', caption: 'Golden hour ✨', user: 'Mia Schneider', avatar: 'MS', likes: 42, place: 'Abendstimmung' },
  { id: 4, src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=85', caption: 'Wochenendmodus aktiviert', user: 'Noah Fischer', avatar: 'NF', likes: 11, place: 'Unterwegs' },
  { id: 5, src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=900&q=85', caption: 'Kleine Auszeit.', user: 'Lena Weber', avatar: 'LW', likes: 34, place: 'Natur' },
  { id: 6, src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900&q=85', caption: 'Das sollten wir zusammen machen!', user: 'Alex Berger', avatar: 'AB', likes: 19, place: 'Berge' },
]
const people = [{ name: 'Lena Weber', initials: 'LW', color: 'lilac', status: 'Vor 12 Min.' }, { name: 'Jonas Richter', initials: 'JR', color: 'peach', status: 'Vor 1 Std.' }, { name: 'Mia Schneider', initials: 'MS', color: 'mint', status: 'Vor 2 Std.' }, { name: 'Noah Fischer', initials: 'NF', color: 'blue', status: 'Gestern' }]
const stories = [{ name: 'Deine Story', initials: '+', color: 'add' }, ...people.map(p => ({ name: p.name.split(' ')[0], initials: p.initials, color: p.color }))]

export default function App() {
  const [active, setActive] = useState('Startseite')
  const [liked, setLiked] = useState<number[]>([])
  const [saved, setSaved] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')
  const [newPost, setNewPost] = useState('')
  const filtered = useMemo(() => photos.filter(p => (p.caption + p.user + p.place).toLowerCase().includes(query.toLowerCase())), [query])
  const nav = [
    { label: 'Startseite', icon: Home }, { label: 'Entdecken', icon: Compass },
    { label: 'Fotoalbum', icon: Image }, { label: 'Highlights', icon: Bookmark },
    { label: 'Freunde', icon: Users }, { label: 'Aktivitäten', icon: Activity },
  ]
  const toggle = (id: number, list: number[], setter: (v: number[]) => void) => setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20} /></div><span>friends<span className="brand-light">space</span></span><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={19}/></button></div>
      <div className="space-label">DEIN BEREICH</div>
      <nav>{nav.map(item => <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => { setActive(item.label); setMobileNav(false) }}><item.icon size={19}/><span>{item.label}</span>{item.label === 'Aktivitäten' && <i className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="invite-card"><div className="invite-icon"><Link2 size={17}/></div><strong>Dein Kreis wächst</strong><p>Lade deine Lieblingsmenschen zu FriendsSpace ein.</p><button onClick={() => setShowInvite(true)}>Freunde einladen <Plus size={14}/></button></div>
        <button className="nav-item"><Settings size={19}/><span>Einstellungen</span></button>
        <div className="profile-mini"><div className="avatar avatar-me">TD</div><div className="profile-mini-text"><strong>Dein Profil</strong><span>Mitglied</span></div><MoreHorizontal size={19}/></div>
      </div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Menü schließen"/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div className="breadcrumb">Dein privater Kreis <span>/</span> <b>{active}</b></div><div className="top-actions"><label className="searchbox"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Momente suchen …"/></label><button className="icon-button notification" onClick={() => setActive('Aktivitäten')} aria-label="Benachrichtigungen"><Bell size={19}/><i/></button><div className="avatar avatar-me top-avatar">TD</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> MIT DEINEN MENSCHEN</div><h1>{active === 'Startseite' ? <>Schön, dass du <em>da bist.</em></> : active}</h1><p className="subtitle">Die schönsten Momente sind die, die wir miteinander teilen.</p></div><button className="primary-button" onClick={() => setShowComposer(true)}><Plus size={18}/> Beitrag erstellen</button></section>
        <section className="stories-section"><div className="section-heading"><div><h2>Deine Menschen</h2><p>Was bei deinen Freunden passiert</p></div><button className="text-button" onClick={() => setActive('Freunde')}>Alle ansehen <span>→</span></button></div><div className="stories">{stories.map((s, i) => <button className="story" key={s.name} onClick={() => i === 0 ? setShowComposer(true) : toast(`Story von ${s.name} wird geladen`)}><div className={`story-ring ${s.color}`}><div className={`story-avatar ${s.color}`}>{s.initials}</div></div><span>{s.name}</span></button>)}</div></section>
        <div className="feed-layout"><section className="feed-column"><div className="section-heading feed-heading"><div><h2>{active === 'Fotoalbum' ? 'Das Fotoalbum' : active === 'Highlights' ? 'Deine Highlights' : 'Momente aus deinem Kreis'}</h2><p>Ein kleiner Einblick in eure Welt</p></div><button className="filter-button" onClick={() => toast('Du siehst die neuesten Beiträge')}>Neueste <ChevronDown size={15}/></button></div>
          {active === 'Freunde' ? <div className="friends-grid">{people.map(p => <div className="friend-card" key={p.name}><div className={`avatar avatar-${p.color}`}>{p.initials}</div><strong>{p.name}</strong><span>Zuletzt aktiv: {p.status}</span><button onClick={() => toast(`Profil von ${p.name} geöffnet`)}>Profil ansehen</button></div>)}</div> :
          <div className="photo-grid">{filtered.map((photo, i) => <article className={`photo-card photo-card-${i % 3}`} key={photo.id}><div className="photo-wrap"><img src={photo.src} alt={photo.caption}/><button className="photo-more" aria-label="Mehr Optionen"><MoreHorizontal size={19}/></button><div className="photo-overlay"><span>{photo.place}</span></div></div><div className="photo-info"><div className="post-author"><div className="avatar avatar-small">{photo.avatar}</div><div><strong>{photo.user}</strong><span>vor {i + 1} Std.</span></div></div><p>{photo.caption}</p><div className="post-actions"><button className={liked.includes(photo.id) ? 'is-liked' : ''} onClick={() => toggle(photo.id, liked, setLiked)}><Heart size={17} fill={liked.includes(photo.id) ? 'currentColor' : 'none'}/><span>{photo.likes + (liked.includes(photo.id) ? 1 : 0)}</span></button><button onClick={() => toast('Kommentare werden mit Supabase aktiviert')}><MessageCircle size={17}/><span>Kommentieren</span></button><button className={saved.includes(photo.id) ? 'is-saved' : ''} onClick={() => toggle(photo.id, saved, setSaved)} aria-label="Speichern"><Bookmark size={17} fill={saved.includes(photo.id) ? 'currentColor' : 'none'}/></button></div></div></article>)}</div>}
          {filtered.length === 0 && active !== 'Freunde' && <div className="empty-state"><Camera size={28}/><strong>Keine Momente gefunden</strong><span>Versuche einen anderen Suchbegriff.</span></div>}
          <div className="load-more"><span/> Das ist erstmal alles <span/></div>
        </section>
        <aside className="right-column"><div className="side-card circle-card"><div className="side-card-title"><div><span className="eyebrow">DEIN FRIENDSSPACE</span><h3>Euer kleiner Kosmos.</h3></div><div className="orbit-icon"><Sparkles size={20}/></div></div><p>Ein Ort für echte Begegnungen, gemeinsame Erinnerungen und alles dazwischen.</p><div className="stats-row"><div><strong>04</strong><span>Freunde</span></div><div><strong>128</strong><span>Momente</span></div><div><strong>12</strong><span>Highlights</span></div></div></div>
          <div className="side-card online-card"><div className="side-card-title"><h3>Deine Freunde</h3><span className="online-count">2 online</span></div>{people.slice(0, 3).map((p, i) => <div className="online-person" key={p.name}><div className={`avatar avatar-${p.color}`}>{p.initials}<i className={i < 2 ? 'online' : ''}/></div><div><strong>{p.name}</strong><span>{i < 2 ? 'Gerade online' : p.status}</span></div><button onClick={() => toast(`Nachricht an ${p.name} (bald verfügbar)`)}><MessageCircle size={17}/></button></div>)}<button className="all-friends" onClick={() => setActive('Freunde')}>Alle Freunde ansehen <span>→</span></button></div>
          <div className="side-quote"><span>“</span><p>Erinnerungen sind kleine Zeitreisen, die wir gemeinsam machen.</p><small>FÜR DIE MOMENTE, DIE BLEIBEN</small></div>
        </aside></div>
      </div>
      <footer className="footer"><span>© 2026 FriendsSpace</span><span>Mit Liebe für deinen Freundeskreis gemacht <Heart size={12}/></span><span>Privat im Herzen. Offen für Erinnerungen.</span></footer>
    </main>
    {showInvite && <div className="modal-backdrop" onClick={() => setShowInvite(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowInvite(false)}><X/></button><div className="modal-symbol"><Link2/></div><span className="eyebrow">DEIN KREIS, DEINE REGELN</span><h2>Lade deine Menschen ein.</h2><p>Bei FriendsSpace können nur Menschen mit einem gültigen Einladungslink Mitglied werden.</p><div className="invite-preview"><span>friendsspace.app/invite/dein-code</span><button onClick={() => { void navigator.clipboard?.writeText('https://friendsspace.app/invite/dein-code'); toast('Demo-Link kopiert') }}><Link2 size={16}/> Kopieren</button></div><small className="demo-note">Demo-Link – echte Einladungen werden nach der Supabase-Einrichtung erstellt.</small><button className="primary-button modal-action" onClick={() => setShowInvite(false)}>Alles klar <Check size={17}/></button></div></div>}
    {showComposer && <div className="modal-backdrop" onClick={() => setShowComposer(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowComposer(false)}><X/></button><div className="modal-symbol"><Camera/></div><span className="eyebrow">EIN MOMENT FÜR ALLE</span><h2>Was möchtest du teilen?</h2><textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Erzähl deinen Freunden, was gerade los ist …"/><button className="upload-placeholder" onClick={() => toast('Foto-Upload wird mit Supabase Storage aktiviert')}><Plus size={19}/> Foto oder Video hinzufügen</button><button className="primary-button modal-action" onClick={() => { if (newPost.trim()) toast('Beitrag wird nach Supabase-Verbindung veröffentlicht'); else toast('Schreib zuerst ein paar Worte'); setShowComposer(false) }}>Beitrag vorbereiten <Send size={16}/></button></div></div>}
    {notice && <div className="toast"><Check size={17}/>{notice}</div>}
  </div>
}