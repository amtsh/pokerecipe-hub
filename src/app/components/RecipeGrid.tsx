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

  // Controls whether the floating bar is in “search input” mode or “pill” mode
  const [searchOpen, setSearchOpen] = useState(false);

  // View toggle state — seeded from cookie via SSR prop to avoid layout shift
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
    // Scroll to the top of the page so the recipe results are in view
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  /** Open the search input inside the floating bar and focus it. */
  function openSearch() {
    setSearchOpen(true);
    // Defer focus so the input has mounted / transitioned in
    setTimeout(() => searchRef.current?.focus(), 30);
  }

  /** Close the search input, clearing the query and returning to pill mode. */
  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
    searchRef.current?.blur();
  }

  function clearFilters() {
    setQuery("");
    setActiveCategory(null);
    setSearchOpen(false);
    router.replace("/", { scroll: false });
  }

  const isFiltered = query.trim().length > 0 || !!activeCategory;

  // active:scale-[0.95] on pills for tactile press feedback
  const pillBase     = "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 active:scale-[0.95] whitespace-nowrap";
  const pillActive   = "bg-ink text-white dark:bg-white dark:text-ink";
  const pillInactive = "text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white";

  return (
    <>
      <section id="browse" className="max-w-wide mx-auto px-4 sm:px-6 pt-4 pb-52 sm:pb-56">

        {/* Section header: results count + view toggle */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 h-7">
          {/* Results label — shown only when filtering */}
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

          {/* Segmented view toggle */}
          <div
            className="flex items-center gap-0.5 bg-lift dark:bg-darkInput rounded-[8px] p-[3px]"
            role="group"
            aria-label="Recipe view"
          >
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

        {/* Content area — fades when switching views */}
        <div className={`transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}>

          {/* ─ Grid view ───────────────────────────────────────── */}
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

          {/* ─ List view ───────────────────────────────────────── */}
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

          {/* ─ Polished empty state (shared across grid + list) ────────────────── */}
          {!loading && recipes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
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
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-muted dark:text-darkMuted bg-lift dark:bg-darkInput px-4 py-2 rounded-full hover:text-ink dark:hover:text-white hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-[0.96] transition-all duration-75"
                >
                  Clear filters
                </button>
              ) : (
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

        {/* Load more */}
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
        <div className="w-full max-w-2xl pointer-events-auto bg-white/85 dark:bg-[#0a0a0a]/85 backdrop-blur-xl rounded-full ring-1 ring-black/[0.07] dark:ring-white/[0.07] shadow-[0_8px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.55)] flex items-center px-3 py-2 overflow-hidden">

          {searchOpen ? (
            // ─ Search input mode: fills the entire bar ─────────────────────────
            // The bar becomes a clean single-purpose search field.
            // The × button clears the query and returns to pill mode.
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg
                className="w-3 h-3 text-black/40 dark:text-white/40 shrink-0"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="22" y2="22" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search recipes"
                aria-label="Search recipes"
                className="flex-1 min-w-0 bg-transparent text-ink dark:text-white text-xs focus:outline-none placeholder:text-black/35 dark:placeholder:text-white/35"
              />
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-black/[0.07] dark:bg-white/[0.12] text-black/50 dark:text-white/50 hover:bg-black/[0.12] dark:hover:bg-white/[0.2] hover:text-ink dark:hover:text-white text-[11px] leading-none transition-all duration-100 active:scale-90"
                aria-label="Close search"
              >
                &times;
              </button>
            </div>
          ) : (
            // ─ Pill mode: Search trigger pill + scrollable categories ──────────
            // Search is the first pill in the row, visually grouped with
            // the categories. Clicking it opens the search input above.
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">

              {/* Search trigger pill */}
              <button
                onClick={openSearch}
                aria-label="Open search"
                className={`${pillBase} ${pillInactive} flex items-center gap-1.5`}
              >
                <svg
                  className="w-3 h-3 shrink-0"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="22" y2="22" />
                </svg>
                Search
              </button>

              {/* Thin divider between search and category filters */}
              <div className="w-px h-3 bg-black/[0.12] dark:bg-white/[0.12] shrink-0" aria-hidden />

              {/* Category pills */}
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
          )}

        </div>
      </div>
    </>
  );
}
