export default function Footer() {
  return (
    <footer className="px-6 pt-6 pb-40">
      <div className="max-w-wide mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-faint dark:text-darkFaint">
          pokerecipebook<span className="opacity-40">.com</span>
        </p>
        <p className="text-xs text-faint dark:text-darkFaint">
          Recipes link to{" "}
          <a
            href="https://poke.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink dark:text-white hover:opacity-60 transition-opacity"
          >
            poke.com
          </a>
          {" "}&middot; not affiliated with Interaction
        </p>
      </div>
    </footer>
  );
}
