export default function Hero() {
  return (
    <section className="pt-24 sm:pt-40 pb-16 sm:pb-28 px-4 sm:px-6 text-center">
      <div className="max-w-content mx-auto">
        <p className="text-xs tracking-widest uppercase text-faint dark:text-darkFaint mb-6 sm:mb-8 font-medium">
          Community
        </p>
        <h1 className="text-3xl sm:text-[2.75rem] leading-[1.1] tracking-[-0.04em] font-semibold text-ink dark:text-white mb-4 sm:mb-6">
          Recipes for Poke.
        </h1>
        <p className="text-sm sm:text-base text-muted dark:text-darkMuted leading-relaxed max-w-xs sm:max-w-sm mx-auto mb-8 sm:mb-12">
          Discover, share, and add community-built Poke recipes in one click.
          Every recipe links to{" "}
          <code className="font-mono text-xs sm:text-[0.8rem] text-ink dark:text-white bg-lift dark:bg-darkInput px-1.5 py-0.5 rounded">
            poke.com/r/&hellip;
          </code>
        </p>
        <a
          href="#browse"
          className="inline-block text-sm font-medium bg-ink text-white dark:bg-white dark:text-ink px-6 sm:px-7 py-3 rounded-full hover:opacity-80 transition-opacity"
        >
          Browse recipes
        </a>
      </div>
    </section>
  );
}
