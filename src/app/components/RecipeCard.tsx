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
  category?: string;
}

type ImageState = "loading" | "loaded" | "error";

export default function RecipeCard({
  recipe,
  clicks = 0,
}: {
  recipe: Recipe;
  clicks?: number;
}) {
  const pokeUrl  = `https://poke.com/r/${recipe.slug}`;
  const ogImgUrl = `https://poke.com/r/${recipe.slug}/opengraph-image`;

  const [localClicks, setLocalClicks] = useState(clicks);
  const [tracking, setTracking]       = useState(false);
  const [imgState, setImgState]       = useState<ImageState>("loading");

  async function handleViewRecipe() {
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
    <article className="hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200 ease-out">
      {/* Image — floats directly on the canvas, no border or shadow */}
      <a href={pokeUrl} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-lift dark:bg-darkInput mb-3">
          {recipe.featured && (
            <span className="absolute top-3 left-3 z-10 text-[0.55rem] tracking-widest uppercase font-bold bg-ink/80 dark:bg-white/90 text-white dark:text-ink backdrop-blur-sm px-2 py-0.5 rounded-full">
              &#9733; Featured
            </span>
          )}
          {imgState === "loading" && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-lift dark:bg-darkInput" />
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite]"
                style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)" }}
              />
            </div>
          )}
          {imgState === "error" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-semibold select-none" style={{ color: "#e8e8e8" }} aria-hidden>p</span>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogImgUrl}
            alt={recipe.name}
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("error")}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              imgState === "loaded" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-ink dark:text-white leading-snug mb-1">
          {recipe.name}
        </h3>
      </a>

      {/* Caption */}
      {recipe.description && (
        <p className="text-xs text-muted dark:text-darkMuted leading-relaxed mb-3 line-clamp-2">
          {recipe.description}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {recipe.category && (
            <span className="text-[0.6rem] tracking-[0.12em] uppercase font-medium text-faint dark:text-darkFaint">
              {recipe.category}
            </span>
          )}
          {localClicks > 0 && (
            <span className="text-[0.65rem] text-faint dark:text-darkFaint">
              {localClicks.toLocaleString()} views
            </span>
          )}
        </div>
        <a
          href={pokeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleViewRecipe}
          className="shrink-0 text-[0.7rem] font-medium text-ink/50 dark:text-white/50 bg-black/[0.05] dark:bg-white/[0.08] hover:bg-ink hover:text-white dark:hover:bg-white dark:hover:text-ink px-3 py-1.5 rounded-full transition-all duration-150"
        >
          View
        </a>
      </div>
    </article>
  );
}
