/**
 * Extract the Poke platform status from the RSC payload embedded in page HTML.
 *
 * Every poke.com/r/{slug} page embeds recipe data inside self.__next_f.push() scripts
 * with escaped quotes. The pattern in raw HTML:
 *   \"isInternal\":(true|false),\"status\":\"<value>\"
 *
 * The isInternal anchor ensures we match the recipe data object specifically,
 * not incidental occurrences of "status" elsewhere in the page.
 *
 * @returns The status string (e.g. "published", "pending_review") or null if not found.
 */
export function extractPokeStatus(html: string): string | null {
  const m = html.match(/\\"isInternal\\":(true|false),\\"status\\":\\"([a-z_]+)\\"/);
  return m ? m[2] : null;
}
