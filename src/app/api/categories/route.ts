import { NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

/** Normalise a category string to Title Case (single-word categories). */
function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * GET /api/categories
 * Returns a sorted list of distinct non-null category values, normalised to Title Case.
 */
export async function GET() {
  try {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ categories: [] });

    const { data, error } = await sb
      .from("recipes")
      .select("category")
      .eq("approved", true)
      .not("category", "is", null)
      .not("category", "eq", "");

    if (error) {
      console.error("[/api/categories]", error.message);
      return NextResponse.json({ categories: [] });
    }

    const categories = Array.from(
      new Set(
        (data ?? [])
          .map((r) => r.category)
          .filter((c): c is string => !!c)
          .map(titleCase)
      )
    ).sort();

    return NextResponse.json({ categories });
  } catch (e) {
    console.error("[/api/categories]", e);
    return NextResponse.json({ categories: [] });
  }
}
