export default function Footer() {
  return (
    <footer className="border-t border-rule dark:border-darkBorder py-10 px-6 transition-colors">
      <div className="max-w-wide mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-faint dark:text-darkFaint">
          pokerecipe<span className="text-rule dark:text-darkBorder">.book</span> &mdash; community-built
        </p>
        <p className="text-xs text-faint dark:text-darkFaint">
          Recipes link to{" "}
          <a
            href="https://poke.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink dark:text-white hover:text-muted dark:hover:text-darkMuted underline underline-offset-2 transition-colors"
          >
            poke.com
          </a>
          {" "}&middot; not affiliated with Interaction
        </p>
      </div>
    </footer>
  );
}
