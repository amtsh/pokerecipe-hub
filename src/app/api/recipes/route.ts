import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR      = { error: "Internal Server Error" };
const PAGE_MAX = 50;
const PAGE_DEF = 12;

/**
 * GET /api/recipes?q=&category=&sort=newest|popular&limit=12&offset=0
 * Only returns approved recipes.
 */
export async function GET(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const { searchParams } = req.nextUrl;
    const q        = searchParams.get("q")?.trim()        ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const sort     = searchParams.get("sort")             ?? "popular";
    const limit    = Math.min(Math.max(parseInt(searchParams.get("limit")  ?? String(PAGE_DEF), 10) || PAGE_DEF, 1), PAGE_MAX);
    const offset   = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    let qb = sb
      .from("recipes")
      .select("slug, name, description, clicks, featured, category")
      .eq("approved", true)
      .range(offset, offset + limit - 1);

    if (q)        qb = qb.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    if (category) qb = qb.eq("category", category);

    if (sort === "newest") {
      qb = qb.order("featured",     { ascending: false });
      qb = qb.order("submitted_at", { ascending: false });
    } else {
      qb = qb.order("clicks", { ascending: false });
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
 * POST /api/recipes  { slug, name, description, category?, tweet_id? }
 * Inserts with approved=false (requires admin approval).
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const { slug, name, description, category, tweet_id } = body;
    if (!slug) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const row: Record<string, unknown> = {
      slug,
      name:        name        || slug,
      description: description || "",
      clicks:      0,
      approved:    false,
    };
    if (category) row.category  = category;
    if (tweet_id) row.tweet_id  = tweet_id;

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
