import { Posts } from "@/components/blog/Posts";
import { VideoList } from "@/components/blog/VideoList";
import { getSupabasePosts } from "@/utils/supabasePosts";
import Link from "next/link";
import pageStyles from "@/styles/page-shell.module.scss";
import styles from "./personal.module.scss";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Personal",
    description: "Personal blogs and videos",
  };
}

export default async function Personal({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "blogs" } = await searchParams;
  const isVideos = tab === "videos";
  const posts = await getSupabasePosts();
  const personal = posts.filter(
    (post) =>
      (post.metadata as { category?: string }).category?.toLowerCase() === "personal",
  );

  return (
    <div className={pageStyles.shell}>
      <div className={pageStyles.page}>
        <header className={pageStyles.pageHeader} data-motion>
          <div>
            <h1 className={pageStyles.pageTitle}>Personal</h1>
          </div>
          <nav className={styles.tabs} aria-label="Personal sections">
            <Link
              href="/personal?tab=blogs"
              className={!isVideos ? styles.tabActive : styles.tab}
            >
              Blogs
            </Link>
            <Link
              href="/personal?tab=videos"
              className={isVideos ? styles.tabActive : styles.tab}
            >
              Videos
            </Link>
          </nav>
        </header>

        {isVideos ? (
          <VideoList category="Personal" />
        ) : (
          <Posts
            posts={personal}
            videoOnly={false}
          />
        )}
      </div>
    </div>
  );
}
