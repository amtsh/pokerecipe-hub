"use client";

import { useState, useEffect, useCallback } from "react";
import RecipeCard, { type Recipe } from "./RecipeCard";

/** Fallback shown when Supabase has no submitted recipes yet */
const SAMPLE_RECIPES: Recipe[] = [
  { id: "1", name: "Morning News Brief",   slug: "morning-news-brief",  author: "community", tags: ["News", "Daily"],         description: "A curated 5-bullet summary of top headlines across tech, world news, and markets. Runs every morning at 8 AM." },
  { id: "2", name: "Inbox Zero",            slug: "inbox-zero",           author: "community", tags: ["Email", "Productivity"], description: "Triages your emails, flags what matters, drafts replies for common threads, and archives the noise automatically." },
  { id: "3", name: "Weekly Retrospective", slug: "weekly-retrospective",  author: "community", tags: ["Reflection", "Weekly"],  description: "Every Friday, pulls your calendar, completed tasks, and email threads into a concise weekly reflection and next-week plan." },
  { id: "4", name: "Travel Companion",     slug: "travel-companion",      author: "community", tags: ["Travel", "Automation"],  description: "Watches for flight confirmations and hotel bookings, builds a trip timeline, and sends day-of reminders with check-in links." },
  { id: "5", name: "Finance Pulse",        slug: "finance-pulse",         author: "community", tags: ["Finance", "Weekly"],     description: "Monitors spending receipts and bank alerts, categorises transactions, and delivers a weekly financial health snapshot." },
  { id: "6", name: "Meeting Prep",         slug: "meeting-prep",          author: "community", tags: ["Calendar", "Meetings"],  description: "30 minutes before each calendar event, compiles relevant emails, notes, and thread context so you walk in prepared." },
];

interface DBRow {
  slug: string;
  name: string;
  description: string;
  clicks: number;
}

function rowsToRecipes(rows: DBRow[]): { recipes: Recipe[]; clickMap: Record<string, number> } {
  const recipes: Recipe[] = rows.map((r, i) => ({
    id:          String(i + 1),
    name:        r.name        || r.slug,
    description: r.description || "",
    slug:        r.slug,
    author:      "community",
    tags:        [],
  }));
  const clickMap: Record<string, number> = {};
  for (const r of rows) clickMap[r.slug] = r.clicks ?? 0;
  return { recipes, clickMap };
}

interface RecipeGridProps {
  /** Server-fetched latest recipes — used when query is empty */
  initialRecipes?: Recipe[];
  /** Server-fetched click counts keyed by slug */
  initialClickMap?: Record<string, number>;
}

export default function RecipeGrid({
  initialRecipes = [],
  initialClickMap = {},
}: RecipeGridProps) {
  const baseRecipes  = initialRecipes.length > 0 ? initialRecipes : SAMPLE_RECIPES;
  const baseClickMap = Object.keys(initialClickMap).length > 0 ? initialClickMap : {};

  const [query, setQuery]               = useState("");
  const [searchRecipes, setSearchRecipes] = useState<Recipe[] | null>(null);
  const [searchClickMap, setSearchClickMap] = useState<Record<string, number>>({});
  const [searching, setSearching]       = useState(false);
  // Client-side click map used when no server-side data (seed recipes)
  const [localClickMap, setLocalClickMap] = useState<Record<string, number>>(baseClickMap);

  // Populate client-side click map only when server didn't provide one
  useEffect(() => {
    if (Object.keys(initialClickMap).length > 0) return;
    fetch("/api/click")
      .then((r) => r.json())
      .then(({ data }: { data?: { slug: string; clicks: number }[] }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        for (const row of data) map[row.slug] = row.clicks;
        setLocalClickMap(map);
      })
      .catch(() => {});
  }, [initialClickMap]);

  // Debounced live search against /api/recipes?q=
  const runSearch = useCallback(async (q: string) => {
    if (!q) { setSearchRecipes(null); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/recipes?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setSearchRecipes([]); return; }
      const { data } = await res.json() as { data?: DBRow[] };
      const { recipes, clickMap } = rowsToRecipes(data ?? []);
      setSearchRecipes(recipes);
      setSearchClickMap(clickMap);
    } catch {
      setSearchRecipes([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) { setSearchRecipes(null); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => runSearch(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const isSearching    = query.trim().length > 0;
  const displayed      = isSearching ? (searchRecipes ?? []) : baseRecipes;
  const displayClicks  = isSearching ? searchClickMap : localClickMap;

  return (
    <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
      <div className="flex items-center gap-4 mb-10 sm:mb-12">
        <div className="h-px flex-1 bg-rule" />
        <span className="text-xs tracking-widest uppercase text-faint font-medium">Recipes</span>
        <div className="h-px flex-1 bg-rule" />
      </div>

      {/* Search bar */}
      <div className="max-w-content mx-auto mb-8 sm:mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes"
            aria-label="Search recipes"
            className="w-full bg-lift border border-rule rounded-full px-5 py-3 text-sm text-ink placeholder-faint focus:outline-none focus:border-ink/30 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-xs transition-colors"
            >
              &times;
            </button>
          )}
        </div>

        {/* Status line */}
        <p className="text-xs text-faint mt-3 text-center h-4">
          {searching ? (
            <span className="animate-pulse">Searching\u2026</span>
          ) : isSearching ? (
            <>{ displayed.length } result{displayed.length !== 1 ? "s" : ""} for &ldquo;{query.trim()}&rdquo;</>
          ) : (
            <>{baseRecipes.length} recipe{baseRecipes.length !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>

      {/* Grid */}
      {!searching && displayed.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayed.map((recipe) => (
            <RecipeCard
              key={recipe.slug}
              recipe={recipe}
              clicks={displayClicks[recipe.slug] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Skeleton while searching */}
      {searching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-rule rounded-2xl p-4 sm:p-6 animate-pulse">
              <div className="h-3 bg-lift rounded-full w-1/3 mb-4" />
              <div className="h-4 bg-lift rounded-full w-2/3 mb-3" />
              <div className="h-3 bg-lift rounded-full w-full mb-2" />
              <div className="h-3 bg-lift rounded-full w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!searching && displayed.length === 0 && (
        <div className="text-center py-20">
          {isSearching ? (
            <>
              <p className="text-sm text-muted mb-2">
                No recipes found for &ldquo;{query.trim()}&rdquo;.
              </p>
              <a href="/submit" className="text-sm text-ink underline underline-offset-2">
                Submit one
              </a>
            </>
          ) : (
            <>
              <p className="text-sm text-muted mb-2">No recipes yet.</p>
              <a href="/submit" className="text-sm text-ink underline underline-offset-2">
                Be the first to submit one
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
