import { NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

/**
 * GET /api/categories
 * Returns an alphabetically sorted list of distinct non-null categories.
 */
export async function GET() {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ categories: [] });

    const { data, error } = await sb
      .from("recipes")
      .select("category")
      .not("category", "is", null)
      .not("category", "eq", "");

    if (error) {
      console.error("[/api/categories]", error.message);
      return NextResponse.json({ categories: [] });
    }

    const categories = [
      ...new Set((data ?? []).map((r) => r.category).filter(Boolean)),
    ].sort() as string[];

    return NextResponse.json({ categories });
  } catch (e) {
    console.error("[/api/categories]", e);
    return NextResponse.json({ categories: [] });
  }
}
