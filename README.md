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

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Supabase schema

```sql
create table recipes (
  slug         text primary key,
  name         text not null,
  description  text,
  clicks       integer not null default 0,
  submitted_at timestamptz not null default now()
);

-- url is NOT stored — derived as https://poke.com/r/<slug> on the frontend

-- Atomic increment; auto-creates a minimal row on first click
create or replace function increment_clicks(recipe_slug text)
returns void as $$
  insert into recipes (slug, name, clicks)
  values (recipe_slug, recipe_slug, 1)
  on conflict (slug)
  do update set clicks = recipes.clicks + 1;
$$ language sql;

alter table recipes enable row level security;
create policy "public read"   on recipes for select using (true);
create policy "public insert" on recipes for insert with check (true);
create policy "public update" on recipes for update using (true);
```

---

## Architecture

### Submission flow
1. User pastes a `poke.com/r/...` or `poke.com/refer/...` link on `/submit`.
2. `POST /api/scrape` fetches og:title (strips " – Poke" suffix) and og:description (truncated to 20 words).
3. User reviews on a confirmation screen.
4. `POST /api/recipes` saves `{ slug, name, description }` — no url column.

### Homepage
- Queries Supabase for the 10 most recently submitted recipes (`submitted_at DESC`).
- URL for each card is derived client-side: `https://poke.com/r/${slug}`.
- Falls back to 6 seed recipes if Supabase has no data.

### Click tracking
- `POST /api/click { slug }` → `increment_clicks(recipe_slug)` RPC.
- `GET /api/click` returns `{ slug, clicks }` rows.

### Search
- `GET /api/recipes?q=...` runs `ilike` across name + description.

---

## Structure

```
lib/
  supabase.ts          -- lazy client
  decode-entities.ts   -- HTML entity + unicode escape decoder
src/app/
  page.tsx             -- server component, newest 10 from DB
  api/
    click/route.ts     -- GET/POST by slug
    recipes/route.ts   -- GET (search), POST (save slug+name+desc)
    scrape/route.ts    -- POST metadata preview, strips " - Poke" suffix
  submit/page.tsx
  components/
    Navbar, Hero, RecipeGrid, RecipeCard, Footer
```
