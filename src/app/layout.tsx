import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

/**
 * Canonical site URL.
 * Falls back through Vercel env vars to the known production alias.
 * Once pokerecipe.book DNS is pointed at this Vercel project, update here.
 */
const SITE_URL =
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://pokerecipebook.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  "pokerecipe.book",
    template: "%s | pokerecipe.book",
  },
  description:
    "The community-powered index for Poke automation recipes. Discover, share, and track the most useful automations.",
  openGraph: {
    siteName:    "pokerecipe.book",
    title:       "pokerecipe.book",
    description: "The community-powered index for Poke automation recipes. Discover, share, and track the most useful automations.",
    type:        "website",
    locale:      "en_US",
    url:         SITE_URL,
  },
  twitter: {
    card:        "summary_large_image",
    site:        "@interaction",
    title:       "pokerecipe.book",
    description: "The community-powered index for Poke automation recipes.",
  },
  robots: { index: true, follow: true },
};

/**
 * Inline script runs before React hydration.
 * Reads theme from cookie first, localStorage second.
 * Default = Light (class is only added if theme is explicitly 'dark').
 * This eliminates the dark-flash on initial load.
 */
const themeScript = `(function(){
  function gc(n){return (document.cookie.match('(?:^|;)\\s?'+n+'=([^;]+)')||[])[1];}
  var t = gc('theme') || localStorage.getItem('theme');
  if (t === 'dark') { document.documentElement.classList.add('dark'); }
})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side cookie read — avoids flash without the inline script on SSR pages.
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const isDark      = themeCookie === "dark";

  return (
    <html
      lang="en"
      className={isDark ? "dark" : ""}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before paint to prevent flash on client-navigations */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-white dark:bg-darkBg text-ink dark:text-white transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
