# Now Showing (dynamic version — starter)

This is a starting point, not the finished site. It has three things
working end to end: viewing a movie list, logging in, and submitting
a rating that's tied to your account. Everything else (posters,
watchlist, upcoming releases, etc.) still needs to be ported over.

## What's here

- `app/page.tsx` — home page, lists all movies with their average rating
- `app/movie/[slug]/page.tsx` — a movie's page: shows all ratings, has the rating form
- `app/login/page.tsx` — sign up / log in
- `components/RatingForm.tsx` — the actual "submit a rating" logic
- `supabase/migrations/0001_init.sql` — the database schema

## Step 1 — Set up the database

1. Open your Supabase project → **SQL Editor**
2. Paste in the contents of `supabase/migrations/0001_init.sql`
3. Click **Run**

This creates three tables: `profiles`, `movies`, `ratings`.

4. Go to **Table Editor → movies** and manually add a couple of test
   rows (title, slug, year) so there's something to look at. Slug
   should be lowercase-with-dashes, e.g. `the-batman`.

## Step 2 — Get your Supabase keys

In Supabase: **Settings → API**. You need two values:
- Project URL
- `anon` `public` key

## Step 3 — Push this project to GitHub

1. Create a new (empty) repository on GitHub, e.g. `now-showing`
2. In a terminal, inside this folder:
   ```
   git init
   git add .
   git commit -m "Initial dynamic version"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## Step 4 — Deploy on Vercel

1. In Vercel, click **Add New → Project**
2. Import the GitHub repo you just pushed
3. Before deploying, add the environment variables from Step 2:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**

After a minute or two you'll get a live URL — that's the real site.

## Step 5 — Try it

1. Visit the live URL → **Login** → sign up with an email/password
2. Check your email for the confirmation link (Supabase sends this automatically)
3. Go back to the site, log in, click a movie, submit a rating
4. Refresh — your rating should show up in the list

## What's NOT built yet

- Usernames aren't collected at signup (the `profiles` table exists,
  but nothing writes to it yet) — ratings currently show "someone"
  instead of a name
- No posters, watchlist, upcoming releases, or Movie of the Day
- No "follow a username" feature (the schema is ready for it, the
  UI isn't built)
- No styling polish — this intentionally looks plain right now

This is meant to prove the core loop works (login → rate → see it
reflected for everyone) before investing in porting the rest of the
site's features over.
