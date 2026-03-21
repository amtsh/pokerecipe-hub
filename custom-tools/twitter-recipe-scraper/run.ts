/**
 * Twitter Recipe Scraper
 * Runs hourly via cron trigger.
 *
 * Flow:
 *   1. Search Twitter/X for poke.com/r/ and poke.com/refer/ links (3 queries)
 *   2. Extract unique recipe slugs + associated tweet IDs from results
 *   3. Deduplicate against the DB (checks approved AND pending rows)
 *   4. For each new slug: scrape poke.com og:title + RSC description
 *   5. Infer category from name + description
 *   6. INSERT with approved=false, tweet_id stored for Reply & Approve workflow
 *   7. Return structured report (new recipes + tweet URLs)
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

/** Truncate to first N words, appending "…" if truncated. */
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

/** Scrape og:title and RSC description from a poke.com recipe page. */
async function scrapeRecipeMeta(slug: string): Promise<{ name: string; description: string } | null> {
  try {
    const result = await webExtract({
      urls: [`https://poke.com/r/${slug}`],
      objective: "Find the recipe name (og:title) and description of this Poke recipe.",
    });
    const raw = result.content?.[0]?.text ?? "";

    const titleMatch = raw.match(/og:title[^>]*content="([^"]+)"/);
    let name = titleMatch ? titleMatch[1].replace(/ [–-] Poke$/, "").trim() : slug;

    if (name === "Kitchen" || name.toLowerCase().includes("build and manage")) return null;

    const descMatch = raw.match(/description.*?([A-Z][^\\"|]{20,300})/);
    const rawDesc = descMatch ? descMatch[1] : "";
    const description = rawDesc ? truncateWords(rawDesc, 20) : "";

    return { name, description };
  } catch {
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
  // Maps recipe slug → { tweetUrl, tweetId }
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

  // 2. Extract all unique slugs across all search results
  const combined   = allText.join("\n");
  const found      = extractSlugs(combined);
  const foundSlugs = [...new Set(found.map((f) => f.slug))];
  console.log(`[scraper] Found ${foundSlugs.length} unique slug(s): ${foundSlugs.join(", ")}`);

  if (foundSlugs.length === 0) {
    return { added: [], skipped: [], tweetMeta: {} };
  }

  // 3. Strict deduplication — check both approved and pending rows
  const slugList = foundSlugs.map((s) => `'${s}'`).join(", ");
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

  // 4. Scrape metadata + insert for each new slug
  const added: { slug: string; name: string; category: string; tweetUrl?: string; tweetId?: string }[] = [];

  for (const slug of newSlugs) {
    const meta = await scrapeRecipeMeta(slug);
    if (!meta) {
      console.log(`[scraper] Skipping ${slug} \u2014 could not scrape (private/redirect)`);
      skipped.push(slug);
      continue;
    }

    const { name, description } = meta;
    const category = inferCategory(name, description);
    const { tweetUrl, tweetId } = tweetMeta.get(slug) ?? { tweetUrl: undefined, tweetId: null };

    // Safely escape single quotes for SQL
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
      added.push({ slug, name, category, tweetUrl, tweetId: tweetId ?? undefined });
      console.log(`[scraper] Inserted: "${name}" (${slug}) → ${category}${tweetId ? ` | tweet ${tweetId}` : ""}`);
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
