import { NextRequest, NextResponse } from "next/server";
import { decodeEntities } from "../../../lib/decode-entities";

export interface ScrapeResult {
  slug: string;
  name: string;
  description: string;
  canonical: string;
}

/**
 * POST /api/scrape
 * Body: { url: string }  — poke.com/r/<slug> or poke.com/refer/<slug>
 *
 * Strategy:
 *  1. Validate & extract slug (casing preserved).
 *  2. Server-side fetch → parse og/twitter/standard meta tags.
 *  3. Decode all HTML entities in extracted strings.
 *  4. Fall back to a slug-derived title if the page is gated or fetch fails.
 */
export async function POST(req: NextRequest) {
  let url: string | undefined;
  try { ({ url } = await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Normalise: prepend https:// if user pasted a bare domain
  const raw        = url.trim();
  const normalised = raw.startsWith("http") ? raw : `https://${raw}`;

  let parsed: URL;
  try { parsed = new URL(normalised); }
  catch { return NextResponse.json({ error: "Invalid URL" }, { status: 422 }); }

  if (!["poke.com", "www.poke.com"].includes(parsed.hostname)) {
    return NextResponse.json(
      { error: "URL must be a poke.com/r/\u2026 or poke.com/refer/\u2026 link" },
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

  const slug      = match[1];                        // casing preserved
  const canonical = `https://poke.com/r/${slug}`;
  let   name      = slugToTitle(slug);
  let   description = "";

  try {
    const res = await fetch(canonical, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();
      const metas = parseMetaTags(html);

      // Prefer OG → Twitter → standard meta → <title> → slug-derived fallback
      name =
        metas["og:title"]          ||
        metas["twitter:title"]     ||
        metas["title"]             ||
        extractTitle(html)         ||
        name;

      description =
        metas["og:description"]    ||
        metas["twitter:description"] ||
        metas["description"]       ||
        description;
    }
  } catch {
    // Timeout, network error, or gated page — fall back to slug-derived values
  }

  // Decode all HTML entities in the final strings before returning
  return NextResponse.json({
    slug,
    name:        decodeEntities(name.trim()),
    description: decodeEntities(description.trim()),
    canonical,
  } as ScrapeResult);
}

// ── helpers ────────────────────────────────────────────────────────────────────────

/**
 * Parse every <meta> tag in the HTML into a { key: value } map.
 * Handles attributes in any order, self-closing tags, and mixed quote styles.
 */
function parseMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tagRe = /<meta([^>]+?)\/?>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRe.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const key   = attrVal(attrs, "property") || attrVal(attrs, "name");
    const value = attrVal(attrs, "content");
    if (key && value) {
      // Store with lowercased key; apply entity decode at parse time
      result[key.toLowerCase()] = decodeEntities(value);
    }
  }
  return result;
}

/** Extract a single attribute value from a snippet of HTML attribute text. */
function attrVal(attrs: string, name: string): string {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const m = attrs.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : "";
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
