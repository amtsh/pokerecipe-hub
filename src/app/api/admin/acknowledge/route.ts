import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase";

/**
 * POST /api/admin/acknowledge  { slug: string, pin: string }
 *
 * Marks an already-approved (live) recipe as acknowledged by the admin:
 * sets tweet_id = null, which removes it from the Pending tab and
 * moves it to the Manage tab.
 *
 * Used by the "Reply" and "Dismiss" actions on auto-approved scraper recipes.
 * The recipe stays approved=true and visible on the homepage throughout.
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
      .update({ tweet_id: null })
      .eq("slug", body.slug)
      .eq("approved", true); // Safety: only acknowledge already-approved recipes

    if (error) {
      console.error("[/api/admin/acknowledge]", error.message);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[/api/admin/acknowledge]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
