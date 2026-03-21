import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle";

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/75 dark:bg-[#0a0a0a]/75 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]">
      <div className="max-w-wide mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-ink dark:text-white hover:opacity-60 transition-opacity"
        >
          pokerecipebook<span className="text-muted dark:text-darkMuted font-normal">.com</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <DarkModeToggle />
          <Link
            href="/submit"
            className="text-sm font-medium bg-ink text-white dark:bg-white dark:text-ink px-4 py-1.5 rounded-full hover:opacity-75 active:scale-[0.96] transition-all duration-100"
          >
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
