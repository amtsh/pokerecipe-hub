import { NextRequest, NextResponse } from "next/server";

export interface ScrapeResult {
  slug: string;
  name: string;
  description: string;
  canonical: string;
}

/**
 * POST /api/scrape
 * Body: { url: string }  — must be poke.com/r/<slug>
 *
 * Strategy:
 *  1. Validate & extract slug from the URL.
 *  2. Server-side fetch → parse og:title / og:description meta tags.
 *  3. If page is gated or fetch fails, fall back to a slug-derived title.
 *
 * Swap step 2 for a headless browser or official Poke API once available.
 */
export async function POST(req: NextRequest) {
  let url: string | undefined;
  try { ({ url } = await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try { parsed = new URL(url.trim()); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 422 }); }

  if (!["poke.com", "www.poke.com"].includes(parsed.hostname)) {
    return NextResponse.json({ error: "URL must be a poke.com/r/... link" }, { status: 422 });
  }

  const match = parsed.pathname.match(/^\/r\/([a-z0-9-]+)/i);
  if (!match) {
    return NextResponse.json({ error: "URL must match poke.com/r/<slug>" }, { status: 422 });
  }

  const slug      = match[1].toLowerCase();
  const canonical = `https://poke.com/r/${slug}`;
  let   name      = slugToTitle(slug);
  let   description = "";

  try {
    const res = await fetch(canonical, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PokeRecipeBot/1.0)", Accept: "text/html" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const html = await res.text();
      name        = extractMeta(html, "og:title")       || extractMeta(html, "twitter:title")       || name;
      description = extractMeta(html, "og:description") || extractMeta(html, "twitter:description") || extractTitle(html);
    }
  } catch { /* timeout or network error — fall back to slug-derived values */ }

  return NextResponse.json({ slug, name, description, canonical } as ScrapeResult);
}

function slugToTitle(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractMeta(html: string, prop: string): string {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  const m = a ?? b;
  return m ? decode(m[1].trim()) : "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decode(m[1].trim()) : "";
}

function decode(s: string) {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&hellip;/g,"…");
}
