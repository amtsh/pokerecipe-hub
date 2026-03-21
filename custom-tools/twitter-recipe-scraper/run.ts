/**
 * Twitter Recipe Scraper
 * Runs hourly via cron trigger.
 *
 * Flow:
 *   1. Search Twitter/X for poke.com/r/ and poke.com/refer/ links (3 queries)
 *   2. Extract unique recipe slugs + associated tweet IDs from results
 *   3. Deduplicate against the DB (checks approved AND pending rows)
 *   4. For each new slug:
 *      a. Fetch the poke.com/r/{slug} page
 *      b. Check Poke platform status from RSC payload
 *      c. SKIP if status !== "published" (e.g. pending_review, not found)
 *      d. Extract og:title + description from the same response
 *      e. Infer category from name + description
 *      f. INSERT with approved=false, tweet_id stored for Reply & Approve workflow
 *   5. Return structured report
 *
 * Usage:
 *   bun custom-tools/twitter-recipe-scraper/run.ts
 */

import { realtimeWebSearch } from "../../poke/search/realtime_web_search.ts";
import { webExtract }        from "../../poke/search/web_extract.ts";
import { executeSql }        from "../../mcp/supabase-050fca73-1292-4d67-b05a-868680983cdf.ts";

const SUPABASE_PROJECT = "siimwmzposaphcnadfuk";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract every poke.com recipe slug from a block of text. */
function extractSlugs(text: string): { slug: string; rawUrl: string }[] {
  const matches = [...text.matchAll(/https?:\/\/poke\.com\/(?:r|refer)\/([A-Za-z0-9_\-]{6,})/g)];
  const seen = new Set<string>();
  const results: { slug: string; rawUrl: string }[] = [];
  for (const m of matches) {
    const slug = m[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      results.push({ slug, rawUrl: m[0] });
    }
  }
  return results;
}

/**
 * Extract a tweet ID from a Twitter/X status URL.
 * Supports both twitter.com and x.com status URLs.
 */
