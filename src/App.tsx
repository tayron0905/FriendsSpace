import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell, Bookmark, Camera, Check, Heart, Home, Image as ImageIcon,
  Link2, LogOut, MessageCircle, Plus, Search, Send, Settings, Shield,
  Sparkles, Users, Upload, X
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { Post, Profile, Highlight, NotificationItem } from './lib/types'
import './app.css'

type View = 'Startseite' | 'Fotoalbum' | 'Highlights' | 'Freunde' | 'Profil' | 'Admin'
const nav: { label: View; icon: typeof Home }[] = [
  { label: 'Startseite', icon: Home }, { label: 'Fotoalbum', icon: ImageIcon },
  { label: 'Highlights', icon: Bookmark }, { label: 'Freunde', icon: Users },
  { label: 'Profil', icon: Settings },
]

export default function App() {
  const [view, setView] = useState<View>('Startseite')
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'join'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [inviteToken, setInviteToken] = useState(new URLSearchParams(window.location.search).get('invite') ?? '')
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [highlightTitle, setHighlightTitle] = useState('')
  const [showPostForm, setShowPostForm] = useState(false)

  const notify = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 3500) }

  const loadContent = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    const { data: postData, error } = await supabase.from('posts')
      .select('id,author_id,caption,created_at,profiles(id,username,display_name,bio,avatar_url),media(id,storage_path,media_type),likes(user_id),comments(id,body,created_at,profiles(id,username,display_name,bio,avatar_url))')
      .order('created_at', { ascending: false }).limit(60)
    if (error) notify(error.message)
    else setPosts((postData ?? []) as unknown as Post[])
    const { data: highlightData } = await supabase.from('highlights').select('id,title,created_at').order('created_at', { ascending: false })
    setHighlights((highlightData ?? []) as Highlight[])
    const { data: profileData } = await supabase.from('profiles').select('id,username,display_name,bio,avatar_url').order('display_name').limit(100)
    setFriends(((profileData ?? []) as Profile[]).filter(p => p.id !== userId))
    if (userId) {
      const { data: notificationData } = await supabase.from('notifications').select('id,type,post_id,created_at,read_at,actor:profiles!notifications_actor_id_fkey(id,username,display_name,bio,avatar_url)').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(25)
      setNotifications((notificationData ?? []) as unknown as NotificationItem[])
      const { data: ownProfile } = await supabase.from('profiles').select('id,username,display_name,bio,avatar_url').eq('id', userId).maybeSingle()
      setProfile((ownProfile as Profile | null) ?? null)
      const { data: membership } = await supabase.from('memberships').select('role').eq('user_id', userId).maybeSingle()
      setIsAdmin(membership?.role === 'admin')
    } else {
      setNotifications([])
      setProfile(null)
      setIsAdmin(false)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => { void loadContent() }, [loadContent])

  const filteredPosts = useMemo(() => posts.filter(post =>
    [post.caption ?? '', post.profiles?.display_name ?? '', post.profiles?.username ?? '']
      .join(' ').toLowerCase().includes(search.toLowerCase())
  ), [posts, search])

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        if (!inviteToken.trim()) throw new Error('Du benötigst einen gültigen Einladungslink.')
        const { error } = await supabase.functions.invoke('redeem-invite', { body: { email, password, username, invite_token: inviteToken } })
        if (error) throw error
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch (error) { notify(error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function createPost(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !userId) return notify('Bitte melde dich zuerst an.')
    if (!caption.trim() && !mediaFile) return notify('Füge einen Text oder ein Foto hinzu.')
    if (mediaFile && mediaFile.size > 50 * 1024 * 1024) return notify('Dateien dürfen maximal 50 MB groß sein.')
    setBusy(true)
    let createdPostId: string | null = null
    try {
      const { data: post, error } = await supabase.from('posts').insert({ author_id: userId, caption: caption.trim() || null }).select('id').single()
      if (error) throw error
      createdPostId = post.id
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop() || 'jpg'
        const path = userId + '/' + crypto.randomUUID() + '.' + ext
        const { error: uploadError } = await supabase.storage.from('public-media').upload(path, mediaFile, { upsert: false })
        if (uploadError) throw uploadError
        const { error: mediaError } = await supabase.from('media').insert({
          post_id: post.id, owner_id: userId, storage_path: path,
          media_type: mediaFile.type.startsWith('video/') ? 'video' : 'image',
        })
        if (mediaError) throw mediaError
      }
      setCaption(''); setMediaFile(null); setShowPostForm(false); await loadContent(); notify('Beitrag veröffentlicht.')
    } catch (error) {
      if (createdPostId) await supabase.from('posts').delete().eq('id', createdPostId)
      notify(error instanceof Error ? error.message : 'Beitrag konnte nicht gespeichert werden.')
    } finally { setBusy(false) }
  }

  async function toggleLike(post: Post) {
    if (!supabase || !userId) return notify('Zum Liken bitte anmelden.')
    const existing = post.likes.some(like => like.user_id === userId)
    const result = existing
      ? await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', userId)
      : await supabase.from('likes').insert({ post_id: post.id, user_id: userId })
    if (result.error) notify(result.error.message)
    else await loadContent()
  }

  async function addComment(event: FormEvent, postId: string) {
    event.preventDefault()
    if (!supabase || !userId) return notify('Zum Kommentieren bitte anmelden.')
    const body = (commentDrafts[postId] ?? '').trim()
    if (!body) return
    const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: userId, body })
    if (error) notify(error.message)
    else { setCommentDrafts(current => ({ ...current, [postId]: '' })); await loadContent() }
  }

  async function createInvite() {
    if (!supabase || !isAdmin) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('create-invite', { body: {} })
    if (error) notify(error.message)
    else if (data?.url) { setInviteUrl(data.url); await navigator.clipboard?.writeText(data.url); notify('Einladungslink erstellt und kopiert.') }
    setBusy(false)
  }

  async function createHighlight(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !userId || !highlightTitle.trim()) return
    const { error } = await supabase.from('highlights').insert({ owner_id: userId, title: highlightTitle.trim() })
    if (error) notify(error.message)
    else { setHighlightTitle(''); await loadContent(); notify('Highlight erstellt.') }
  }

  async function updateProfile(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !userId || !profile) return
    const { error } = await supabase.from('profiles').update({ display_name: profile.display_name, username: profile.username, bio: profile.bio }).eq('id', userId)
    if (error) notify(error.message); else notify('Profil gespeichert.')
  }

  async function markNotificationRead(item: NotificationItem) {
    if (!supabase || !userId || item.read_at) return
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id).eq('recipient_id', userId)
    if (error) notify(error.message); else await loadContent()
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null); setIsAdmin(false); setView('Startseite')
  }

  const publicUrl = (path: string) => supabase?.storage.from('public-media').getPublicUrl(path).data.publicUrl ?? ''

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/"><span className="brand-mark"><Sparkles size={20}/></span><span>friends<span className="brand-light">space</span></span></a>
      <div className="space-label">DEIN BEREICH</div>
      <nav>{nav.map(item => <button key={item.label} className={view === item.label ? 'nav-item active' : 'nav-item'} onClick={() => setView(item.label)}><item.icon size={18}/>{item.label}</button>)}
        {isAdmin && <button className={view === 'Admin' ? 'nav-item active' : 'nav-item'} onClick={() => setView('Admin')}><Shield size={18}/>Einladungen</button>}
      </nav>
      <div className="sidebar-bottom">
        {isAdmin && <div className="invite-card"><div className="invite-icon"><Link2 size={17}/></div><strong>Dein Kreis wächst</strong><p>Nur eingeladene Menschen können beitreten.</p><button onClick={() => setView('Admin')}>Einladen <Plus size={14}/></button></div>}
        {profile ? <div className="profile-mini"><div className="avatar avatar-me">{profile.display_name.slice(0, 2).toUpperCase()}</div><div className="profile-mini-text"><strong>{profile.display_name}</strong><span>@{profile.username}</span></div><button className="icon-button" onClick={() => void signOut()} title="Abmelden"><LogOut size={16}/></button></div> : <button className="nav-item" onClick={() => setAuthMode('login')}>Anmelden</button>}
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Dein privater Kreis <span>/</span> <b>{view}</b></div><div className="top-actions"><label className="searchbox"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Momente suchen …"/></label>{profile && <button className="icon-button notification-button" onClick={() => setShowNotifications(v => !v)} aria-label="Benachrichtigungen"><Bell size={17}/>{notifications.some(n => !n.read_at) && <i/>}</button>}{profile && <div className="avatar avatar-me top-avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div>}</div></header>
      {showNotifications && profile && <section className="notification-panel"><div className="notification-panel-head"><strong>Benachrichtigungen</strong><button onClick={() => setShowNotifications(false)}><X size={15}/></button></div>{notifications.length ? notifications.map(item => <button className={item.read_at ? 'notification-row read' : 'notification-row'} key={item.id} onClick={() => void markNotificationRead(item)}><span className="notification-dot"/><span><b>{item.actor?.display_name ?? 'Ein Mitglied'}</b> {item.type === 'like' ? 'gefällt dein Beitrag.' : 'hat deinen Beitrag kommentiert.'}<small>{new Date(item.created_at).toLocaleString('de-DE')}</small></span></button>) : <p className="empty-copy">Noch keine Benachrichtigungen.</p>}</section>}
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> MIT DEINEN MENSCHEN</div><h1>{view === 'Startseite' ? <>Schön, dass du <em>da bist.</em></> : view}</h1><p className="subtitle">Die schönsten Momente sind die, die wir miteinander teilen.</p></div>{profile && <button className="primary-button" onClick={() => setShowPostForm(true)}><Plus size={18}/> Beitrag erstellen</button>}</section>
        {!isSupabaseConfigured && <div className="setup-notice"><Shield size={20}/><div><strong>Supabase ist noch nicht verbunden</strong><p>Trage die Projekt-URL und den anon key aus Supabase in <code>.env.local</code> ein. Danach werden Anmeldung, Uploads und Datenbankfunktionen aktiviert.</p></div></div>}
        {!profile && <section className="auth-card"><div className="modal-symbol"><Users/></div><span className="eyebrow">{authMode === 'join' ? 'DU BIST EINGELADEN?' : 'WILLKOMMEN ZURÜCK'}</span><h2>{authMode === 'join' ? 'Werde Teil des Kreises.' : 'Melde dich bei FriendsSpace an.'}</h2><p>Fotos und öffentliche Beiträge sind für alle sichtbar. Mitglied werden kannst du ausschließlich mit einem gültigen Einladungslink.</p>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'join' && <><input value={inviteToken} onChange={e => setInviteToken(e.target.value)} placeholder="Einladungscode" required/><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Benutzername" required minLength={3}/></>}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail-Adresse" required/>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort (mind. 8 Zeichen)" minLength={8} required/>
            <button className="primary-button" disabled={busy || !isSupabaseConfigured}>{busy ? 'Bitte warten …' : authMode === 'join' ? 'Mit Einladung beitreten' : 'Anmelden'} <Send size={16}/></button>
          </form>
          <button className="auth-switch" onClick={() => setAuthMode(authMode === 'login' ? 'join' : 'login')}>{authMode === 'login' ? 'Du hast einen Einladungslink? Konto erstellen' : 'Schon Mitglied? Anmelden'}</button>
        </section>}
        {profile && view === 'Profil' && <section className="side-card profile-editor"><h2>Dein Profil</h2><form onSubmit={updateProfile} className="auth-form"><label>Anzeigename<input value={profile.display_name} onChange={e => setProfile({ ...profile, display_name: e.target.value })}/></label><label>Benutzername<input value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })}/></label><label>Über dich<textarea value={profile.bio ?? ''} onChange={e => setProfile({ ...profile, bio: e.target.value })}/></label><button className="primary-button">Profil speichern <Check size={16}/></button></form></section>}
        {profile && view === 'Admin' && isAdmin && <section className="side-card profile-editor"><span className="eyebrow">MITGLIEDER EINLADEN</span><h2>Einladungslink erstellen</h2><p>Einladungslinks sind einmalig verwendbar und laufen nach sieben Tagen ab.</p><button className="primary-button" onClick={() => void createInvite()} disabled={busy}>Einladung erstellen <Link2 size={16}/></button>{inviteUrl && <div className="invite-preview"><span>{inviteUrl}</span><button onClick={() => void navigator.clipboard?.writeText(inviteUrl)}>Kopieren</button></div>}</section>}
        {profile && view === 'Admin' && !isAdmin && <section className="side-card profile-editor"><h2>Kein Zugriff</h2><p>Die Einladungsverwaltung ist nur für Administratoren sichtbar.</p></section>}
        {view === 'Highlights' && <section className="side-card profile-editor"><h2>Highlights</h2>{profile && <form className="inline-form" onSubmit={createHighlight}><input value={highlightTitle} onChange={e => setHighlightTitle(e.target.value)} placeholder="Name des Highlights"/><button className="primary-button"><Plus size={16}/> Erstellen</button></form>}<div className="highlight-grid">{highlights.map(item => <article className="highlight-tile" key={item.id}><div className="highlight-cover"><Bookmark size={25}/></div><strong>{item.title}</strong></article>)}</div>{!highlights.length && <p className="empty-copy">Noch keine Highlights vorhanden.</p>}</section>}
        {view === 'Freunde' && <section className="side-card profile-editor"><h2>Mitglieder</h2><div className="friends-grid">{friends.map(friend => <article className="friend-card" key={friend.id}><div className="avatar">{friend.display_name.slice(0, 2).toUpperCase()}</div><strong>{friend.display_name}</strong><span>@{friend.username}</span></article>)}</div>{!friends.length && <p className="empty-copy">Noch keine weiteren Mitglieder.</p>}</section>}
        {(view === 'Startseite' || view === 'Fotoalbum') && <div className="feed-layout"><section className="feed-column"><div className="section-heading feed-heading"><div><h2>{view === 'Fotoalbum' ? 'Das öffentliche Fotoalbum' : 'Öffentliche Momente'}</h2><p>Für alle sichtbar – Beiträge nur von Mitgliedern</p></div></div>
          {loading ? <p className="empty-copy">Inhalte werden geladen …</p> : filteredPosts.length ? <div className="photo-grid">{filteredPosts.map(post => <article className="photo-card" key={post.id}>{post.media.map(media => media.media_type === 'video' ? <video key={media.id} src={publicUrl(media.storage_path)} controls className="feed-media"/> : <img key={media.id} src={publicUrl(media.storage_path)} alt="" className="feed-media"/>)}<div className="photo-info"><div className="post-author"><div className="avatar avatar-small">{post.profiles?.display_name?.slice(0, 2).toUpperCase() ?? 'FS'}</div><div><strong>{post.profiles?.display_name ?? 'FriendsSpace-Mitglied'}</strong><span>{new Date(post.created_at).toLocaleString('de-DE')}</span></div></div>{post.caption && <p>{post.caption}</p>}<div className="post-actions"><button onClick={() => void toggleLike(post)} className={post.likes.some(l => l.user_id === userId) ? 'is-liked' : ''}><Heart size={16}/> {post.likes.length}</button><span><MessageCircle size={16}/> {post.comments.length}</span></div><div className="comments-list">{post.comments.map(comment => <p key={comment.id}><strong>{comment.profiles?.display_name ?? 'Mitglied'}:</strong> {comment.body}</p>)}</div>{profile && <form className="comment-form" onSubmit={event => void addComment(event, post.id)}><input value={commentDrafts[post.id] ?? ''} onChange={event => setCommentDrafts(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Kommentar schreiben …"/><button aria-label="Kommentar senden"><Send size={15}/></button></form>}</div></article>)}</div> : <div className="empty-state"><Camera size={28}/><strong>Noch keine Beiträge</strong><span>Hier erscheinen öffentliche Fotos und Momente aus FriendsSpace.</span></div>}
        </section><aside className="right-column"><div className="side-card circle-card"><div className="side-card-title"><div><span className="eyebrow">DEIN FRIENDSSPACE</span><h3>Euer kleiner Kosmos.</h3></div><div className="orbit-icon"><Sparkles size={20}/></div></div><p>Ein Ort für echte Begegnungen, gemeinsame Erinnerungen und alles dazwischen.</p><div className="stats-row"><div><strong>{friends.length}</strong><span>Mitglieder</span></div><div><strong>{posts.length}</strong><span>Momente</span></div><div><strong>{highlights.length}</strong><span>Highlights</span></div></div></div><div className="side-quote"><span>“</span><p>Erinnerungen sind kleine Zeitreisen, die wir gemeinsam machen.</p><small>FÜR DIE MOMENTE, DIE BLEIBEN</small></div></aside></div>}
      </div>
      <footer className="footer"><span>© 2026 FriendsSpace</span><span>Mit Liebe für deinen Freundeskreis gemacht <Heart size={12}/></span><span>Öffentliche Momente. Geschlossener Mitgliederkreis.</span></footer>
    </main>
    {showPostForm && <div className="modal-backdrop" onClick={() => setShowPostForm(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowPostForm(false)}><X/></button><div className="modal-symbol"><Camera/></div><span className="eyebrow">EIN MOMENT FÜR ALLE</span><h2>Was möchtest du teilen?</h2><form onSubmit={createPost}><textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Erzähl, was gerade los ist …"/><label className="upload-placeholder"><Upload size={19}/> Foto oder Video auswählen<input type="file" accept="image/*,video/*" onChange={e => setMediaFile(e.target.files?.[0] ?? null)}/></label>{mediaFile && <small>{mediaFile.name}</small>}<button className="primary-button modal-action" disabled={busy}>{busy ? 'Wird veröffentlicht …' : 'Veröffentlichen'} <Send size={16}/></button></form></div></div>}
    {message && <div className="toast"><Check size={17}/>{message}</div>}
  </div>
}
