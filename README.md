# pokerecipe.book

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

## Features

- **Dark mode** toggle in the header (persists via localStorage, respects system preference on first visit)
- **Live search** on the homepage hits Supabase `ilike` across name + description with 300ms debounce
- **Submission flow**: paste link → scrape og meta (strips " – Poke" suffix, 20-word description cap) → confirm → save to DB
- **Click tracking**: atomic `increment_clicks` RPC, optimistic UI update
