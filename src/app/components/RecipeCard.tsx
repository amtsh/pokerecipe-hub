"use client";

import { useState } from "react";

export interface Recipe {
  id: string;
  name: string;
  description: string;
  slug: string;
  author: string;
  tags: string[];
  featured?: boolean;
}

export default function RecipeCard({
  recipe,
  clicks = 0,
}: {
  recipe: Recipe;
  clicks?: number;
}) {
  const pokeUrl = `https://poke.com/r/${recipe.slug}`;
  const [localClicks, setLocalClicks] = useState(clicks);
  const [tracking, setTracking]       = useState(false);

  async function handleAddToPoke() {
    if (tracking) return;
    setTracking(true);
    setLocalClicks((n) => n + 1);
    try {
      const res = await fetch("/api/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: recipe.slug }),
      });
      if (!res.ok) setLocalClicks((n) => Math.max(0, n - 1));
    } catch {
      setLocalClicks((n) => Math.max(0, n - 1));
    } finally {
      setTracking(false);
    }
  }

  return (
    <article className="group flex flex-col border border-rule dark:border-darkBorder rounded-2xl p-4 sm:p-6 bg-canvas dark:bg-darkSurface hover:border-ink/20 dark:hover:border-white/10 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_20px_rgba(0,0,0,0.4)] transition-all duration-200">

      {/* Featured badge + tags row */}
      {(recipe.featured || recipe.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 sm:mb-4">
          {recipe.featured && (
            <span className="text-[0.6rem] tracking-widest uppercase font-semibold text-ink dark:text-white border border-ink/30 dark:border-white/30 px-2 py-0.5 rounded-full">
              &#9733; Featured
            </span>
          )}
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-[0.6rem] tracking-widest uppercase font-medium text-faint dark:text-darkFaint border border-rule dark:border-darkBorder px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-ink dark:text-white leading-snug mb-2">
        {recipe.name}
      </h3>
      <p className="text-sm text-muted dark:text-darkMuted leading-relaxed flex-1 mb-5">
        {recipe.description}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-rule dark:border-darkBorder">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xs text-faint dark:text-darkFaint truncate">by {recipe.author}</span>
          {localClicks > 0 && (
            <span className="text-xs text-faint dark:text-darkFaint shrink-0">
              {localClicks.toLocaleString()} add{localClicks !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <a
          href={pokeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAddToPoke}
          className="shrink-0 ml-3 text-xs font-medium bg-ink text-white dark:bg-white dark:text-ink px-3 sm:px-4 py-2 rounded-full hover:opacity-75 transition-opacity"
        >
          Add to Poke
        </a>
      </div>
    </article>
  );
}
