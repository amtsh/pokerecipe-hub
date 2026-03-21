export default function WhatIsPoke() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-content mx-auto text-center">
        <p className="text-[0.6rem] tracking-[0.22em] uppercase text-faint dark:text-darkFaint mb-5 font-medium">
          About
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white mb-3">
          What is Poke?
        </h2>
        <p className="text-xs sm:text-sm text-muted dark:text-darkMuted leading-relaxed max-w-md mx-auto mb-7">
          Poke is an AI assistant that lives in your iMessage and WhatsApp &mdash; no apps to
          download, no logins to manage. Recipes are pre-built automations you add in one tap:
          flight alerts, inbox triage, PR reviews, and more.
        </p>
        <a
          href="https://poke.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-ink dark:text-white underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          Learn more at poke.com &rarr;
        </a>
      </div>
    </section>
  );
}
