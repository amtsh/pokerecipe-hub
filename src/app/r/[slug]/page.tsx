import { redirect } from "next/navigation";

/**
 * Recipe detail pages have been removed.
 * Any existing links (e.g. from the sitemap or external shares) are
 * redirected straight to the canonical poke.com recipe page.
 */
export default function RecipeRedirect({ params }: { params: { slug: string } }) {
  redirect(`https://poke.com/r/${params.slug}`);
}
