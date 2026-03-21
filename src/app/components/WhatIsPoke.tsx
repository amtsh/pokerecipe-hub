export default function WhatIsPoke() {
  return (
    <section className="border-t border-rule dark:border-darkBorder py-20 px-4 sm:px-6">
      <div className="max-w-content mx-auto text-center">
        <p className="text-xs tracking-widest uppercase text-faint dark:text-darkFaint mb-6 font-medium">
          About
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink dark:text-white mb-4">
          What is Poke?
        </h2>
        <p className="text-sm text-muted dark:text-darkMuted leading-relaxed max-w-md mx-auto mb-8">
          Poke is an AI assistant that lives in your iMessage and WhatsApp &mdash; no apps to download,
          no logins to manage. Recipes are pre-built automations you add in one tap: flight alerts,
          inbox triage, PR reviews, and more.
        </p>
        <a
          href="https://poke.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-ink dark:text-white underline underline-offset-2 hover:text-muted dark:hover:text-darkMuted transition-colors"
        >
          Learn more at poke.com &rarr;
        </a>
      </div>
    </section>
  );
}
