import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

/** GET /api/click — returns all { url, clicks } rows */
export async function GET() {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const { data, error } = await sb.from("recipes").select("url, clicks");
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
 * POST /api/click  { url: string }
 * Atomically increments clicks for the given URL.
 * Calls the increment_clicks(recipe_url) Postgres function.
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let url: string | undefined;
    try { ({ url } = await req.json()); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    if (!url) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { error } = await sb.rpc("increment_clicks", { recipe_url: url });
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
