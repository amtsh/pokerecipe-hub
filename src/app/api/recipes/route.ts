import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

/**
 * GET /api/recipes?q=<optional>
 * Without q: 10 most recent (featured first, then submitted_at DESC).
 * With q:    ilike search across name + description, up to 20 results.
 */
export async function GET(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

    let queryBuilder = sb
      .from("recipes")
      .select("slug, name, description, clicks, featured")
      .order("featured", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(q ? 20 : 10);

    if (q) {
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
 * POST /api/recipes  { slug, name, description }
 * Saves a new recipe. featured defaults to false in the DB.
 * Re-submitting an existing slug is a no-op (ignoreDuplicates).
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const { slug, name, description } = body;
    if (!slug) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await sb.from("recipes").upsert(
      // featured is intentionally omitted — DB defaults it to false
      { slug, name: name || slug, description: description || "", clicks: 0 },
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
