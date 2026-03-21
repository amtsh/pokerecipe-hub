"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

type Tab = "pending" | "manage";

interface AdminRecipe {
  slug: string;
  name: string;
  description: string;
  category: string | null;
  clicks: number;
  submitted_at: string;
}

export default function AdminPage() {
  const [digits, setDigits]         = useState(["", "", "", ""]);
  const [pinError, setPinError]     = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const digitRefs = [ref0, ref1, ref2, ref3];

  const [pin, setPin]       = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  const [tab, setTab]             = useState<Tab>("pending");
  const [pending, setPending]     = useState<AdminRecipe[]>([]);
  const [managed, setManaged]     = useState<AdminRecipe[]>([]);
  const [loading, setLoading]     = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_pin");
    if (stored) { setPin(stored); setAuthed(true); }
    else { setTimeout(() => ref0.current?.focus(), 50); }
  }, []);

  const fetchData = useCallback(async (p: string, t: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/recipes?status=${t === "pending" ? "pending" : "approved"}&pin=${encodeURIComponent(p)}`
      );
      if (res.status === 401) {
        sessionStorage.removeItem("admin_pin");
        setPin(null); setAuthed(false);
        return;
      }
      const { data } = await res.json() as { data?: AdminRecipe[] };
      if (t === "pending") setPending(data ?? []);
      else setManaged(data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authed && pin) fetchData(pin, tab);
  }, [authed, pin, tab, fetchData]);

  function handleDigit(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = digits.map((v, idx) => (idx === i ? d : v));
    setDigits(next);
    if (d && i < 3) digitRefs[i + 1].current?.focus();
    if (next.filter(Boolean).length === 4) tryAuth(next.join(""));
  }

  function handleDigitKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      digitRefs[i - 1].current?.focus();
    }
  }

  async function tryAuth(p: string) {
    setPinError("");
    setPinLoading(true);
    try {
      const res = await fetch(
        `/api/admin/recipes?status=pending&pin=${encodeURIComponent(p)}`
      );
      if (res.status === 401) {
        setPinError("Wrong PIN. Try again.");
        setDigits(["", "", "", ""]);
        setTimeout(() => ref0.current?.focus(), 50);
        return;
      }
      const { data } = await res.json() as { data?: AdminRecipe[] };
      sessionStorage.setItem("admin_pin", p);
      setPin(p); setAuthed(true);
      setPending(data ?? []);
    } catch {
      setPinError("Connection error. Try again.");
      setDigits(["", "", "", ""]);
    } finally {
      setPinLoading(false);
    }
  }

  async function handleApprove(slug: string, name: string) {
    if (!pin) return;
    // Optimistically remove immediately so the UI feels instant
    setPending((prev) => prev.filter((r) => r.slug !== slug));
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin }),
      });
      if (!res.ok) {
        // Revert: re-fetch the pending list so the row comes back
        await fetchData(pin, "pending");
        flash("Approval failed \u2014 please try again.");
        return;
      }
      flash(`\u201c${name}\u201d approved and live on homepage.`);
    } catch {
      await fetchData(pin, "pending");
      flash("Approval failed \u2014 please try again.");
    }
  }

  async function handleDelete(slug: string, name: string) {
    if (!pin) return;
    if (!confirm(`Delete \u201c${name}\u201d? This cannot be undone.`)) return;
    // Optimistically remove immediately
    setPending((p) => p.filter((r) => r.slug !== slug));
    setManaged((m) => m.filter((r) => r.slug !== slug));
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin }),
      });
      if (!res.ok) {
        // Revert by re-fetching the current tab
        await fetchData(pin, tab);
        flash("Delete failed \u2014 please try again.");
        return;
      }
      flash(`\u201c${name}\u201d deleted.`);
    } catch {
      await fetchData(pin, tab);
      flash("Delete failed \u2014 please try again.");
    }
  }

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 4000);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_pin");
    setPin(null); setAuthed(false);
    setPending([]); setManaged([]);
    setDigits(["", "", "", ""]);
    setTimeout(() => ref0.current?.focus(), 50);
  }

  const displayed = tab === "pending" ? pending : managed;

  // ── PIN screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <>
        <Navbar />
        <main className="pt-14 min-h-screen bg-white dark:bg-darkBg flex items-center justify-center">
          <div className="w-full max-w-xs mx-auto px-4 text-center">
            <p className="text-[0.6rem] tracking-[0.22em] uppercase text-faint dark:text-darkFaint mb-8 font-medium">
              Admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-white mb-2">
              Enter PIN
            </h1>
            <p className="text-xs text-muted dark:text-darkMuted mb-10">
              4-digit access code
            </p>
            <div className="flex justify-center gap-3 mb-6">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={digitRefs[i]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKey(i, e)}
                  disabled={pinLoading}
                  className="w-12 h-14 text-center text-2xl font-semibold bg-lift dark:bg-darkInput border border-rule dark:border-darkBorder rounded-xl text-ink dark:text-white focus:outline-none focus:border-ink/40 dark:focus:border-white/30 transition-colors disabled:opacity-40"
                />
              ))}
            </div>
            {pinError   && <p className="text-xs text-red-400 mt-2">{pinError}</p>}
            {pinLoading && <p className="text-xs text-faint dark:text-darkFaint animate-pulse mt-2">Checking&hellip;</p>}
          </div>
        </main>
      </>
    );
  }

  // ── Admin content ────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen bg-white dark:bg-darkBg">
        <div className="max-w-wide mx-auto px-4 sm:px-6 py-10 sm:py-16">

          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-[0.6rem] tracking-[0.22em] uppercase text-faint dark:text-darkFaint mb-1 font-medium">Admin</p>
              <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-white">
                Recipe Manager
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-faint dark:text-darkFaint hover:text-muted dark:hover:text-darkMuted transition-colors mt-1"
            >
              Lock
            </button>
          </div>

          {actionMsg && (
            <div className="mb-6 px-4 py-3 bg-lift dark:bg-darkSurface border border-rule dark:border-darkBorder rounded-xl text-xs text-ink dark:text-white">
              {actionMsg}
            </div>
          )}

          <div className="flex items-center gap-0.5 bg-lift dark:bg-darkInput border border-rule dark:border-darkBorder rounded-full p-0.5 w-fit mb-8">
            {(["pending", "manage"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs px-5 py-2 rounded-full font-medium transition-colors ${
                  tab === t
                    ? "bg-ink text-white dark:bg-white dark:text-ink"
                    : "text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white"
                }`}
              >
                {t === "pending"
                  ? `Pending${pending.length > 0 ? ` (${pending.length})` : ""}`
                  : "Manage"}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-lift dark:bg-darkSurface rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loading && displayed.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xs text-muted dark:text-darkMuted">
                {tab === "pending" ? "No recipes awaiting approval." : "No approved recipes yet."}
              </p>
            </div>
          )}

          {!loading && displayed.length > 0 && (
            <div className="border border-rule dark:border-darkBorder rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rule dark:border-darkBorder bg-lift dark:bg-darkSurface">
                    <th className="text-left px-5 py-3 text-[0.6rem] tracking-widest uppercase text-faint dark:text-darkFaint font-medium">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-[0.6rem] tracking-widest uppercase text-faint dark:text-darkFaint font-medium hidden sm:table-cell">
                      Category
                    </th>
                    <th className="text-left px-5 py-3 text-[0.6rem] tracking-widest uppercase text-faint dark:text-darkFaint font-medium hidden md:table-cell">
                      {tab === "manage" ? "Views" : "Submitted"}
                    </th>
                    <th className="text-right px-5 py-3 text-[0.6rem] tracking-widest uppercase text-faint dark:text-darkFaint font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((r) => (
                    <tr
                      key={r.slug}
                      className="border-b border-rule dark:border-darkBorder last:border-0 hover:bg-lift/60 dark:hover:bg-darkSurface/60 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <a
                          href={`https://poke.com/r/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-ink dark:text-white hover:opacity-60 transition-opacity leading-snug"
                        >
                          {r.name}
                        </a>
                        <div className="text-xs text-faint dark:text-darkFaint font-mono mt-0.5 truncate max-w-[160px]">
                          {r.slug}
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {r.category ? (
                          <span className="text-xs font-medium border border-rule dark:border-darkBorder text-muted dark:text-darkMuted px-2 py-0.5 rounded-full">
                            {r.category}
                          </span>
                        ) : (
                          <span className="text-xs text-faint dark:text-darkFaint">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs text-muted dark:text-darkMuted">
                          {tab === "manage"
                            ? r.clicks.toLocaleString()
                            : new Date(r.submitted_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {tab === "pending" && (
                            <button
                              onClick={() => handleApprove(r.slug, r.name)}
                              className="text-xs font-medium bg-ink text-white dark:bg-white dark:text-ink px-3 py-1.5 rounded-full hover:opacity-75 transition-opacity"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(r.slug, r.name)}
                            className="text-xs font-medium border border-rule dark:border-darkBorder text-muted dark:text-darkMuted px-3 py-1.5 rounded-full hover:border-red-300 dark:hover:border-red-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            {tab === "pending" ? "Reject" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
