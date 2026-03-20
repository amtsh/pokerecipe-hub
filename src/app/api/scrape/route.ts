import { NextRequest, NextResponse } from "next/server";

export interface ScrapeResult {
  slug: string;
  name: string;
  description: string;
  canonical: string;
}

/**
 * POST /api/scrape
 * Body: { url: string }  — must be poke.com/r/<slug> or poke.com/refer/<slug>
 *
 * Strategy:
 *  1. Validate & extract slug from the URL (casing preserved, not lowercased).
 *  2. Server-side fetch → parse og:title / og:description meta tags.
 *  3. If page is gated or fetch fails, fall back to a slug-derived title.
 */
export async function POST(req: NextRequest) {
  let url: string | undefined;
  try { ({ url } = await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Normalise: add https:// if the user pasted a bare domain
  const raw = url.trim();
  const normalised = raw.startsWith("http") ? raw : `https://${raw}`;

  let parsed: URL;
  try { parsed = new URL(normalised); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 422 }); }

  if (!["poke.com", "www.poke.com"].includes(parsed.hostname)) {
    return NextResponse.json(
      { error: "URL must be a poke.com/r/… or poke.com/refer/… link" },
      { status: 422 }
    );
  }

  // Support both /r/<slug> and /refer/<slug> — preserve original casing
  const match = parsed.pathname.match(/^\/(?:r|refer)\/([A-Za-z0-9_-]+)/);
  if (!match) {
    return NextResponse.json(
      { error: "URL must match poke.com/r/<slug> or poke.com/refer/<slug>" },
      { status: 422 }
    );
  }

  // Slug is NOT lowercased — poke.com slugs are case-sensitive
  const slug      = match[1];
  const canonical = `https://poke.com/r/${slug}`;
  let   name      = slugToTitle(slug);
  let   description = "";

  try {
    const res = await fetch(canonical, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();
      // Extract all <meta> tags first, then query them — handles any attribute order
      const metas = parseMetaTags(html);
      name =
        metas["og:title"] ||
        metas["twitter:title"] ||
        metas["title"] ||
        extractTitle(html) ||
        name;
      description =
        metas["og:description"] ||
        metas["twitter:description"] ||
        metas["description"] ||
        description;
    }
  } catch {
    // Timeout, network error, or gated page — fall back to slug-derived values
  }

  return NextResponse.json({ slug, name, description, canonical } as ScrapeResult);
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse every <meta> tag in the HTML and return a map of
 * { property/name → content }. Handles attributes in any order,
 * self-closing tags, single/double quotes, and unquoted values.
 */
function parseMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match every <meta ... > or <meta ... />
  const tagRe = /<meta([^>]+?)\/?>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRe.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const key   = attrVal(attrs, "property") || attrVal(attrs, "name");
    const value = attrVal(attrs, "content");
    if (key && value) {
      result[key.toLowerCase()] = decode(value);
    }
  }
  return result;
}

/** Extract a single attribute value from a snippet of HTML attribute text. */
function attrVal(attrs: string, name: string): string {
  // Handles: name="value"  name='value'  name=value
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m  = attrs.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decode(m[1].trim()) : "";
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
