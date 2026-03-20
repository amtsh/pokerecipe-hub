import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

const ERR = { error: "Internal Server Error" };

export async function GET() {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const { data, error } = await sb
      .from("recipes")
      .select("slug, name, description, url, clicks")
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
 * POST /api/recipes  { slug, name, description, canonical }
 * Saves a submitted recipe to Supabase. Re-submitting an existing slug is a no-op.
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
