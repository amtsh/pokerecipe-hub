"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RecipeCard, { type Recipe } from "./RecipeCard";
import RecipeRow from "./RecipeRow";

const PAGE_SIZE = 12;
const SORT      = "popular";

interface DBRow {
  slug: string;
  name: string;
  description: string;
  clicks: number;
  featured: boolean;
  category: string | null;
}

function rowsToRecipes(rows: DBRow[]) {
  const recipes: Recipe[] = rows.map((r, i) => ({
    id:          String(i + 1),
    name:        r.name        || r.slug,
    description: r.description || "",
    slug:        r.slug,
    author:      "",
    tags:        [],
    featured:    r.featured   ?? false,
    category:    r.category   ?? undefined,
  }));
  const clickMap: Record<string, number> = {};
  for (const r of rows) clickMap[r.slug] = r.clicks ?? 0;
  return { recipes, clickMap };
}

interface RecipeGridProps {
  initialRecipes?:  Recipe[];
  initialClickMap?: Record<string, number>;
  initialCategory?: string | null;
  initialView?:     "grid" | "list";
}

export default function RecipeGrid({
  initialRecipes  = [],
  initialClickMap = {},
  initialCategory = null,
  initialView     = "grid",
}: RecipeGridProps) {
  const router = useRouter();

  const [recipes, setRecipes]         = useState<Recipe[]>(initialRecipes);
  const [clickMap, setClickMap]       = useState<Record<string, number>>(initialClickMap);
  const [offset, setOffset]           = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore]         = useState<boolean>(initialRecipes.length >= PAGE_SIZE);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [query, setQuery]                   = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory ?? null);
  const [categories, setCategories]         = useState<string[]>([]);

  // View toggle state \u2014 seeded from cookie via SSR prop to avoid layout shift
  const [view, setView]     = useState<"grid" | "list">(initialView);
  const [fading, setFading] = useState(false);
  const fadeTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFirstRender = useRef(true);
  const searchRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ categories: cats }: { categories?: string[] }) => {
        if (cats?.length) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Cancel fade timer on unmount
  useEffect(() => () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); }, []);

  async function doFetch(
    q: string,
    category: string | null,
    off: number,
    append: boolean,
  ) {
    if (append) setLoadingMore(true);
    else        setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)        params.set("q", q);
      if (category) params.set("category", category);
      params.set("sort",   SORT);
      params.set("limit",  String(PAGE_SIZE));
      params.set("offset", String(off));

      const res = await fetch(`/api/recipes?${params}`);
      if (!res.ok) { if (!append) setRecipes([]); return; }
      const { data } = await res.json() as { data?: DBRow[] };
      const rows = data ?? [];
      const { recipes: newRecs, clickMap: newMap } = rowsToRecipes(rows);

      if (append) {
        setRecipes((prev) => [...prev, ...newRecs]);
        setClickMap((prev) => ({ ...prev, ...newMap }));
      } else {
        setRecipes(newRecs);
        setClickMap(newMap);
      }
      setOffset(off + rows.length);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      if (!append) setRecipes([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setOffset(0);
    setHasMore(true);
    const trimmed = query.trim();
    const timer = setTimeout(() => doFetch(trimmed, activeCategory, 0, false), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  function handleLoadMore() {
    doFetch(query.trim(), activeCategory, offset, true);
  }

  function handleCategory(cat: string | null) {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    if (next) {
      router.replace(`/?category=${encodeURIComponent(next)}`, { scroll: false });
    } else {
      router.replace("/", { scroll: false });
    }
  }

  /** Switch view with a 150ms cross-fade. Persists to cookie so the server
   *  can server-render the correct layout on next load (no CLS). */
  function handleToggleView(newView: "grid" | "list") {
    if (newView === view) return;
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFading(true);
    fadeTimer.current = setTimeout(() => {
      setView(newView);
      setFading(false);
      document.cookie = `recipe_view=${newView};path=/;max-age=31536000;samesite=lax`;
    }, 150);
  }

  function clearFilters() {
    setQuery("");
    setActiveCategory(null);
    router.replace("/", { scroll: false });
  }

  const isFiltered = query.trim().length > 0 || !!activeCategory;

  // active:scale-[0.95] on pills for tactile press feedback (75ms \u2014 fast enough
  // to feel immediate, not so fast it clips the hover color transition)
  const pillBase     = "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 active:scale-[0.95] whitespace-nowrap";
  const pillActive   = "bg-ink text-white dark:bg-white dark:text-ink";
  const pillInactive = "text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white";

  return (
    <>
      <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pt-4 pb-52 sm:pb-56">

        {/* Section header: results count + view toggle */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 h-7">
          {/* Results label \u2014 shown only when filtering */}
          <span className="text-xs text-faint dark:text-darkFaint">
            {isFiltered && !loading
              ? (
                <>
                  {recipes.length} result{recipes.length !== 1 ? "s" : ""}
                  {query.trim() ? <> for \u201c{query.trim()}\u201d</> : null}
                  {activeCategory && !query.trim() ? <> in {activeCategory}</> : null}
                </>
              )
              : null}
          </span>

          {/* Segmented view toggle
              The SVG key changes on every view switch, causing React to remount
              just the SVG element. When the new icon is the active one it
              receives the iconPopIn animation via inline style, giving it the
              spring pop-in from globals.css. The inactive icon remounts without
              animation \u2014 only the incoming active icon animates. */}
          <div
            className="flex items-center gap-0.5 bg-lift dark:bg-darkInput rounded-[8px] p-[3px]"
            role="group"
            aria-label="Recipe view"
          >
            {/* Grid button */}
            <button
              onClick={() => handleToggleView("grid")}
              title="Grid view"
              aria-pressed={view === "grid"}
              className={`p-1.5 rounded-[5px] transition-all duration-150 ${
                view === "grid"
                  ? "bg-white dark:bg-[#2a2a2a] text-ink dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                  : "text-muted/50 dark:text-white/30 hover:text-muted dark:hover:text-white/60"
              }`}
            >
              <svg
                key={`grid-${view}`}
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-[15px] h-[15px]"
                style={view === "grid" ? { animation: "iconPopIn 200ms cubic-bezier(0.34,1.56,0.64,1) both" } : undefined}
                aria-hidden
              >
                <rect x="1" y="1" width="6" height="6" rx="1.25" />
                <rect x="9" y="1" width="6" height="6" rx="1.25" />
                <rect x="1" y="9" width="6" height="6" rx="1.25" />
                <rect x="9" y="9" width="6" height="6" rx="1.25" />
              </svg>
            </button>

            {/* List button */}
            <button
              onClick={() => handleToggleView("list")}
              title="List view"
              aria-pressed={view === "list"}
              className={`p-1.5 rounded-[5px] transition-all duration-150 ${
                view === "list"
                  ? "bg-white dark:bg-[#2a2a2a] text-ink dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                  : "text-muted/50 dark:text-white/30 hover:text-muted dark:hover:text-white/60"
              }`}
            >
              <svg
                key={`list-${view}`}
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-[15px] h-[15px]"
                style={view === "list" ? { animation: "iconPopIn 200ms cubic-bezier(0.34,1.56,0.64,1) both" } : undefined}
                aria-hidden
              >
                <rect x="1" y="2"   width="4" height="4"   rx="0.8" />
                <rect x="7" y="3.5" width="8" height="1.5" rx="0.75" />
                <rect x="1" y="7"   width="4" height="4"   rx="0.8" />
                <rect x="7" y="8.5" width="8" height="1.5" rx="0.75" />
                <rect x="1" y="12"  width="4" height="2.5" rx="0.8" />
                <rect x="7" y="13"  width="8" height="1.5" rx="0.75" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area \u2014 fades when switching views */}
        <div className={`transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}>

          {/* \u2500 Grid view \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          {view === "grid" && (
            <>
              {!loading && recipes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
                  {recipes.map((recipe) => (
                    <RecipeCard key={recipe.slug} recipe={recipe} clicks={clickMap[recipe.slug] ?? 0} />
                  ))}
                </div>
              )}
              {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-video w-full rounded-2xl sm:rounded-3xl bg-lift dark:bg-darkInput mb-3" />
                      <div className="h-3.5 bg-lift dark:bg-darkInput rounded-full w-2/3 mb-2" />
                      <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-full mb-1.5" />
                      <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-4/5" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* \u2500 List view \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          {view === "list" && (
            <>
              {!loading && recipes.length > 0 && (
                <div className="border border-rule dark:border-darkBorder rounded-2xl overflow-hidden divide-y divide-rule dark:divide-darkBorder">
                  {recipes.map((recipe) => (
                    <RecipeRow key={recipe.slug} recipe={recipe} clicks={clickMap[recipe.slug] ?? 0} />
                  ))}
                </div>
              )}
              {loading && (
                <div className="border border-rule dark:border-darkBorder rounded-2xl overflow-hidden divide-y divide-rule dark:divide-darkBorder">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3.5 px-4 py-3 animate-pulse">
                      <div className="w-[42px] h-[42px] rounded-[12px] bg-lift dark:bg-darkInput shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-2/5" />
                        <div className="h-2.5 bg-lift dark:bg-darkInput rounded-full w-3/4" />
                      </div>
                      <div className="w-3 h-3 bg-lift dark:bg-darkInput rounded-full shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* \u2500 Polished empty state (shared across grid + list) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          {!loading && recipes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              {/* Branded \u201cp\u201d monogram in a lift box \u2014 same visual language as the
                  RecipeCard image error placeholder, making the empty state feel
                  deliberate rather than broken. translateY(2px) compensates for the
                  descender so the letter reads as optically centered. */}
              <div className="w-16 h-16 rounded-2xl bg-lift dark:bg-darkInput flex items-center justify-center mb-5">
                <span
                  className="text-3xl font-semibold select-none text-muted/30 dark:text-white/15"
                  style={{ transform: "translateY(2px)" }}
                  aria-hidden
                >
                  p
                </span>
              </div>

              <p className="text-sm font-semibold tracking-tight text-ink dark:text-white mb-1.5">
                {isFiltered ? "Nothing here yet" : "No recipes yet"}
              </p>

              <p className="text-xs text-muted dark:text-darkMuted mb-6 max-w-[210px] leading-relaxed">
                {isFiltered
                  ? "Try a different category or clear the search"
                  : "Be the first to share a Poke automation recipe"}
              </p>

              {isFiltered ? (
                // Clear-filters action when search/category yields nothing
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-muted dark:text-darkMuted bg-lift dark:bg-darkInput px-4 py-2 rounded-full hover:text-ink dark:hover:text-white hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-[0.96] transition-all duration-75"
                >
                  Clear filters
                </button>
              ) : (
                // Pill CTA for the genuinely empty state
                <a
                  href="/submit"
                  className="text-xs font-medium text-white bg-ink dark:text-ink dark:bg-white hover:opacity-80 active:scale-[0.96] px-4 py-2 rounded-full transition-all duration-75"
                >
                  Add the first recipe \u2192
                </a>
              )}
            </div>
          )}

        </div>{/* /fade wrapper */}

        {/* Load more \u2014 active:scale-[0.96] for press feedback */}
        {!loading && hasMore && recipes.length > 0 && (
          <div className="flex justify-center mt-16 sm:mt-20">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs font-medium text-ink/50 dark:text-white/50 hover:text-ink dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] px-6 py-2.5 rounded-full active:scale-[0.96] transition-all duration-75 disabled:opacity-40"
            >
              {loadingMore ? "Loading\u2026" : "Load More"}
            </button>
          </div>
        )}

      </section>

      {/* Floating pill */}
      <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto bg-white/85 dark:bg-[#0a0a0a]/85 backdrop-blur-xl rounded-full ring-1 ring-black/[0.07] dark:ring-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.55)] flex items-center gap-2 px-3 py-2">

          {/* Search */}
          <div className="relative shrink-0">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/40 dark:text-white/40 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search recipes"
              className="w-[120px] focus:w-[190px] sm:focus:w-[220px] transition-[width] duration-200 ease-out bg-black/[0.05] dark:bg-white/[0.08] text-ink dark:text-white text-xs rounded-full pl-7 pr-2 py-1.5 focus:outline-none focus:bg-black/[0.08] dark:focus:bg-white/[0.11] placeholder:text-black/40 dark:placeholder:text-white/40"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); searchRef.current?.blur(); }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-muted text-[10px] leading-none"
              >
                &times;
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <button
              onClick={() => handleCategory(null)}
              className={`${pillBase} ${!activeCategory ? pillActive : pillInactive}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`${pillBase} ${activeCategory === cat ? pillActive : pillInactive}`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
