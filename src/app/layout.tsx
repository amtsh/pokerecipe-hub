import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pokerecipe.book"),
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
    url:         "https://pokerecipe.book",
  },
  twitter: {
    card:        "summary_large_image",
    site:        "@interaction",
    title:       "pokerecipe.book",
    description: "The community-powered index for Poke automation recipes.",
  },
  robots: { index: true, follow: true },
};

const themeScript = `(function(){
  var t=localStorage.getItem('theme');
  var d=window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(t==='dark'||(t===null&&d)){document.documentElement.classList.add('dark');}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-white dark:bg-darkBg text-ink dark:text-white transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
