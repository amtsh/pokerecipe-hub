import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../../lib/supabase";

const UNAUTHORIZED = { error: "Unauthorized" };

/**
 * GET /api/admin/recipes?status=pending|approved&pin=XXXX
 * Returns recipes filtered by approval status after validating the admin PIN.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const pin    = searchParams.get("pin")    ?? "";
  const status = searchParams.get("status") ?? "pending";

  const adminPin = process.env.ADMIN_PIN ?? "1234";
  if (pin !== adminPin) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ data: [] });

    const approved = status === "approved";

    const { data, error } = await sb
      .from("recipes")
      .select("slug, name, description, category, clicks, submitted_at")
      .eq("approved", approved)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("[/api/admin/recipes]", error.message);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    console.error("[/api/admin/recipes]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
