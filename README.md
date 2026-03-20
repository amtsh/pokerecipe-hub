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

The database stores only two fields per recipe: the canonical URL and a click count.

### 1. Create the `recipes` table

```sql
create table recipes (
  url     text primary key,
  clicks  integer not null default 0
);
```

### 2. Create the `increment_clicks` function

```sql
create function increment_clicks(recipe_url text)
returns void as $$
  insert into recipes (url, clicks)
  values (recipe_url, 1)
  on conflict (url)
  do update set clicks = recipes.clicks + 1;
$$ language sql;
```

### 3. Row-Level Security

```sql
alter table recipes enable row level security;
create policy "public read"   on recipes for select using (true);
create policy "public insert" on recipes for insert with check (true);
create policy "public update" on recipes for update using (true);
```

---

## Architecture

### Database (simplified)
- Only `url` (primary key) and `clicks` are stored in Supabase.
- Metadata (name, description) is never persisted. It is fetched on the fly by the scraper for the submit preview and derived from the URL slug on the homepage.

### Submission flow
1. User pastes a `poke.com/r/...` or `poke.com/refer/...` link on `/submit`.
2. `POST /api/scrape` fetches og:title/og:description for the preview screen only.
3. User reviews the preview, then confirms.
4. `POST /api/recipes` saves only `{ url }` to Supabase with `clicks = 0`.

### Homepage
- `src/app/page.tsx` queries Supabase for the top 10 URLs ordered by clicks.
- Recipe names are derived from the URL slug (e.g. `morning-news-brief` → `Morning News Brief`).
- Falls back to 6 seed recipes if Supabase has no data yet.

### Click tracking
- `GET /api/click` returns all `{ url, clicks }` rows.
- `POST /api/click` takes `{ url }` and atomically increments via `increment_clicks(recipe_url)`.
- Clicking **Add to Poke** optimistically increments the counter and fires the POST in the background.

---

## Structure

```
lib/
  supabase.ts                  -- lazy Supabase client
  decode-entities.ts           -- HTML entity + JS unicode escape decoder
src/app/
  page.tsx                     -- server component, fetches top 10
  layout.tsx
  globals.css
  api/
    click/route.ts             -- GET { url, clicks }, POST increment by url
    recipes/route.ts           -- GET top 10, POST { url } only
    scrape/route.ts            -- POST scrape og meta (preview only, not saved)
  submit/page.tsx              -- single-input + Paste + confirm flow
  components/
    Navbar.tsx
    Hero.tsx
    RecipeGrid.tsx
    RecipeCard.tsx             -- tracks clicks by url
    Footer.tsx
```
