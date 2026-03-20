import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

/** GET /api/click — returns all { slug, clicks } rows */
export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ data: [] });

  const { data, error } = await sb.from("recipes").select("slug, clicks");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/click  { slug: string }
 * Atomically increments clicks. Requires:
 *
 *   create or replace function increment_clicks(recipe_slug text)
 *   returns void as $$
 *     insert into recipes (slug, clicks) values (recipe_slug, 1)
 *     on conflict (slug) do update set clicks = recipes.clicks + 1;
 *   $$ language sql;
 */
export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let slug: string | undefined;
  try { ({ slug } = await req.json()); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { error } = await sb.rpc("increment_clicks", { recipe_slug: slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
