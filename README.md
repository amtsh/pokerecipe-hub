# pokerecipe.hub

A community site for sharing and browsing [Poke](https://poke.com) recipes.
Built with **Next.js 14** (App Router) + **Tailwind CSS**.

## Local development

```bash
npm install
npm run dev   # http://localhost:3000
```

## Structure

```
src/app/
  page.tsx              — landing page
  layout.tsx            — root layout
  globals.css           — Tailwind + Inter font
  submit/page.tsx       — submit form
  components/
    Navbar.tsx
    Hero.tsx
    RecipeGrid.tsx      — live search + grid
    RecipeCard.tsx
    Footer.tsx
```

## Wiring up real data

Replace the `SAMPLE_RECIPES` array in `RecipeGrid.tsx` with a `fetch('/api/recipes')` call,
add a `src/app/api/recipes/route.ts` handler, and connect Vercel Postgres or Supabase.
