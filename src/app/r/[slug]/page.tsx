import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import Navbar            from "../../components/Navbar";
import Footer            from "../../components/Footer";
import { getSupabase }   from "../../../../lib/supabase";

export const revalidate = 60; // Re-generate every 60 s

interface Props { params: { slug: string } }

async function getRecipe(slug: string) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("recipes")
    .select("slug, name, description, clicks, featured, category, submitted_at")
    .eq("slug", slug)
    .single();
  return data ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe(params.slug);
  if (!recipe) return { title: "Recipe not found" };

  const ogImage = `https://poke.com/r/${params.slug}/opengraph-image`;
  const desc    = recipe.description
    ? recipe.description.replace(/\u2026$/, "") + " — add this recipe to your Poke."
    : `Add ${recipe.name} to your Poke in one click.`;

  return {
    title: recipe.name,
    description: desc,
    openGraph: {
      title:       recipe.name,
      description: desc,
      url:         `/r/${params.slug}`,
      images:      [{ url: ogImage, width: 1200, height: 630, alt: recipe.name }],
      type:        "website",
    },
    twitter: {
      card:        "summary_large_image",
      title:       recipe.name,
      description: desc,
      images:      [ogImage],
    },
  };
}

export default async function RecipePage({ params }: Props) {
  const recipe = await getRecipe(params.slug);
  if (!recipe) notFound();

  const pokeUrl   = `https://poke.com/r/${params.slug}`;
  const ogImgUrl  = `https://poke.com/r/${params.slug}/opengraph-image`;
  const submitted = recipe.submitted_at
    ? new Date(recipe.submitted_at).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <>
      <Navbar />
      <main className="pt-14 min-h-screen bg-white dark:bg-darkBg">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-12 sm:py-20">

          <Link
            href="/"
            className="text-xs text-faint dark:text-darkFaint hover:text-muted dark:hover:text-darkMuted transition-colors inline-block mb-10"
          >
            &larr; All recipes
          </Link>

          {/* OG image */}
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-lift dark:bg-darkInput mb-8 shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImgUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {recipe.featured && (
              <span className="text-[0.6rem] tracking-widest uppercase font-bold border border-ink/30 dark:border-white/30 text-ink dark:text-white px-2.5 py-1 rounded-full">
                &#9733; Featured
              </span>
            )}
            {recipe.category && (
              <span className="text-[0.6rem] tracking-widest uppercase font-medium border border-rule dark:border-darkBorder text-faint dark:text-darkFaint px-2.5 py-1 rounded-full">
                {recipe.category}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-ink dark:text-white mb-3">
            {recipe.name}
          </h1>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-muted dark:text-darkMuted leading-relaxed mb-8 max-w-prose">
              {recipe.description}
            </p>
          )}

          {/* CTA */}
          <a
            href={pokeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-ink text-white dark:bg-white dark:text-ink text-sm font-medium px-6 py-3 rounded-full hover:opacity-80 transition-opacity"
          >
            View on Poke &rarr;
          </a>

          {/* Meta footer */}
          <div className="flex items-center gap-4 mt-10 pt-8 border-t border-rule dark:border-darkBorder">
            <span className="text-xs text-faint dark:text-darkFaint">by Amit Shinde</span>
            {recipe.clicks > 0 && (
              <span className="text-xs text-faint dark:text-darkFaint">
                {recipe.clicks.toLocaleString()} view{recipe.clicks !== 1 ? "s" : ""}
              </span>
            )}
            {submitted && (
              <span className="text-xs text-faint dark:text-darkFaint">Added {submitted}</span>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
