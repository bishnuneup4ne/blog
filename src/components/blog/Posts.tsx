import { getSupabasePosts } from "@/utils/supabasePosts";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostList } from "./PostList";

export async function Posts({
  posts: postsProp,
  videoOnly,
}: {
  /** Pass preloaded posts to avoid duplicate Supabase calls on the same page */
  posts?: Awaited<ReturnType<typeof getSupabasePosts>>;
  videoOnly?: boolean;
} = {}) {
  let allBlogs = postsProp ?? (await getSupabasePosts());

  if (videoOnly === true) {
    allBlogs = allBlogs.filter((post) => !!(post.metadata as { video_url?: string }).video_url);
  } else if (videoOnly === false) {
    allBlogs = allBlogs.filter((post) => !(post.metadata as { video_url?: string }).video_url);
  }

  const sorted = allBlogs.sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        description="Blog posts will show up here as soon as they are published."
      />
    );
  }

  return (
    <PostList
      posts={sorted.map((post) => ({
        slug: post.slug,
        title: post.metadata.title,
        summary: post.metadata.summary,
        publishedAt: post.metadata.publishedAt,
        category: (post.metadata as { category?: string }).category,
        tags: post.metadata.tags ?? [],
        image: post.metadata.image,
      }))}
    />
  );
}
