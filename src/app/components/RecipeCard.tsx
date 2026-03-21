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

type ImageState = "loading" | "loaded" | "error";

export default function RecipeCard({
  recipe,
  clicks = 0,
}: {
  recipe: Recipe;
  clicks?: number;
}) {
  const pokeUrl  = `https://poke.com/r/${recipe.slug}`;
  const ogImgUrl = `https://poke.com/api/og/recipe?slug=${recipe.slug}`;

  const [localClicks, setLocalClicks] = useState(clicks);
  const [tracking, setTracking]       = useState(false);
  const [imgState, setImgState]       = useState<ImageState>("loading");

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
    <article className="group flex flex-col border border-rule dark:border-darkBorder rounded-2xl overflow-hidden bg-canvas dark:bg-darkSurface hover:border-ink/20 dark:hover:border-white/10 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_28px_rgba(0,0,0,0.5)] transition-all duration-200">

      {/* ── OG image area ─────────────────────────────────────────── */}
      <div className="relative w-full aspect-video bg-lift dark:bg-darkInput overflow-hidden">
        {/* Skeleton shimmer — visible while loading or on error */}
        {imgState !== "loaded" && (
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            {imgState === "loading" && (
              <>
                {/* Animated shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-[shimmer_1.6s_infinite]" />
                {/* Name + description placeholder */}
                <div className="relative space-y-2">
                  <div className="h-4 bg-rule dark:bg-darkBorder rounded-full w-2/3 animate-pulse" />
                  <div className="h-3 bg-rule dark:bg-darkBorder rounded-full w-full animate-pulse" />
                  <div className="h-3 bg-rule dark:bg-darkBorder rounded-full w-4/5 animate-pulse" />
                </div>
              </>
            )}
            {imgState === "error" && (
              /* Text fallback when OG image is unavailable */
              <div className="relative p-1">
                <p className="text-sm font-semibold text-ink dark:text-white leading-snug line-clamp-2">
                  {recipe.name}
                </p>
                {recipe.description && (
                  <p className="text-xs text-muted dark:text-darkMuted mt-1 line-clamp-3 leading-relaxed">
                    {recipe.description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actual OG image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogImgUrl}
          alt={recipe.name}
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("error")}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            imgState === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Featured badge — top-left overlay */}
        {recipe.featured && (
          <span className="absolute top-3 left-3 text-[0.6rem] tracking-widest uppercase font-semibold bg-ink/80 dark:bg-white/90 text-white dark:text-ink backdrop-blur-sm px-2 py-0.5 rounded-full">
            &#9733; Featured
          </span>
        )}
      </div>

      {/* ── Card body ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Name */}
        <h3 className="text-sm font-semibold text-ink dark:text-white leading-snug mb-1.5">
          {recipe.name}
        </h3>

        {/* Description */}
        {recipe.description && (
          <p className="text-xs text-muted dark:text-darkMuted leading-relaxed flex-1 mb-4 line-clamp-3">
            {recipe.description}
          </p>
        )}

        {/* ── Footer row ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3.5 border-t border-rule dark:border-darkBorder mt-auto">
          {/* Attribution */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[0.65rem] text-faint dark:text-darkFaint truncate">
              by {recipe.author}
            </span>
            {localClicks > 0 && (
              <span className="text-[0.65rem] text-faint dark:text-darkFaint">
                {localClicks.toLocaleString()} add{localClicks !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* CTA */}
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
      </div>
    </article>
  );
}
