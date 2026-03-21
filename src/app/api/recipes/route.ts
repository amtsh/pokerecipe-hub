import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

/**
 * GET /api/recipes?q=<optional search term>
 * Without q: returns 10 most recently submitted recipes.
 * With q:    full-text search across name and description (case-insensitive),
 *            up to 20 results, still ordered newest-first.
 */
export async function GET(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    let queryBuilder = sb
      .from("recipes")
      .select("slug, name, description, clicks")
      .order("submitted_at", { ascending: false })
      .limit(q ? 20 : 10);

    if (q) {
      // ilike = case-insensitive LIKE; search both name and description
      queryBuilder = queryBuilder.or(
        `name.ilike.%${q}%,description.ilike.%${q}%`
      );
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error("[/api/recipes GET]", error.message);
      return NextResponse.json(ERR, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    console.error("[/api/recipes GET]", e);
    return NextResponse.json(ERR, { status: 500 });
  }
}

/**
 * POST /api/recipes  { slug, name, description, canonical }
 * Saves recipe metadata. Re-submitting an existing slug is a no-op.
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const { slug, name, description, canonical } = body;
    if (!slug || !canonical) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await sb.from("recipes").upsert(
      { slug, name: name || slug, description: description || "", url: canonical, clicks: 0 },
      { onConflict: "slug", ignoreDuplicates: true }
    );

    if (error) {
      console.error("[/api/recipes POST]", error.message);
      return NextResponse.json(ERR, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/recipes POST]", e);
    return NextResponse.json(ERR, { status: 500 });
  }
}
