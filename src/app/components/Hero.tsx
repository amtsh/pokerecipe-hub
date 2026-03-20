export default function Hero() {
  return (
    <section className="pt-40 pb-28 px-6 text-center">
      <div className="max-w-content mx-auto">
        <p className="text-xs tracking-widest uppercase text-faint mb-8 font-medium">Community</p>
        <h1 className="text-[2.75rem] leading-[1.1] tracking-[-0.04em] font-semibold text-ink mb-6">
          Recipes for Poke.
        </h1>
        <p className="text-base text-muted leading-relaxed max-w-sm mx-auto mb-12">
          Discover, share, and add community-built Poke recipes in one click.
          Every recipe links to{" "}
          <code className="font-mono text-[0.8rem] text-ink bg-lift px-1.5 py-0.5 rounded">
            poke.com/r/&hellip;
          </code>
        </p>
        <a href="#browse" className="inline-block text-sm font-medium bg-ink text-white px-7 py-3 rounded-full hover:bg-muted transition-colors">
          Browse recipes
        </a>
      </div>
    </section>
  );
}
