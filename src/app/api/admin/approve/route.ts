import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../../lib/supabase";

/**
 * POST /api/admin/approve  { slug: string, pin: string }
 * Sets approved=true for the given recipe after validating the admin PIN.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { slug?: string; pin?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const adminPin = process.env.ADMIN_PIN ?? "1234";
    if (!body.pin || body.pin !== adminPin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!body.slug) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const { error } = await sb
      .from("recipes")
      .update({ approved: true })
      .eq("slug", body.slug);

    if (error) {
      console.error("[/api/admin/approve]", error.message);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/admin/approve]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
