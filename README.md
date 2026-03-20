# pokerecipe.hub

A community site for sharing and browsing [Poke](https://poke.com) recipes.
Built with **Next.js 14** (App Router) + **Tailwind CSS** + **Supabase**.

---

## Local development

```bash
npm install
npm run dev   # http://localhost:3000
```

---

## Environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase project under **Settings > API**.

---

## Supabase setup

### 1. Create the `recipes` table

```sql
create table recipes (
  slug        text primary key,
  name        text,
  description text,
  url         text,
  clicks      integer not null default 0,
  created_at  timestamptz default now()
);
```

If you already have a `recipes` table from a prior version, run:

```sql
alter table recipes
  add column if not exists name        text,
  add column if not exists description text,
  add column if not exists url         text,
  add column if not exists created_at  timestamptz default now();
```

### 2. Create the `increment_clicks` function

```sql
create or replace function increment_clicks(recipe_slug text)
returns void as $$
  insert into recipes (slug, clicks)
  values (recipe_slug, 1)
  on conflict (slug)
  do update set clicks = recipes.clicks + 1;
$$ language sql;
```

### 3. Row-Level Security (recommended)

```sql
alter table recipes enable row level security;
create policy "public read"      on recipes for select using (true);
create policy "public insert"    on recipes for insert with check (true);
create policy "public update"    on recipes for update using (true);
```

---

## Architecture

### Submission flow
1. User pastes a `poke.com/r/...` or `poke.com/refer/...` link on `/submit`.
2. `POST /api/scrape` fetches the page server-side and extracts `og:title` / `og:description`.
3. User reviews the name + description on a confirmation screen.
4. On confirm, `POST /api/recipes` upserts `{ slug, name, description, url, clicks: 0 }` into Supabase.

### Homepage
- `src/app/page.tsx` is a `force-dynamic` server component that queries Supabase for the top 10 recipes ordered by clicks.
- Falls back to 6 seed recipes if Supabase is not configured or has no data yet.

### Click tracking
- `GET /api/click` returns all `{ slug, clicks }` rows.
- `POST /api/click` atomically increments via the `increment_clicks` Postgres function.
- Clicking **Add to Poke** optimistically increments the local counter and fires the POST in the background.

---

## Structure

```
lib/
  supabase.ts                  -- lazy Supabase client (getSupabase())
  decode-entities.ts           -- HTML entity + JS unicode escape decoder
src/app/
  page.tsx                     -- server component, fetches top 10
  layout.tsx
  globals.css
  api/
    click/route.ts             -- GET read clicks, POST increment
    recipes/route.ts           -- GET top 10, POST new recipe
    scrape/route.ts            -- POST scrape og meta from poke.com/r/...
  submit/page.tsx              -- single-input + Paste button flow
  components/
    Navbar.tsx
    Hero.tsx
    RecipeGrid.tsx             -- client, search + grid
    RecipeCard.tsx             -- click tracking per card
    Footer.tsx
```
