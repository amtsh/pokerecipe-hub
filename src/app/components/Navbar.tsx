import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-rule">
      <div className="max-w-wide mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium tracking-tight text-ink hover:text-muted transition-colors">
          pokerecipe<span className="text-muted">.hub</span>
        </Link>
        <nav className="flex items-center gap-8">
          <Link href="/#browse" className="text-sm text-muted hover:text-ink transition-colors">Browse</Link>
          <Link href="/submit" className="text-sm font-medium bg-ink text-white px-4 py-1.5 rounded-full hover:bg-muted transition-colors">
            Submit
          </Link>
        </nav>
      </div>
    </header>
  );
}
