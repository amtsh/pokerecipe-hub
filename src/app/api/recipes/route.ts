import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

/** GET /api/recipes — top 10 URLs ordered by clicks */
export async function GET() {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const { data, error } = await sb
      .from("recipes")
      .select("url, clicks")
      .order("clicks", { ascending: false })
      .limit(10);

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
 * POST /api/recipes  { url: string }
 * Saves only the canonical URL with clicks=0.
 * Name and description are NOT stored — they are fetched on the fly by the scraper.
 * Re-submitting an existing URL is a no-op (ignoreDuplicates).
 */
export async function POST(req: NextRequest) {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const { canonical } = body;
    if (!canonical) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await sb
      .from("recipes")
      .upsert({ url: canonical, clicks: 0 }, { onConflict: "url", ignoreDuplicates: true });

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
