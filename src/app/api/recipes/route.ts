import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

/**
 * GET /api/recipes
 * Returns the top 10 recipes ordered by clicks descending.
 */
export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ data: [] });

  const { data, error } = await sb
    .from("recipes")
    .select("slug, name, description, url, clicks")
    .order("clicks", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/recipes  { slug, name, description, canonical }
 * Inserts a new recipe submitted via the /submit page.
 * Uses ignoreDuplicates so re-submitting an existing slug is a no-op.
 *
 * Requires the updated recipes table:
 *   alter table recipes
 *     add column if not exists name        text,
 *     add column if not exists description text,
 *     add column if not exists url         text;
 */
export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let body: Record<string, string>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { slug, name, description, canonical } = body;
  if (!slug || !canonical) {
    return NextResponse.json({ error: "slug and canonical are required" }, { status: 400 });
  }

  const { error } = await sb.from("recipes").upsert(
    { slug, name: name || slug, description: description || "", url: canonical, clicks: 0 },
    { onConflict: "slug", ignoreDuplicates: true }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
