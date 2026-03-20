"use client";

import { useState } from "react";

export interface Recipe {
  id: string;
  name: string;
  description: string;
  slug: string;
  author: string;
  tags: string[];
}

export default function RecipeCard({ recipe, clicks = 0 }: { recipe: Recipe; clicks?: number }) {
  const pokeUrl = `https://poke.com/r/${recipe.slug}`;
  const [localClicks, setLocalClicks] = useState(clicks);
  const [tracking, setTracking]       = useState(false);

  async function handleAddToPoke() {
    if (tracking) return;
    setTracking(true);
    setLocalClicks((n) => n + 1);
    try {
      await fetch("/api/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: recipe.slug }),
      });
    } catch { /* non-critical */ }
    finally { setTracking(false); }
  }

  return (
    <article className="group flex flex-col border border-rule rounded-2xl p-6 bg-canvas hover:border-ink/20 hover:shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-all duration-200">
      <div className="flex flex-wrap gap-1.5 mb-4">
        {recipe.tags.map((tag) => (
          <span key={tag} className="text-[0.65rem] tracking-widest uppercase font-medium text-faint border border-rule px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>

      <h3 className="text-[0.95rem] font-semibold text-ink leading-snug mb-2">{recipe.name}</h3>
      <p className="text-sm text-muted leading-relaxed flex-1 mb-6">{recipe.description}</p>

      <div className="flex items-center justify-between pt-4 border-t border-rule">
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">by {recipe.author}</span>
          {localClicks > 0 && (
            <span className="text-xs text-faint">
              {localClicks.toLocaleString()} add{localClicks !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <a
          href={pokeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAddToPoke}
          className="text-xs font-medium bg-ink text-white px-4 py-1.5 rounded-full hover:bg-muted transition-colors"
        >
          Add to Poke
        </a>
      </div>
    </article>
  );
}
