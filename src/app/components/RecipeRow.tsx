"use client";

import { useState, useEffect, useRef } from "react";
import type { Recipe } from "./RecipeCard";

/** Category → monogram background + text colour (shown while / if OG image fails). */
const CATEGORY_MONO: Record<string, string> = {
  Developer:     "bg-violet-50  dark:bg-violet-950/60  text-violet-600 dark:text-violet-300",
  Travel:        "bg-sky-50     dark:bg-sky-950/60     text-sky-600    dark:text-sky-300",
  Productivity:  "bg-orange-50  dark:bg-orange-950/60  text-orange-600 dark:text-orange-300",
  Finance:       "bg-green-50   dark:bg-green-950/60   text-green-600  dark:text-green-300",
  Entertainment: "bg-pink-50    dark:bg-pink-950/60    text-pink-600   dark:text-pink-300",
  Health:        "bg-red-50     dark:bg-red-950/60     text-red-600    dark:text-red-300",
  Outdoors:      "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300",
  Fun:           "bg-amber-50   dark:bg-amber-950/60   text-amber-600  dark:text-amber-300",
};
const MONO_DEFAULT = "bg-lift dark:bg-darkInput text-muted dark:text-darkMuted";

export default function RecipeRow({
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
  const [imgLoaded, setImgLoaded]     = useState(false);
  const [imgError, setImgError]       = useState(false);
  const imgRef                        = useRef<HTMLImageElement>(null);

  // Hydration race fix — same pattern as RecipeCard
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    if (el.complete) {
      if (el.naturalWidth > 0) setImgLoaded(true);
      else setImgError(true);
    }
  }, []);

  async function handleClick() {
    if (tracking) return;
    setTracking(true);
    setLocalClicks((n) => n + 1);
    try {
      const res = await fetch("/api/click", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug: recipe.slug }),
      });
      if (!res.ok) setLocalClicks((n) => Math.max(0, n - 1));
    } catch {
      setLocalClicks((n) => Math.max(0, n - 1));
    } finally {
      setTracking(false);
    }
  }

  const monoClass = CATEGORY_MONO[recipe.category ?? ""] ?? MONO_DEFAULT;

  return (
    <article className="flex items-center gap-3.5 px-4 py-3 group hover:bg-black/[0.02] dark:hover:bg-white/[0.025] transition-colors duration-100">

      {/* Thumbnail / monogram — links to poke.com without incrementing click counter */}
      <a
        href={pokeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 block"
        tabIndex={-1}
        aria-hidden
      >
        <div className="w-[42px] h-[42px] rounded-[10px] overflow-hidden relative shadow-[0_1px_4px_rgba(0,0,0,0.10)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
          {/* Category-coloured monogram — visible until OG image loads */}
          <div className={`absolute inset-0 flex items-center justify-center select-none text-base font-bold ${monoClass}`}
            aria-hidden>
            {recipe.name.charAt(0).toUpperCase()}
          </div>
          {/* OG image fades in once loaded */}
          {!imgError && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={ogImgUrl}
              alt=""
              aria-hidden
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                imgLoaded ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
          )}
        </div>
      </a>

      {/* Main content — the primary tap target; opens poke.com and tracks the click */}
      <a
        href={pokeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="flex-1 min-w-0 block py-0.5"
      >
        <p className="text-sm font-semibold text-ink dark:text-white leading-snug truncate">
          {recipe.featured && (
            <span className="mr-1.5 text-[0.55rem] align-middle tracking-widest uppercase font-bold text-faint dark:text-darkFaint">
              &#9733;
            </span>
          )}
          {recipe.name}
        </p>
        {recipe.description && (
          <p className="text-xs text-muted dark:text-darkMuted leading-relaxed truncate mt-0.5">
            {recipe.description}
          </p>
        )}
      </a>

      {/* Right meta: category + views (hidden on mobile) + chevron */}
      <div className="shrink-0 flex items-center gap-2">
        <div className="hidden sm:flex flex-col items-end gap-0.5">
          {recipe.category && (
            <span className="text-[0.6rem] tracking-widest uppercase font-medium text-faint dark:text-darkFaint">
              {recipe.category}
            </span>
          )}
          {localClicks > 0 && (
            <span className="text-[0.6rem] text-faint dark:text-darkFaint">
              {localClicks.toLocaleString()}\u00a0views
            </span>
          )}
        </div>
        {/* Chevron */}
        <svg
          className="w-3.5 h-3.5 text-muted/25 dark:text-white/20 shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M7 5l5 5-5 5" />
        </svg>
      </div>

    </article>
  );
}
