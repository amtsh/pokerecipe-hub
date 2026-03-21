import { NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

/**
 * GET /api/categories
 * Returns a sorted list of distinct non-null category values.
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

    // Array.from avoids the --downlevelIteration requirement of [...new Set(...)]
    const categories = Array.from(
      new Set(
        (data ?? []).map((r) => r.category).filter((c): c is string => !!c)
      )
    ).sort();

    return NextResponse.json({ categories });
  } catch (e) {
    console.error("[/api/categories]", e);
    return NextResponse.json({ categories: [] });
  }
}
