-- FriendsSpace production baseline. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now()
);
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  created_by uuid not null references public.profiles(id),
  uses_remaining integer not null default 1 check (uses_remaining >= 0),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text check (caption is null or char_length(caption) <= 3000),
  created_at timestamptz not null default now()
);
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image','video')),
  created_at timestamptz not null default now()
);
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
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
  title text not null check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now()
);
create table if not exists public.highlight_media (
  highlight_id uuid not null references public.highlights(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  position integer not null default 0,
  primary key (highlight_id,media_id)
);

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.memberships where user_id = auth.uid()) $$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.memberships where user_id = auth.uid() and role = 'admin') $$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, username, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), 'member_' || substr(new.id::text,1,8)),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'username',''), 'FriendsSpace Mitglied')
  ) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_friendsspace on auth.users;
create trigger on_auth_user_created_friendsspace after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.highlights enable row level security;
alter table public.highlight_media enable row level security;

drop policy if exists "Public profiles read" on public.profiles;
create policy "Public profiles read" on public.profiles for select using (true);
drop policy if exists "Members update own profile" on public.profiles;
create policy "Members update own profile" on public.profiles for update to authenticated using (id = auth.uid() and public.is_member()) with check (id = auth.uid() and public.is_member());
drop policy if exists "Members see membership list" on public.memberships;
create policy "Members see membership list" on public.memberships for select to authenticated using (public.is_member());
drop policy if exists "Admins manage invitations" on public.invitations;
create policy "Admins manage invitations" on public.invitations for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Public posts read" on public.posts;
create policy "Public posts read" on public.posts for select using (true);
drop policy if exists "Members create posts" on public.posts;
create policy "Members create posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and public.is_member());
drop policy if exists "Authors update posts" on public.posts;
create policy "Authors update posts" on public.posts for update to authenticated using (author_id = auth.uid() and public.is_member()) with check (author_id = auth.uid() and public.is_member());
drop policy if exists "Authors delete posts" on public.posts;
create policy "Authors delete posts" on public.posts for delete to authenticated using (author_id = auth.uid() and public.is_member());
drop policy if exists "Public media read" on public.media;
create policy "Public media read" on public.media for select using (true);
drop policy if exists "Members upload media metadata" on public.media;
create policy "Members upload media metadata" on public.media for insert to authenticated with check (owner_id = auth.uid() and public.is_member());
drop policy if exists "Owners delete media metadata" on public.media;
create policy "Owners delete media metadata" on public.media for delete to authenticated using (owner_id = auth.uid());
drop policy if exists "Public likes read" on public.likes;
create policy "Public likes read" on public.likes for select using (true);
drop policy if exists "Members like posts" on public.likes;
create policy "Members like posts" on public.likes for insert to authenticated with check (user_id = auth.uid() and public.is_member());
drop policy if exists "Members remove own likes" on public.likes;
create policy "Members remove own likes" on public.likes for delete to authenticated using (user_id = auth.uid());
drop policy if exists "Public comments read" on public.comments;
create policy "Public comments read" on public.comments for select using (true);
drop policy if exists "Members comment" on public.comments;
create policy "Members comment" on public.comments for insert to authenticated with check (author_id = auth.uid() and public.is_member());
drop policy if exists "Authors remove comments" on public.comments;
create policy "Authors remove comments" on public.comments for delete to authenticated using (author_id = auth.uid());
drop policy if exists "Public highlights read" on public.highlights;
create policy "Public highlights read" on public.highlights for select using (true);
drop policy if exists "Owners manage highlights" on public.highlights;
create policy "Owners manage highlights" on public.highlights for all to authenticated using (owner_id = auth.uid() and public.is_member()) with check (owner_id = auth.uid() and public.is_member());
drop policy if exists "Public highlight items read" on public.highlight_media;
create policy "Public highlight items read" on public.highlight_media for select using (true);
drop policy if exists "Owners manage highlight items" on public.highlight_media;
create policy "Owners manage highlight items" on public.highlight_media for all to authenticated using (exists(select 1 from public.highlights h where h.id = highlight_id and h.owner_id = auth.uid())) with check (exists(select 1 from public.highlights h where h.id = highlight_id and h.owner_id = auth.uid()));

create or replace function public.consume_invitation(p_token_hash text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare affected integer;
begin
  update public.invitations set uses_remaining = uses_remaining - 1
  where token_hash = p_token_hash and uses_remaining > 0 and expires_at > now();
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.consume_invitation(text) from public, anon, authenticated;
grant execute on function public.consume_invitation(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('public-media','public-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800;
drop policy if exists "Public media objects read" on storage.objects;
create policy "Public media objects read" on storage.objects for select using (bucket_id = 'public-media');
drop policy if exists "Members upload own media objects" on storage.objects;
create policy "Members upload own media objects" on storage.objects for insert to authenticated with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());
drop policy if exists "Owners delete own media objects" on storage.objects;
create policy "Owners delete own media objects" on storage.objects for delete to authenticated using (bucket_id = 'public-media' and owner_id = auth.uid()::text);


-- Notifications generated automatically for post likes and comments.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','comment')),
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = public
as $$
declare post_owner uuid;
begin
  select author_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.user_id then
    insert into public.notifications(recipient_id,actor_id,type,post_id) values(post_owner,new.user_id,'like',new.post_id);
  end if;
  return new;
end;
$$;
drop trigger if exists after_post_like_notification on public.likes;
create trigger after_post_like_notification after insert on public.likes for each row execute procedure public.notify_post_like();

create or replace function public.notify_post_comment()
returns trigger language plpgsql security definer set search_path = public
as $$
declare post_owner uuid;
begin
  select author_id into post_owner from public.posts where id = new.post_id;
  if post_owner is not null and post_owner <> new.author_id then
    insert into public.notifications(recipient_id,actor_id,type,post_id) values(post_owner,new.author_id,'comment',new.post_id);
  end if;
  return new;
end;
$$;
drop trigger if exists after_post_comment_notification on public.comments;
create trigger after_post_comment_notification after insert on public.comments for each row execute procedure public.notify_post_comment();
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);


drop policy if exists "Admins remove memberships" on public.memberships;
create policy "Admins remove memberships" on public.memberships for delete to authenticated using (public.is_admin());
