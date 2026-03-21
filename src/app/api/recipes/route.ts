import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

/**
 * GET /api/recipes?q=&category=&sort=newest|popular
 * Only returns approved recipes.
 */
export async function GET(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const { searchParams } = req.nextUrl;
    const q        = searchParams.get("q")?.trim()        ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const sort     = searchParams.get("sort")             ?? "newest";
    const isFiltered = q || category || sort === "popular";

    let qb = sb
      .from("recipes")
      .select("slug, name, description, clicks, featured, category")
      .eq("approved", true)
      .limit(isFiltered ? 20 : 10);

    if (q)        qb = qb.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    if (category) qb = qb.eq("category", category);

    if (sort === "popular") {
      qb = qb.order("clicks", { ascending: false });
    } else {
      qb = qb.order("featured",     { ascending: false });
      qb = qb.order("submitted_at", { ascending: false });
    }

    const { data, error } = await qb;

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
 * POST /api/recipes  { slug, name, description, category? }
 * Inserts with approved=false (requires admin approval before appearing on homepage).
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const { slug, name, description, category } = body;
    if (!slug) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const row: Record<string, unknown> = {
      slug,
      name:        name        || slug,
      description: description || "",
      clicks:      0,
      approved:    false,   // requires admin approval
    };
    if (category) row.category = category;

    const { error } = await sb.from("recipes").upsert(row, {
      onConflict:       "slug",
      ignoreDuplicates: true,
    });

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
