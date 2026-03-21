import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pokerecipe.book",
  description: "Discover and share Poke recipes built by the community.",
};

// Inline script runs before hydration to apply saved theme without flash
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
