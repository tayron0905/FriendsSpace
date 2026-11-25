-- FriendsSpace – initial Supabase schema
-- Run this in the Supabase SQL Editor after creating your project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  created_by uuid not null references public.profiles(id),
  uses_remaining integer not null default 1 check (uses_remaining >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  visibility text not null default 'public' check (visibility in ('public')),
  created_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image','video')),
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cover_media_id uuid references public.media(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.highlight_media (
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  position integer not null default 0,
  primary key (highlight_id, media_id)
);

create table if not exists public.memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.highlights enable row level security;
alter table public.highlight_media enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

-- Public can view public profiles and posts/media. Writes require membership.
create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Posts are publicly readable" on public.posts for select using (visibility = 'public');
create policy "Media is publicly readable" on public.media for select using (true);
create policy "Likes are publicly readable" on public.likes for select using (true);
create policy "Comments are publicly readable" on public.comments for select using (true);
create policy "Highlights are publicly readable" on public.highlights for select using (true);
create policy "Highlight media is publicly readable" on public.highlight_media for select using (true);

create policy "Members can create posts" on public.posts for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.user_id = auth.uid()) and author_id = auth.uid());
create policy "Authors can update own posts" on public.posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "Authors can delete own posts" on public.posts for delete to authenticated using (author_id = auth.uid());
create policy "Members can add media" on public.media for insert to authenticated
  with check (owner_id = auth.uid() and exists (select 1 from public.memberships m where m.user_id = auth.uid()));
create policy "Owners can remove media" on public.media for delete to authenticated using (owner_id = auth.uid());
create policy "Members can like" on public.likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.memberships m where m.user_id = auth.uid()));
create policy "Users can unlike" on public.likes for delete to authenticated using (user_id = auth.uid());
create policy "Members can comment" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.memberships m where m.user_id = auth.uid()));
create policy "Authors can delete comments" on public.comments for delete to authenticated using (author_id = auth.uid());
create policy "Owners manage highlights" on public.highlights for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners manage highlight media" on public.highlight_media for all to authenticated
  using (exists (select 1 from public.highlights h where h.id = highlight_id and h.owner_id = auth.uid()))
  with check (exists (select 1 from public.highlights h where h.id = highlight_id and h.owner_id = auth.uid()));

-- Invitation creation and redemption must be implemented via a trusted server/Edge Function.
-- Never expose raw invitation tokens or allow anonymous users to insert memberships.
