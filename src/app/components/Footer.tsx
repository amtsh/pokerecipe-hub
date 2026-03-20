export default function Footer() {
  return (
    <footer className="border-t border-rule py-10 px-6">
      <div className="max-w-wide mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-faint">pokerecipe<span className="text-rule">.hub</span> — community-built</p>
        <p className="text-xs text-faint">
          Recipes link to{" "}
          <a href="https://poke.com" target="_blank" rel="noopener noreferrer"
             className="text-ink hover:text-muted underline underline-offset-2 transition-colors">
            poke.com
          </a>{" "}
          · not affiliated with Interaction
        </p>
      </div>
    </footer>
  );
}
