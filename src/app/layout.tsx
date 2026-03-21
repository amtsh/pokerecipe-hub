import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pokerecipe.book"),
  title: {
    default: "pokerecipe.book",
    template: "%s | pokerecipe.book",
  },
  description:
    "Discover and add community-built Poke recipes. One click to automate your day.",
  openGraph: {
    siteName: "pokerecipe.book",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@poke",
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
