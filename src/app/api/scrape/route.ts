import { NextRequest, NextResponse } from "next/server";
import { decodeEntities } from "../../../../lib/decode-entities";

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
 * Returns scraped metadata for the submit-page preview.
 * Description is truncated to the first 20 words.
 * This data is used for display only; persistence is handled by /api/recipes.
 */
export async function POST(req: NextRequest) {
  let url: string | undefined;
  try { ({ url } = await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

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

  const match = parsed.pathname.match(/^\/(?:r|refer)\/([A-Za-z0-9_-]+)/);
  if (!match) {
    return NextResponse.json(
      { error: "URL must match poke.com/r/<slug> or poke.com/refer/<slug>" },
      { status: 422 }
    );
  }

  const slug      = match[1];
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
      const html  = await res.text();
      const metas = parseMetaTags(html);
      name =
        metas["og:title"]        ||
        metas["twitter:title"]   ||
        metas["title"]           ||
        extractTitle(html)       ||
        name;
      description =
        metas["og:description"]      ||
        metas["twitter:description"] ||
        metas["description"]         ||
        description;
    }
  } catch { /* timeout or gated page — fall back to slug-derived values */ }

  return NextResponse.json({
    slug,
    name:        decodeEntities(name.trim()),
    // Truncate to first 20 words before storing or displaying
    description: truncateWords(decodeEntities(description.trim()), 20),
    canonical,
  } as ScrapeResult);
}

// ── helpers ────────────────────────────────────────────────────────────────────

/** Trim to the first n words, appending \u2026 if truncated. */
function truncateWords(s: string, n: number): string {
  if (!s) return s;
  const words = s.trim().split(/\s+/);
  if (words.length <= n) return s.trim();
  return words.slice(0, n).join(" ") + "\u2026";
}

function parseMetaTags(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  const tagRe = /<meta([^>]+?)\/?>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRe.exec(html)) !== null) {
    const attrs = tagMatch[1];
    const key   = attrVal(attrs, "property") || attrVal(attrs, "name");
    const value = attrVal(attrs, "content");
    if (key && value) result[key.toLowerCase()] = decodeEntities(value);
  }
  return result;
}

function attrVal(attrs: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m  = attrs.match(re);
  if (!m) return "";
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) : "";
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
