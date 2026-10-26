import { NextResponse } from "next/server";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { getCategoriesWithCounts } from "@/lib/categories";

export type SearchEntry = {
  kind: "post" | "category" | "page" | "tool";
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
};

export const revalidate = 300;

export async function GET() {
  const [posts, categories] = await Promise.all([
    getSupabasePosts(),
    getCategoriesWithCounts().catch(() => [] as Awaited<ReturnType<typeof getCategoriesWithCounts>>),
  ]);

  const entries: SearchEntry[] = [];

  for (const p of posts) {
    entries.push({
      kind: "post",
      title: p.metadata.title,
      subtitle: p.metadata.summary || "",
      href: `/blogs/${p.slug}`,
      keywords: [
        p.metadata.category || "",
        ...(p.metadata.tags || []),
      ].filter(Boolean),
    });
  }

  for (const c of categories) {
    entries.push({
      kind: "category",
      title: c.name,
      subtitle: `${c.count} ${c.count === 1 ? "post" : "posts"}`,
      href: `/category/${c.slug}`,
      keywords: ["category"],
    });
  }

  const staticPages: SearchEntry[] = [
    { kind: "page", title: "Home", subtitle: "Latest posts", href: "/blogs", keywords: ["home", "blog"] },
    { kind: "page", title: "Categories", subtitle: "Browse all topics", href: "/categories", keywords: ["category", "index"] },
    { kind: "page", title: "Personal", subtitle: "Personal blogs & videos", href: "/personal", keywords: ["personal", "videos"] },
    { kind: "page", title: "Gallery", subtitle: "Photo gallery", href: "/gallery", keywords: ["gallery", "photos"] },
    { kind: "page", title: "About", subtitle: "About the author", href: "/about", keywords: ["about", "me"] },
    { kind: "tool", title: "Diagram Builder", subtitle: "Draw flow & sequence diagrams", href: "/tools/diagram-builder", keywords: ["tool", "diagram", "mermaid", "flowchart"] },
  ];
  entries.push(...staticPages);

  return NextResponse.json(
    { entries },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
