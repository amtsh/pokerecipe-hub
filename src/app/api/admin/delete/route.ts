import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase";

/**
 * POST /api/admin/delete  { slug: string, pin: string }
 * Permanently deletes a recipe after validating the admin PIN.
 * Uses the service role client to bypass RLS.
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

    const sb = getSupabaseAdmin();
    if (!sb) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    const { error } = await sb
      .from("recipes")
      .delete()
      .eq("slug", body.slug);

    if (error) {
      console.error("[/api/admin/delete]", error.message);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[/api/admin/delete]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
