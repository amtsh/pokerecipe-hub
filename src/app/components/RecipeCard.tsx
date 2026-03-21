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
    <article className="flex flex-col bg-white dark:bg-darkSurface rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden border border-rule/60 dark:border-darkBorder hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_6px_32px_rgba(0,0,0,0.6)] transition-shadow duration-200">

      {/* Image + title — link directly to poke.com */}
      <a href={pokeUrl} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative px-3 pt-3 pb-7 bg-white dark:bg-darkSurface">
          {recipe.featured && (
            <span className="absolute top-5 left-5 z-10 text-[0.55rem] tracking-widest uppercase font-bold bg-ink/85 dark:bg-white/90 text-white dark:text-ink backdrop-blur-sm px-2 py-0.5 rounded-full">
              &#9733; Featured
            </span>
          )}
          <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-lift dark:bg-darkInput">
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
        </div>
        <div className="px-4 -mt-1 mb-1.5">
          <h3 className="text-sm font-semibold text-ink dark:text-white leading-snug">
            {recipe.name}
          </h3>
        </div>
      </a>

      {/* Description + footer */}
      <div className="flex flex-col flex-1 px-4 pb-4">
        {recipe.description && (
          <p className="text-xs text-muted dark:text-darkMuted leading-relaxed mb-4 line-clamp-2">
            {recipe.description}
          </p>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-rule dark:border-darkBorder mt-auto">
          {/* Category + view count */}
          <div className="flex items-center gap-2 min-w-0">
            {recipe.category && (
              <span className="text-[0.6rem] tracking-widest uppercase font-medium text-faint dark:text-darkFaint border border-rule dark:border-darkBorder px-2 py-0.5 rounded-full shrink-0">
                {recipe.category}
              </span>
            )}
            {localClicks > 0 && (
              <span className="text-xs text-faint dark:text-darkFaint shrink-0">
                {localClicks.toLocaleString()} views
              </span>
            )}
          </div>
          {/* CTA */}
          <a
            href={pokeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleViewRecipe}
            className="shrink-0 ml-3 text-xs font-medium bg-ink text-white dark:bg-white dark:text-ink px-3 sm:px-4 py-2 rounded-full hover:opacity-75 transition-opacity"
          >
            View Recipe
          </a>
        </div>
      </div>
    </article>
  );
}