function extractTweetId(url: string): string | null {
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * Extract the Poke platform status from raw HTML containing RSC payload.
 * Looks for the pattern embedded in self.__next_f.push scripts:
 *   \"isInternal\":(true|false),\"status\":\"<value>\"
 *
 * Returns the status string (e.g. "published", "pending_review") or null.
 */
function extractPokeStatus(html: string): string | null {
  const m = html.match(/\\"isInternal\\":(true|false),\\"status\\":\\"([a-z_]+)\\"/);
  return m ? m[2] : null;
}

/** Truncate to first N words, appending \u2026 if truncated. */
function truncateWords(text: string, n = 20): string {
  const words = text.trim().split(/\s+/);
  return words.length <= n ? text.trim() : words.slice(0, n).join(" ") + "\u2026";
}

/** Infer a category from recipe name + description. */
function inferCategory(name: string, desc: string): string {
  const t = `${name} ${desc}`.toLowerCase();
  if (/github|cursor|vercel|supabase|openai|pull request|pr review|deploy|api|stack/.test(t)) return "Developer";
  if (/flight|travel|hotel|airport|trip|booking|boarding/.test(t)) return "Travel";
  if (/email|inbox|calendar|meeting|task|notion|slack|reminder|productivity/.test(t)) return "Productivity";
  if (/stock|crypto|finance|bank|investment|market|price alert|portfolio/.test(t)) return "Finance";
  if (/movie|album|music|entertainment|film|watchlist|spotify/.test(t)) return "Entertainment";
  if (/health|workout|fitness|meditation|sleep|gym/.test(t)) return "Health";
  if (/star|camp|outdoor|hiking|nature|weekend guide/.test(t)) return "Outdoors";
  return "Fun";
}

/**
 * Fetch a poke.com recipe page, verify it is published, and extract metadata.
 *
 * Returns null (with a reason) if:
 *  - The page 404s (recipe doesn't exist)
 *  - The status is not "published" (e.g. "pending_review")
 *  - The name looks like a Kitchen/private page
 */
async function scrapeRecipeMeta(slug: string): Promise<{
  name: string;
  description: string;
  pokeStatus: string;
} | null> {
  try {
    const res = await fetch(`https://poke.com/r/${slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":     "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      console.log(`[scraper] ${slug} — HTTP ${res.status}, skipping`);
      return null;
    }

    const html = await res.text();

    // Gate on Poke platform status from RSC payload
    const pokeStatus = extractPokeStatus(html);
    if (pokeStatus !== null && pokeStatus !== "published") {
      console.log(`[scraper] ${slug} — status "${pokeStatus}", skipping`);
      return null;
    }

    // Extract og:title
    const titleMatch = html.match(/"og:title"[^>]*content="([^"]+)"/) ||
                       html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let name = titleMatch ? titleMatch[1].replace(/ [\u2013\u2014-] Poke$/i, "").trim() : slug;

    // Reject private / misconfigured pages
    if (name === "Kitchen" || name.toLowerCase().includes("build and manage")) return null;

    // Extract description from og meta
    const descMatch = html.match(/"og:description"[^>]*content="([^"]+)"/) ||
                      html.match(/name="description"[^>]*content="([^"]+)"/);
    const rawDesc = descMatch ? descMatch[1].replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"') : "";
    const description = rawDesc ? truncateWords(rawDesc, 20) : "";

    return { name, description, pokeStatus: pokeStatus ?? "published" };
  } catch (e) {
    console.warn(`[scraper] scrapeRecipeMeta failed for ${slug}:`, e);
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[scraper] Starting Twitter recipe scraper run\u2026");

  const searches = [
    'site:x.com "poke.com/r/" recipe',
    'site:x.com "poke.com/r/"',
    'site:x.com "poke.com/refer/"',
  ];

  const allText: string[] = [];
  const tweetMeta = new Map<string, { tweetUrl: string; tweetId: string | null }>();

  for (const query of searches) {
    try {
      const res = await realtimeWebSearch({ query });
      const text = res.content?.[0]?.text ?? "";
      allText.push(text);

      const candidates = extractSlugs(text);
      const tweetLinks = [...text.matchAll(/https?:\/\/(?:x|twitter)\.com\/[^\s"')]+\/status\/\d+/g)];

      for (const { slug } of candidates) {
        if (!tweetMeta.has(slug) && tweetLinks.length > 0) {
          const tweetUrl = tweetLinks[0][0];
          const tweetId  = extractTweetId(tweetUrl);
          tweetMeta.set(slug, { tweetUrl, tweetId });
        }
      }
    } catch (e) {
      console.warn(`[scraper] Search failed for query: ${query}`, e);
    }
  }

  const combined   = allText.join("\n");
  const found      = extractSlugs(combined);
  const foundSlugs = [...new Set(found.map((f) => f.slug))];
  console.log(`[scraper] Found ${foundSlugs.length} unique slug(s): ${foundSlugs.join(", ")}`);

  if (foundSlugs.length === 0) {
    return { added: [], skipped: [], tweetMeta: {} };
  }

  // Deduplicate against DB
  const slugList    = foundSlugs.map((s) => `'${s}'`).join(", ");
  const checkResult = await executeSql({
    project_id: SUPABASE_PROJECT,
    query: `SELECT slug FROM recipes WHERE slug IN (${slugList})`,
  });

  const existingSlugs = new Set<string>();
  try {
    const parsed = JSON.parse(checkResult.content?.[0]?.text ?? "{}");
    const rows: { slug: string }[] = parsed.result
      ? JSON.parse(parsed.result.match(/\[.*\]/s)?.[0] ?? "[]")
      : [];
    for (const r of rows) existingSlugs.add(r.slug);
  } catch { /* treat as empty — safe to continue */ }

  const newSlugs = foundSlugs.filter((s) => !existingSlugs.has(s));
  const skipped  = foundSlugs.filter((s) =>  existingSlugs.has(s));
  console.log(`[scraper] ${existingSlugs.size} already in DB, ${newSlugs.length} new slug(s) to process`);

  if (newSlugs.length === 0) return { added: [], skipped, tweetMeta: Object.fromEntries(tweetMeta) };

  const added: { slug: string; name: string; category: string; tweetUrl?: string; tweetId?: string; pokeStatus: string }[] = [];

  for (const slug of newSlugs) {
    const meta = await scrapeRecipeMeta(slug);
    if (!meta) {
      // Null means: not published, 404, or private page — skip entirely, don't insert
      console.log(`[scraper] Skipping ${slug} — not published or unscrapeable`);
      skipped.push(slug);
      continue;
    }

    const { name, description, pokeStatus } = meta;
    const category = inferCategory(name, description);
    const { tweetUrl, tweetId } = tweetMeta.get(slug) ?? { tweetUrl: undefined, tweetId: null };

    const safeSlug = slug.replace(/'/g, "''");
    const safeName = name.replace(/'/g, "''");
    const safeDesc = description.replace(/'/g, "''");
    const tweetIdSql = tweetId ? `'${tweetId}'` : "null";

    try {
      await executeSql({
        project_id: SUPABASE_PROJECT,
        query: `
          INSERT INTO recipes (slug, name, description, category, clicks, approved, tweet_id)
          VALUES (
            '${safeSlug}',
            '${safeName}',
            '${safeDesc}',
            '${category}',
            0,
            false,
            ${tweetIdSql}
          )
          ON CONFLICT (slug) DO NOTHING
        `,
      });
      added.push({ slug, name, category, tweetUrl, tweetId: tweetId ?? undefined, pokeStatus });
      console.log(`[scraper] Inserted: "${name}" (${slug}) \u2192 ${category} | poke:${pokeStatus}${tweetId ? ` | tweet ${tweetId}` : ""}`);
    } catch (e) {
      console.error(`[scraper] Insert failed for ${slug}:`, e);
    }
  }

  return {
    added,
    skipped,
    tweetMeta: Object.fromEntries(tweetMeta),
  };
}

const result = await main();
console.log("[scraper] Done.", JSON.stringify(result, null, 2));
