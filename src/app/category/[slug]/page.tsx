import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView, type CategoryPost } from "@/components/categories/CategoryView";
import { getCategoryTrail, getCategoryTree, getNavCategories } from "@/lib/categories";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { baseURL } from "@/resources";
import pageStyles from "@/styles/page-shell.module.scss";

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await getNavCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getCategoryTrail(slug);
  if (!trail) return { title: "Not found" };
  const node = trail[trail.length - 1];
  return {
    title: node.name,
    description: node.description || `Posts filed under ${node.name}.`,
    alternates: { canonical: `${baseURL}/category/${node.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [trail, allPosts, tree] = await Promise.all([
    getCategoryTrail(slug),
    getSupabasePosts(),
    getCategoryTree(),
  ]);

  if (!trail) notFound();

  const node = trail[trail.length - 1];
  const wanted = node.name.toLowerCase();
  const allCount = allPosts.filter((post) => !post.metadata.video_url?.trim()).length;

  const posts: CategoryPost[] = allPosts
    .filter((post) => !post.metadata.video_url?.trim())
    .filter((post) => post.metadata.category?.toLowerCase() === wanted)
    .sort(
      (a, b) =>
        new Date(b.metadata.publishedAt).getTime() -
        new Date(a.metadata.publishedAt).getTime(),
    )
    .map((post) => ({
      slug: post.slug,
      title: post.metadata.title,
      summary: post.metadata.summary,
      publishedAt: post.metadata.publishedAt,
      tags: post.metadata.tags ?? [],
      image: post.metadata.image ?? "",
    }));

  return (
    <div className={`${pageStyles.shell} ${pageStyles.wide}`}>
      <div className={`${pageStyles.page} ${pageStyles.wide}`}>
        <CategoryView
          trail={trail}
          tree={tree}
          posts={posts}
          allCount={allCount}
        />
      </div>
    </div>
  );
}
