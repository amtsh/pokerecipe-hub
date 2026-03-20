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

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase project under **Settings \u2192 API**.

---

## Supabase setup

### 1. Create the `recipes` table

```sql
create table recipes (
  slug    text primary key,
  clicks  integer not null default 0
);
```

### 2. Create the `increment_clicks` function

Used by `POST /api/click` for atomic, race-free click tracking:

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
create policy "public increment" on recipes for insert with check (true);
create policy "public update"    on recipes for update using (true);
```

---

## How click tracking works

- `GET /api/click` \u2014 returns all `{ slug, clicks }` rows.
- `POST /api/click` \u2014 accepts `{ slug }`, calls `increment_clicks` atomically.
- `RecipeGrid` fetches counts on mount and passes them to each `RecipeCard`.
- Clicking **Add to Poke** optimistically increments the local counter and fires the POST in the background.

---

## How submit works

1. User pastes a `poke.com/r/\u2026` link (or taps the **Paste** button which reads from the clipboard).
2. `POST /api/scrape` fetches the page server-side and parses `og:title` / `og:description`.
3. Falls back to a slug-derived title if the page is gated or returns no meta tags.
4. User reviews the scraped name + description on a confirmation screen before submitting.

---

## Structure

```
lib/
  supabase.ts                  \u2014 Supabase client
src/app/
  page.tsx                     \u2014 landing page
  layout.tsx                   \u2014 root layout
  globals.css
  api/
    click/route.ts             \u2014 GET read clicks, POST increment
    scrape/route.ts            \u2014 POST scrape og meta from poke.com/r/…
  submit/page.tsx              \u2014 single-input + Paste button flow
  components/
    Navbar.tsx
    Hero.tsx
    RecipeGrid.tsx             \u2014 fetches clicks, renders grid
    RecipeCard.tsx             \u2014 displays click count, tracks Add to Poke
    Footer.tsx
```
