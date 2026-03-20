import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

/**
 * GET /api/click
 * Returns all { slug, clicks } rows from the recipes table.
 */
export async function GET() {
  const { data, error } = await supabase.from("recipes").select("slug, clicks");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/click  { slug: string }
 * Atomically increments clicks for the given slug.
 *
 * Requires this Postgres function in Supabase:
 *
 *   create or replace function increment_clicks(recipe_slug text)
 *   returns void as $$
 *     insert into recipes (slug, clicks) values (recipe_slug, 1)
 *     on conflict (slug) do update set clicks = recipes.clicks + 1;
 *   $$ language sql;
 */
export async function POST(req: NextRequest) {
  let slug: string | undefined;
  try { ({ slug } = await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { error } = await supabase.rpc("increment_clicks", { recipe_slug: slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
