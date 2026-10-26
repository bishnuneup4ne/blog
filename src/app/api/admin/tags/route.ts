import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabaseAdmin
    .from("writeups")
    .select("tags")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const tags = Array.isArray(row.tags) ? row.tags : [];
    for (const tag of tags) {
      const name = typeof tag === "string" ? tag.trim() : "";
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = counts.get(key);
      if (existing === undefined) counts.set(key, 1);
      else counts.set(key, existing + 1);
    }
  }

  const tags = [...counts.keys()].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
  );

  return NextResponse.json(tags);
}
