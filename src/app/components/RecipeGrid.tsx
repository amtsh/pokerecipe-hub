"use client";

import { useState, useMemo, useEffect } from "react";
import RecipeCard, { type Recipe } from "./RecipeCard";

const SAMPLE_RECIPES: Recipe[] = [
  { id: "1", name: "Morning News Brief",   slug: "morning-news-brief",  author: "community", tags: ["News", "Daily"],         description: "A curated 5-bullet summary of top headlines across tech, world news, and markets. Runs every morning at 8 AM." },
  { id: "2", name: "Inbox Zero",            slug: "inbox-zero",           author: "community", tags: ["Email", "Productivity"], description: "Triages your emails, flags what matters, drafts replies for common threads, and archives the noise automatically." },
  { id: "3", name: "Weekly Retrospective", slug: "weekly-retrospective",  author: "community", tags: ["Reflection", "Weekly"],  description: "Every Friday, pulls your calendar, completed tasks, and email threads into a concise weekly reflection and next-week plan." },
  { id: "4", name: "Travel Companion",     slug: "travel-companion",      author: "community", tags: ["Travel", "Automation"],  description: "Watches for flight confirmations and hotel bookings, builds a trip timeline, and sends day-of reminders with check-in links." },
  { id: "5", name: "Finance Pulse",        slug: "finance-pulse",         author: "community", tags: ["Finance", "Weekly"],     description: "Monitors spending receipts and bank alerts, categorises transactions, and delivers a weekly financial health snapshot." },
  { id: "6", name: "Meeting Prep",         slug: "meeting-prep",          author: "community", tags: ["Calendar", "Meetings"],  description: "30 minutes before each calendar event, compiles relevant emails, notes, and thread context so you walk in prepared." },
];

interface RecipeGridProps {
  initialRecipes?: Recipe[];
  /** Click map keyed by slug */
  initialClickMap?: Record<string, number>;
}

export default function RecipeGrid({
  initialRecipes = [],
  initialClickMap = {},
}: RecipeGridProps) {
  const baseRecipes = initialRecipes.length > 0 ? initialRecipes : SAMPLE_RECIPES;
  const [query, setQuery]       = useState("");
  const [clickMap, setClickMap] = useState<Record<string, number>>(initialClickMap);

  useEffect(() => {
    if (Object.keys(initialClickMap).length > 0) return;
    fetch("/api/click")
      .then((r) => r.json())
      .then(({ data }: { data?: { slug: string; clicks: number }[] }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        for (const row of data) map[row.slug] = row.clicks;
        setClickMap(map);
      })
      .catch(() => {});
  }, [initialClickMap]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return baseRecipes;
    return baseRecipes.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query, baseRecipes]);

  return (
    <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
      <div className="flex items-center gap-4 mb-10 sm:mb-12">
        <div className="h-px flex-1 bg-rule" />
        <span className="text-xs tracking-widest uppercase text-faint font-medium">Recipes</span>
        <div className="h-px flex-1 bg-rule" />
      </div>

      <div className="max-w-content mx-auto mb-8 sm:mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, tag, or keyword"
            className="w-full bg-lift border border-rule rounded-full px-5 py-3 text-sm text-ink placeholder-faint focus:outline-none focus:border-ink/30 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-xs transition-colors"
            >
              &times;
            </button>
          )}
        </div>
        <p className="text-xs text-faint mt-3 text-center">
          {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              clicks={clickMap[recipe.slug] ?? 0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-sm text-muted mb-2">No recipes match &ldquo;{query}&rdquo;.</p>
          <a href="/submit" className="text-sm text-ink underline underline-offset-2">Submit the first one</a>
        </div>
      )}
    </section>
  );
}
