"use client";

import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

type Phase = "input" | "loading" | "confirm" | "done";

interface ScrapedData {
  slug: string;
  name: string;
  description: string;
  canonical: string;
}

/** Returns true for any accepted poke.com recipe URL format */
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
      // Clipboard permission denied \u2014 just focus the input
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
      setError("That doesn\u2019t look like a poke.com recipe link (poke.com/r/\u2026 or poke.com/refer/\u2026).");
      return;
    }

    setPhase("loading");
    try {
      const res  = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setPhase("input"); setError(data.error ?? "Something went wrong."); return; }
      setScraped(data as ScrapedData);
      setPhase("confirm");
    } catch {
      setPhase("input");
      setError("Network error. Check your connection and try again.");
    }
  }

  function handleConfirm() {
    // TODO: POST scraped data to /api/recipes once a recipes table exists.
    setPhase("done");
  }

  function reset() {
    setUrl(""); setScraped(null); setError(""); setPhase("input");
  }

  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen bg-white">
        <div className="max-w-content mx-auto px-6 py-24">

          <Link href="/" className="text-xs text-faint hover:text-muted transition-colors inline-block mb-12">
            &larr; Back
          </Link>

          {/* \u2500\u2500 done \u2500\u2500 */}
          {phase === "done" && (
            <div className="border border-rule rounded-2xl p-10 text-center">
              <p className="text-sm font-medium text-ink mb-2">Recipe submitted.</p>
              <p className="text-sm text-muted mb-8">Thank you \u2014 it will appear after a quick review.</p>
              <button
                onClick={reset}
                className="text-sm text-ink underline underline-offset-2 hover:text-muted transition-colors"
              >
                Submit another
              </button>
            </div>
          )}

          {/* \u2500\u2500 confirm \u2500\u2500 */}
          {phase === "confirm" && scraped && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink mb-2">Looks right?</h1>
                <p className="text-sm text-muted">We pulled this from the recipe link. Confirm to submit.</p>
              </div>

              <div className="border border-rule rounded-2xl p-6 space-y-5">
                <Row label="Name"        value={scraped.name || "\u2014"} />
                <Row label="Description" value={scraped.description || "\u2014"} />
                <Row label="Link"        value={scraped.canonical} isLink />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-ink text-white text-sm font-medium py-3 rounded-full hover:bg-muted transition-colors"
                >
                  Submit
                </button>
                <button
                  onClick={reset}
                  className="flex-1 border border-rule text-sm text-muted py-3 rounded-full hover:border-ink/30 transition-colors"
                >
                  Start over
                </button>
              </div>
            </div>
          )}

          {/* \u2500\u2500 input / loading \u2500\u2500 */}
          {(phase === "input" || phase === "loading") && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink mb-2">Submit a recipe</h1>
                <p className="text-sm text-muted leading-relaxed">
                  Paste a{" "}
                  <code className="font-mono text-xs bg-lift px-1.5 py-0.5 rounded text-ink">
                    poke.com/r/\u2026
                  </code>
                  {" "}or{" "}
                  <code className="font-mono text-xs bg-lift px-1.5 py-0.5 rounded text-ink">
                    poke.com/refer/\u2026
                  </code>
                  {" "}link. We&apos;ll pull the name and description automatically.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }}
                    placeholder="poke.com/r/morning-news-brief"
                    disabled={phase === "loading"}
                    className="flex-1 bg-white border border-rule rounded-xl px-4 py-3 text-sm text-ink placeholder-faint focus:outline-none focus:border-ink/30 transition-colors disabled:opacity-50"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    disabled={phase === "loading"}
                    className="shrink-0 border border-rule bg-white text-xs font-medium text-muted px-4 py-3 rounded-xl hover:border-ink/30 hover:text-ink transition-colors disabled:opacity-50"
                  >
                    Paste
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-red-400 pl-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={phase === "loading" || !url.trim()}
                  className="w-full bg-ink text-white text-sm font-medium py-3 rounded-full hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {phase === "loading" ? (
                    <><Spinner /> Pulling recipe info&hellip;</>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] tracking-widest uppercase font-medium text-faint">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-ink underline underline-offset-2 hover:text-muted transition-colors break-all"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-ink leading-relaxed">{value}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
