/**
 * Decode HTML entities and JS-style unicode escapes in a string.
 * Safe to call on both server and client.
 *
 * Handles:
 *  - JS-style \uXXXX sequences (e.g. \u2026 → …)
 *  - Named HTML entities   (&hellip; &mdash; &rsquo; &amp; …)
 *  - Decimal numeric refs  (&#39; &#169;)
 *  - Hex numeric refs      (&#x27; &#xA9;)
 *  - Double-encoded entities (&amp;amp; → &amp; → &)
 */

const NAMED: Record<string, string> = {
  amp:    "&",  lt:     "<",  gt:     ">",  quot:   '"',  apos:   "'",
  nbsp:   "\u00A0",  shy:    "\u00AD",
  mdash:  "\u2014",  ndash:  "\u2013",
  lsquo:  "\u2018",  rsquo:  "\u2019",  sbquo:  "\u201A",
  ldquo:  "\u201C",  rdquo:  "\u201D",  bdquo:  "\u201E",
  laquo:  "\u00AB",  raquo:  "\u00BB",
  lsaquo: "\u2039",  rsaquo: "\u203A",
  hellip: "\u2026",  middot: "\u00B7",  bull:   "\u2022",
  prime:  "\u2032",  Prime:  "\u2033",  oline:  "\u203E",  frasl:  "\u2044",
  times:  "\u00D7",  divide: "\u00F7",  minus:  "\u2212",  plusmn: "\u00B1",
  frac14: "\u00BC",  frac12: "\u00BD",  frac34: "\u00BE",
  trade:  "\u2122",  reg:    "\u00AE",  copy:   "\u00A9",
  euro:   "\u20AC",  pound:  "\u00A3",  yen:    "\u00A5",  cent:   "\u00A2",
  larr:   "\u2190",  uarr:   "\u2191",  rarr:   "\u2192",  darr:   "\u2193",  harr:   "\u2194",
  // Accented Latin
  Agrave: "\u00C0", Aacute: "\u00C1", Acirc:  "\u00C2", Atilde: "\u00C3",
  Auml:   "\u00C4", Aring:  "\u00C5", AElig:  "\u00C6", Ccedil: "\u00C7",
  Egrave: "\u00C8", Eacute: "\u00C9", Ecirc:  "\u00CA", Euml:   "\u00CB",
  Igrave: "\u00CC", Iacute: "\u00CD", Icirc:  "\u00CE", Iuml:   "\u00CF",
  ETH:    "\u00D0", Ntilde: "\u00D1", Ograve: "\u00D2", Oacute: "\u00D3",
  Ocirc:  "\u00D4", Otilde: "\u00D5", Ouml:   "\u00D6", Oslash: "\u00D8",
  Ugrave: "\u00D9", Uacute: "\u00DA", Ucirc:  "\u00DB", Uuml:   "\u00DC",
  Yacute: "\u00DD", THORN:  "\u00DE", szlig:  "\u00DF",
  agrave: "\u00E0", aacute: "\u00E1", acirc:  "\u00E2", atilde: "\u00E3",
  auml:   "\u00E4", aring:  "\u00E5", aelig:  "\u00E6", ccedil: "\u00E7",
  egrave: "\u00E8", eacute: "\u00E9", ecirc:  "\u00EA", euml:   "\u00EB",
  igrave: "\u00EC", iacute: "\u00ED", icirc:  "\u00EE", iuml:   "\u00EF",
  eth:    "\u00F0", ntilde: "\u00F1", ograve: "\u00F2", oacute: "\u00F3",
  ocirc:  "\u00F4", otilde: "\u00F5", ouml:   "\u00F6", oslash: "\u00F8",
  ugrave: "\u00F9", uacute: "\u00FA", ucirc:  "\u00FB", uuml:   "\u00FC",
  yacute: "\u00FD", thorn:  "\u00FE", yuml:   "\u00FF",
};

const ENTITY_RE = /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g;

function decodeOnce(s: string): string {
  return s.replace(ENTITY_RE, (_match, dec, hex, name) => {
    if (dec)  return String.fromCodePoint(parseInt(dec, 10));
    if (hex)  return String.fromCodePoint(parseInt(hex, 16));
    if (name) return NAMED[name] ?? _match;
    return _match;
  });
}

export function decodeEntities(s: string): string {
  if (!s) return s;

  // Pre-pass: decode JS-style \uXXXX sequences that can appear in
  // JSON-LD blocks, script-injected content, or naively serialised strings.
  if (s.includes("\\u")) {
    s = s.replace(/\\u([0-9a-fA-F]{4})/gi, (_m, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    );
  }

  // HTML entity passes (up to two, to handle double-encoding)
  if (!s.includes("&")) return s;
  const once = decodeOnce(s);
  return once.includes("&") ? decodeOnce(once) : once;
}
