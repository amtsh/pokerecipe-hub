import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

/** GET /api/click — returns all { slug, clicks } rows */
export async function GET() {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const { data, error } = await sb.from("recipes").select("slug, clicks");
    if (error) {
      console.error("[/api/click GET]", error.message);
      return NextResponse.json(ERR, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    console.error("[/api/click GET]", e);
    return NextResponse.json(ERR, { status: 500 });
  }
}

/**
 * POST /api/click  { slug: string }
 * Atomically increments clicks for the given slug.
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let slug: string | undefined;
    try { ({ slug } = await req.json()); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    if (!slug) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { error } = await sb.rpc("increment_clicks", { recipe_slug: slug });
    if (error) {
      console.error("[/api/click POST]", error.message);
      return NextResponse.json(ERR, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/click POST]", e);
    return NextResponse.json(ERR, { status: 500 });
  }
}
