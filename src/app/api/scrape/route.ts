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
 * Validates that the recipe is actually published on the Poke platform before
 * returning metadata. Recipes with status 'pending_review' or missing are rejected.
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

    // Recipe doesn't exist on Poke at all
    if (!res.ok) {
      return NextResponse.json(
        { error: "This recipe couldn\u2019t be found on the Poke platform." },
        { status: 422 }
      );
    }

    const html = await res.text();

    // Verify the recipe is published on the Poke platform.
    // The RSC payload embeds: \"isInternal\":(true|false),\"status\":\"<value>\"
    const pokeStatus = extractPokeStatus(html);

    if (pokeStatus === "pending_review") {
      return NextResponse.json(
        { error: "This recipe is still pending review on the Poke platform and can\u2019t be submitted yet. Try again once it\u2019s published." },
        { status: 422 }
      );
    }

    if (pokeStatus !== null && pokeStatus !== "published") {
      return NextResponse.json(
        { error: "This recipe isn\u2019t currently published on the Poke platform." },
        { status: 422 }
      );
    }

    // pokeStatus === "published" or null (couldn't parse — allow with fallback)
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
  } catch { /* timeout or gated page — fall back to slug-derived values */ }

  return NextResponse.json({
    slug,
    name:        stripPokeSuffix(decodeEntities(name.trim())),
    description: truncateWords(decodeEntities(description.trim()), 20),
    canonical,
  } as ScrapeResult);
}

// ── helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract the Poke platform status from the RSC payload embedded in the page HTML.
 *
 * In the raw HTML, the recipe data object appears inside self.__next_f.push([1,"..."]) with
 * escaped quotes: \"isInternal\":(true|false),\"status\":\"published\"
 * The isInternal anchor ensures we match the recipe data object specifically.
 *
 * Returns the status string (e.g. "published", "pending_review") or null if not found.
 */
export function extractPokeStatus(html: string): string | null {
  const m = html.match(/\\"isInternal\\":(true|false),\\"status\\":\\"([a-z_]+)\\"/);
  return m ? m[2] : null;
}

function stripPokeSuffix(s: string): string {
  return s.replace(/\s*[\u2013\u2014-]\s*Poke\s*$/i, "").trim();
}

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
