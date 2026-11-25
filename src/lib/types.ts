export type Profile = {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
}
export type Post = {
  id: string
  author_id: string
  caption: string | null
  created_at: string
  profiles: Profile | null
  media: { id: string; storage_path: string; media_type: 'image' | 'video' }[]
  likes: { user_id: string }[]
  comments: { id: string; body: string; created_at: string; profiles: Profile | null }[]
}
export type Highlight = {
  id: string
  title: string
  cover_url?: string | null
  created_at: string
}

export type NotificationItem = { id: string; type: 'like' | 'comment'; post_id: string; created_at: string; read_at: string | null; actor: Profile | null }
