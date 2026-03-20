"use client";

import { useState, useMemo } from "react";
import RecipeCard, { type Recipe } from "./RecipeCard";

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "1",
    name: "Morning News Brief",
    description: "A curated 5-bullet summary of top headlines across tech, world news, and markets. Runs every morning at 8 AM.",
    slug: "morning-news-brief",
    author: "community",
    tags: ["News", "Daily"],
  },
  {
    id: "2",
    name: "Inbox Zero",
    description: "Triages your emails, flags what matters, drafts replies for common threads, and archives the noise automatically.",
    slug: "inbox-zero",
    author: "community",
    tags: ["Email", "Productivity"],
  },
  {
    id: "3",
    name: "Weekly Retrospective",
    description: "Every Friday, pulls your calendar, completed tasks, and email threads into a concise weekly reflection and next-week plan.",
    slug: "weekly-retrospective",
    author: "community",
    tags: ["Reflection", "Weekly"],
  },
  {
    id: "4",
    name: "Travel Companion",
    description: "Watches for flight confirmations and hotel bookings, builds a trip timeline, and sends day-of reminders with check-in links.",
    slug: "travel-companion",
    author: "community",
    tags: ["Travel", "Automation"],
  },
  {
    id: "5",
    name: "Finance Pulse",
    description: "Monitors spending receipts and bank alerts, categorises transactions, and delivers a weekly financial health snapshot.",
    slug: "finance-pulse",
    author: "community",
    tags: ["Finance", "Weekly"],
  },
  {
    id: "6",
    name: "Meeting Prep",
    description: "30 minutes before each calendar event, compiles relevant emails, notes, and thread context so you walk in prepared.",
    slug: "meeting-prep",
    author: "community",
    tags: ["Calendar", "Meetings"],
  },
];

export default function RecipeGrid() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SAMPLE_RECIPES;
    return SAMPLE_RECIPES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <section id="browse" className="max-w-wide mx-auto px-6 pb-32">
      <div className="flex items-center gap-4 mb-12">
        <div className="h-px flex-1 bg-rule" />
        <span className="text-xs tracking-widest uppercase text-faint font-medium">Recipes</span>
        <div className="h-px flex-1 bg-rule" />
      </div>

      <div className="max-w-content mx-auto mb-12">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, tag, or keyword…"
            className="w-full bg-lift border border-rule rounded-full px-5 py-3 text-sm text-ink placeholder-faint focus:outline-none focus:border-ink/30 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-faint hover:text-muted text-xs transition-colors">
              ✕
            </button>
          )}
        </div>
        <p className="text-xs text-faint mt-3 text-center">
          {filtered.length} recipe{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <p className="text-sm text-muted mb-2">No recipes match &ldquo;{query}&rdquo;.</p>
          <a href="/submit" className="text-sm text-ink underline underline-offset-2">Submit the first one</a>
        </div>
      )}
    </section>
  );
}
