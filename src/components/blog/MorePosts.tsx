import { getSupabasePosts } from "@/utils/supabasePosts";
import { PostList, type PostListItem } from "./PostList";
import pageStyles from "@/styles/page-shell.module.scss";

const LIMIT = 4;

type CurrentPost = {
  slug: string;
  tags?: string[];
  category?: string;
};

export async function MorePosts({ current }: { current: CurrentPost }) {
  const posts = await getSupabasePosts();
  const others = posts.filter((post) => post.slug !== current.slug);
  if (others.length === 0) return null;

  const wantedTags = new Set(
    (current.tags || []).map((tag) => String(tag).toLowerCase().trim()).filter(Boolean),
  );
  const wantedCategory = String(current.category || "").toLowerCase().trim();

  const byNewest = (a: (typeof others)[number], b: (typeof others)[number]) =>
    new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime();

  const sharedScore = (post: (typeof others)[number]) => {
    const tags = (post.metadata.tags || [])
      .map((tag) => String(tag).toLowerCase().trim())
      .filter(Boolean);
    const category = String((post.metadata as { category?: string }).category || "")
      .toLowerCase()
      .trim();
    return tags.filter((tag) => wantedTags.has(tag)).length + (wantedCategory && category === wantedCategory ? 1 : 0);
  };

  const related = others
    .map((post) => ({ post, score: sharedScore(post) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || byNewest(a.post, b.post))
    .map((entry) => entry.post);
  const relatedSlugs = new Set(related.map((post) => post.slug));

  const picked = [...related, ...others.filter((post) => !relatedSlugs.has(post.slug)).sort(byNewest)]
    .slice(0, LIMIT)
    .map<PostListItem>((post) => ({
      slug: post.slug,
      title: post.metadata.title,
      summary: post.metadata.summary,
      publishedAt: post.metadata.publishedAt,
      category: (post.metadata as { category?: string }).category,
      tags: post.metadata.tags ?? [],
      image: post.metadata.image,
    }));

  return (
    <section className={pageStyles.recent}>
      <h2 className={pageStyles.recentTitle}>More posts</h2>
      <PostList posts={picked} variant="list" columns={1} />
    </section>
  );
}
