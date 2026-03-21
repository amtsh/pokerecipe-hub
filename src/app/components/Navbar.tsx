import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle";

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 dark:bg-darkBg/90 backdrop-blur-sm border-b border-rule dark:border-darkBorder transition-colors">
      <div className="max-w-wide mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium tracking-tight text-ink dark:text-white hover:text-muted dark:hover:text-darkMuted transition-colors"
        >
          pokerecipe<span className="text-muted dark:text-darkMuted">.book</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/#browse"
            className="hidden sm:inline-block text-sm text-muted dark:text-darkMuted hover:text-ink dark:hover:text-white transition-colors"
          >
            Browse
          </Link>
          <DarkModeToggle />
          <Link
            href="/submit"
            className="text-sm font-medium bg-ink text-white dark:bg-white dark:text-ink px-4 py-1.5 rounded-full hover:opacity-80 transition-opacity"
          >
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
