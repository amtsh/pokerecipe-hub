"use client";

import { useState, useEffect, useRef } from "react";

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
  const imgRef                        = useRef<HTMLImageElement>(null);

  /**
   * Hydration race fix: the browser can finish loading the <img> before React
   * attaches the onLoad/onError handlers (especially on fast connections or
   * cached images). After mount, if the image already completed, fast-forward
   * imgState so the shimmer is cleared immediately.
   */
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    if (el.complete) {
      setImgState(el.naturalWidth > 0 ? "loaded" : "error");
    }
  }, []);

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
    // Press scale: 0.97 (perceptible) with fast 75ms response time
    <article className="hover:scale-[1.01] active:scale-[0.97] transition-transform duration-75 ease-out">
      {/* Image \u2014 links directly to poke.com */}
      <a href={pokeUrl} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-lift dark:bg-darkInput mb-3">
          {recipe.featured && (
            // Concentric radius: outer container is rounded-3xl (24px), badge sits at
            // top-3 left-3 (12px from corner) \u2192 inner radius = 24 - 12 = 12px = rounded-xl
            <span className="absolute top-3 left-3 z-10 text-[0.55rem] tracking-widest uppercase font-bold bg-ink/80 dark:bg-white/90 text-white dark:text-ink backdrop-blur-sm px-2 py-0.5 rounded-xl">
              &#9733; Featured
            </span>
          )}

          {/* Shimmer skeleton */}
          {imgState === "loading" && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-lift dark:bg-darkInput" />
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite]"
                style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)" }}
              />
            </div>
          )}

          {/* Branded placeholder on error */}
          {imgState === "error" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-semibold select-none" style={{ color: "#e8e8e8", transform: "translateY(2px)" }} aria-hidden>p</span>
            </div>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
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
            // tabular-nums: each digit occupies equal width so live count
            // updates don\u2019t cause horizontal layout jitter
            <span className="text-[0.65rem] text-faint dark:text-darkFaint tabular-nums">
              {localClicks.toLocaleString()} views
            </span>
          )}
        </div>
        <a
          href={pokeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleViewRecipe}
          className="shrink-0 text-[0.7rem] font-medium text-ink/50 dark:text-white/50 bg-black/[0.05] dark:bg-white/[0.08] hover:bg-ink hover:text-white dark:hover:bg-white dark:hover:text-ink px-3 py-1.5 rounded-full active:scale-[0.96] transition-all duration-75"
        >
          View
        </a>
      </div>
    </article>
  );
}
