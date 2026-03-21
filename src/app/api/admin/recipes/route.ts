import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabase";

const UNAUTHORIZED = { error: "Unauthorized" };

/**
 * GET /api/admin/recipes?status=pending|approved&pin=XXXX
 *
 * Pending tab shows TWO kinds of recipes:
 *   1. approved = false          — traditional pending, needs approval decision
 *   2. approved = true, tweet_id IS NOT NULL — already live (auto-approved),
 *      but not yet acknowledged by admin (needs Reply or Dismiss)
 *
 * Manage tab shows:
 *   approved = true AND tweet_id IS NULL — fully handled, no action pending
 *
 * This lets tweet_id serve as the "needs admin attention" flag without a new column.
 * Acknowledging (Reply or Dismiss) sets tweet_id = null, moving the row to Manage.
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
    const sb = getSupabaseAdmin();
    if (!sb) return NextResponse.json({ data: [] });

    let query;

    if (status === "pending") {
      // Pending = unapproved OR (approved + has tweet_id awaiting acknowledgment)
      query = sb
        .from("recipes")
        .select("slug, name, description, category, clicks, submitted_at, tweet_id, approved")
        .or("approved.eq.false,and(approved.eq.true,tweet_id.not.is.null)")
        .order("submitted_at", { ascending: false });
    } else {
      // Manage = approved + tweet_id already cleared (acknowledged)
      query = sb
        .from("recipes")
        .select("slug, name, description, category, clicks, submitted_at, tweet_id, approved")
        .eq("approved", true)
        .is("tweet_id", null)
        .order("submitted_at", { ascending: false });
    }

    const { data, error } = await query;

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
