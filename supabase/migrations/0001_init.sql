-- ============================================================
-- Now Showing: initial schema
-- Run this once in Supabase (SQL Editor -> paste -> Run)
-- ============================================================

-- Public profile info for each logged-in user.
-- Supabase Auth already creates a hidden "auth.users" table when
-- someone signs up; this table holds the public-facing bits
-- (username) tied to that same account.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamp with time zone default now()
);

-- One row per movie or show.
create table movies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  year int,
  genre text,
  director text,
  runtime int,          -- minutes, movies only
  poster_url text,
  trailer_url text,
  created_at timestamp with time zone default now()
);

-- One row per (user, movie) rating. A user can only rate a movie once,
-- but can update that rating later (see the unique constraint).
create table ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  movie_id uuid references movies(id) on delete cascade,
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  notes text,
  created_at timestamp with time zone default now(),
  unique (user_id, movie_id)
);

-- ============================================================
-- Row Level Security: who can read/write what.
-- Without this, Supabase blocks all access by default once RLS
-- is turned on -- these policies explicitly allow the safe stuff.
-- ============================================================

alter table profiles enable row level security;
alter table movies enable row level security;
alter table ratings enable row level security;

-- Anyone can view profiles, movies, and ratings (public site).
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Movies are viewable by everyone"
  on movies for select using (true);

create policy "Ratings are viewable by everyone"
  on ratings for select using (true);

-- Users can only insert/update/delete their OWN rating rows.
create policy "Users can insert their own ratings"
  on ratings for insert with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on ratings for update using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on ratings for delete using (auth.uid() = user_id);

-- Users can only edit their own profile row.
create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);
