export default function Hero() {
  return (
    <section className="pt-36 sm:pt-52 pb-16 sm:pb-24 px-4 sm:px-6 text-center">
      <div className="max-w-content mx-auto">
        <p className="text-[0.65rem] tracking-[0.22em] uppercase text-faint dark:text-darkFaint mb-8 font-medium">
          Community
        </p>
        <h1 className="text-4xl sm:text-[3.25rem] leading-[1.06] tracking-[-0.05em] font-semibold text-ink dark:text-white mb-5">
          Recipes for Poke.
        </h1>
        <p className="text-sm sm:text-base text-muted dark:text-darkMuted leading-relaxed max-w-[18rem] sm:max-w-xs mx-auto mb-10 sm:mb-12">
          Discover and add community-built automations. One tap to start.
        </p>
        <a
          href="#browse"
          className="inline-block text-sm font-medium bg-ink text-white dark:bg-white dark:text-ink px-6 sm:px-7 py-3 rounded-full hover:opacity-75 transition-opacity"
        >
          Browse recipes
        </a>
      </div>
    </section>
  );
}
