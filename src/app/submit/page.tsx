"use client";

import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import Navbar    from "../components/Navbar";
import Footer    from "../components/Footer";
import RecipeCard from "../components/RecipeCard";

type Phase = "input" | "loading" | "confirm" | "saving" | "done";

interface ScrapedData {
  slug: string;
  name: string;
  description: string;
  canonical: string;
}

function isPokeRecipeUrl(s: string): boolean {
  return /poke\.com\/(r|refer)\//i.test(s);
}

export default function SubmitPage() {
  const [url, setUrl]         = useState("");
  const [phase, setPhase]     = useState<Phase>("input");
  const [scraped, setScraped] = useState<ScrapedData | null>(null);
  const [error, setError]     = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a poke.com/r/\u2026 or poke.com/refer/\u2026 link to continue.");
      return;
    }
    if (!isPokeRecipeUrl(trimmed)) {
      setError("That doesn\u2019t look like a poke.com recipe link.");
      return;
    }
    setPhase("loading");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.error === "string" && data.error.length < 120
          ? data.error
          : "Something went wrong. Please try again.";
        setError(msg);
        setPhase("input");
        return;
      }
      setScraped(await res.json() as ScrapedData);
      setPhase("confirm");
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("input");
    }
  }

  async function handleConfirm() {
    if (!scraped) return;
    setError("");
    setPhase("saving");
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug:        scraped.slug,
          name:        scraped.name,
          description: scraped.description,
        }),
      });
      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setPhase("confirm");
        return;
      }
      setPhase("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("confirm");
    }
  }

  function reset() {
    setUrl(""); setScraped(null); setError(""); setPhase("input");
  }

  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen bg-white dark:bg-darkBg transition-colors">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-16 sm:py-24">

          <Link
            href="/"
            className="text-xs text-faint dark:text-darkFaint hover:text-muted dark:hover:text-darkMuted transition-colors inline-block mb-10 sm:mb-12"
          >
            &larr; Back
          </Link>

          {/* ── Done ────────────────────────────────────────────────── */}
          {phase === "done" && (
            <div className="text-center py-10">
              <p className="text-sm font-medium text-ink dark:text-white mb-2">Recipe submitted.</p>
              <p className="text-xs text-muted dark:text-darkMuted mb-8">
                Thank you &mdash; it will appear after a quick review.
              </p>
              <button
                onClick={reset}
                className="text-xs text-ink dark:text-white underline underline-offset-2 hover:opacity-60 transition-opacity"
              >
                Submit another
              </button>
            </div>
          )}

          {/* ── Confirm: RecipeCard preview ────────────────────────── */}
          {phase === "confirm" && scraped && (
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-white mb-1.5">
                  Looks right?
                </h1>
                <p className="text-xs text-muted dark:text-darkMuted">
                  This is exactly how it will appear on the grid.
                </p>
              </div>

              {/* Card preview — constrained width to match grid proportions */}
              <div className="w-full max-w-[340px] sm:max-w-[380px]">
                <RecipeCard
                  recipe={{
                    id:          "preview",
                    name:        scraped.name,
                    description: scraped.description,
                    slug:        scraped.slug,
                    author:      "",
                    tags:        [],
                    featured:    false,
                  }}
                  clicks={0}
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-3 max-w-[380px]">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-ink text-white dark:bg-white dark:text-ink text-xs font-medium py-3 rounded-full hover:opacity-80 transition-opacity flex items-center justify-center"
                >
                  Submit
                </button>
                <button
                  onClick={reset}
                  className="flex-1 border border-rule dark:border-darkBorder text-xs text-muted dark:text-darkMuted py-3 rounded-full hover:border-ink/30 dark:hover:border-white/20 transition-colors"
                >
                  Start over
                </button>
              </div>
            </div>
          )}

          {/* ── Saving ──────────────────────────────────────────────── */}
          {phase === "saving" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Spinner className="h-5 w-5 text-muted dark:text-darkMuted" />
              <p className="text-xs text-muted dark:text-darkMuted">Submitting&hellip;</p>
            </div>
          )}

          {/* ── Input / Loading ───────────────────────────────────────── */}
          {(phase === "input" || phase === "loading") && (
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-white mb-2">
                  Submit a recipe
                </h1>
                <p className="text-xs text-muted dark:text-darkMuted leading-relaxed">
                  Paste a{" "}
                  <code className="font-mono bg-lift dark:bg-darkInput text-ink dark:text-white px-1.5 py-0.5 rounded">
                    poke.com/r/&hellip;
                  </code>
                  {" "}or{" "}
                  <code className="font-mono bg-lift dark:bg-darkInput text-ink dark:text-white px-1.5 py-0.5 rounded">
                    poke.com/refer/&hellip;
                  </code>
                  {" "}link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="flex items-stretch gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
                    placeholder="poke.com/r/morning-news-brief"
                    disabled={phase === "loading"}
                    className="flex-1 min-w-0 bg-white dark:bg-darkInput border border-rule dark:border-darkBorder rounded-xl px-4 py-3 text-sm text-ink dark:text-white placeholder-faint dark:placeholder-darkFaint focus:outline-none focus:border-ink/30 dark:focus:border-white/20 transition-colors disabled:opacity-50"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={phase === "loading"}
                    className="shrink-0 border border-rule dark:border-darkBorder bg-white dark:bg-darkInput text-xs font-medium text-muted dark:text-darkMuted px-3 sm:px-4 py-3 rounded-xl hover:border-ink/30 dark:hover:border-white/20 hover:text-ink dark:hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    Paste
                  </button>
                </div>

                {error && <p className="text-xs text-red-400 pl-1">{error}</p>}

                <button
                  type="submit"
                  disabled={phase === "loading" || !url.trim()}
                  className="w-full bg-ink text-white dark:bg-white dark:text-ink text-xs font-medium py-3 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {phase === "loading"
                    ? <><Spinner className="h-3.5 w-3.5" /> Pulling recipe info&hellip;</>
                    : "Continue"}
                </button>
              </form>

              {/* Live skeleton preview while scraping */}
              {phase === "loading" && (
                <div className="w-full max-w-[340px] sm:max-w-[380px] animate-pulse pt-4">
                  <div className="aspect-video w-full rounded-2xl sm:rounded-3xl bg-lift dark:bg-darkInput mb-3" />
                  <div className="h-3.5 bg-lift dark:bg-darkInput rounded-full w-2/3 mb-2" />
                  <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-full mb-1.5" />
                  <div className="h-3 bg-lift dark:bg-darkInput rounded-full w-4/5" />
                </div>
              )}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? "h-4 w-4"}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
