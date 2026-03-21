export default function Hero() {
  return (
    <section className="pt-36 sm:pt-52 pb-16 sm:pb-24 px-4 sm:px-6 text-center">
      <div className="max-w-content mx-auto">
        <p className="text-[0.6rem] tracking-[0.22em] uppercase text-faint dark:text-darkFaint mb-7 font-medium">
          Community
        </p>
        <h1 className="text-[1.85rem] sm:text-[2.25rem] leading-[1.08] tracking-[-0.05em] font-semibold text-ink dark:text-white mb-4">
          Recipes for Poke.
        </h1>
        <p className="text-xs sm:text-sm text-muted dark:text-darkMuted leading-relaxed max-w-xs sm:max-w-sm mx-auto">
          The community-powered index for Poke automation recipes.
          Discover, share, and track the most useful automations.
        </p>
      </div>
    </section>
  );
}
