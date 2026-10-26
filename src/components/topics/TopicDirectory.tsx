import Link from "next/link";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { getSiteConfig } from "@/lib/config";
import { getCategoriesWithCounts } from "@/lib/categories";
import { formatCalendarDate } from "@/utils/formatDate";
import { Mailchimp } from "@/components/Mailchimp";
import { PostList, type PostListItem } from "@/components/blog/PostList";
import pageStyles from "@/styles/page-shell.module.scss";
import styles from "./TopicDirectory.module.scss";

const LATEST_COUNT = 6;

function toFeedItem(
  post: Awaited<ReturnType<typeof getSupabasePosts>>[number],
): PostListItem {
  return {
    slug: post.slug,
    title: post.metadata.title,
    summary: post.metadata.summary,
    publishedAt: post.metadata.publishedAt,
    category: post.metadata.category,
    image: post.metadata.image,
  };
}

function longDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function Arrow() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function FeaturedPost({ post }: { post: PostListItem }) {
  return (
    <Link href={`/blogs/${post.slug}`} className={styles.feature} data-motion>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.featureImage}
        src={post.image}
        alt=""
        loading="eager"
        decoding="async"
      />
      <span className={styles.featureScrim} aria-hidden="true" />

      <span className={styles.featureBody}>
        <span className={styles.featureMeta}>
          {post.category ? <span>{post.category}</span> : null}
          <span>{formatCalendarDate(post.publishedAt)}</span>
        </span>
        <span className={styles.featureTitle}>{post.title}</span>
        {post.summary ? (
          <span className={styles.featureSummary}>{post.summary}</span>
        ) : null}
        <span className={styles.featureCta}>
          Read the story <Arrow />
        </span>
      </span>
    </Link>
  );
}

export async function TopicDirectory() {
  const [allPosts, config, topics] = await Promise.all([
    getSupabasePosts(),
    getSiteConfig(),
    getCategoriesWithCounts(),
  ]);

  const posts = allPosts
    .filter((post) => !post.metadata.video_url?.trim())
    .sort(
      (a, b) =>
        new Date(b.metadata.publishedAt).getTime() -
        new Date(a.metadata.publishedAt).getTime(),
    );

  const latest = posts.slice(0, LATEST_COUNT).map(toFeedItem);
  const lead = latest[0];
  const featured = lead?.image ? lead : null;
  const feed = featured ? latest.slice(1) : latest;
  const { person, home } = config;

  const ids = new Set(topics.map((topic) => topic.id));
  const roots = topics.filter((topic) => !topic.parent_id || !ids.has(topic.parent_id));
  const updated = longDate(posts[0]?.metadata.publishedAt);

  return (
    <div className={pageStyles.shell}>
      <div className={`${pageStyles.page} ${styles.page}`}>
        <section className={styles.hero} data-motion>
          <p className={styles.kicker}>
            {person.avatar ? (
              <img className={styles.kickerAvatar} src={person.avatar} alt="" />
            ) : null}
            <span>{person.name}</span>
          </p>
          <h1 className={styles.headline}>{home.headline}</h1>
          {home.subline ? <p className={styles.subline}>{home.subline}</p> : null}
          <div className={styles.ctas}>
            <Link href="/blogs" className={styles.ctaPrimary}>
              <span>Start reading</span>
              <Arrow />
            </Link>
            <Link href="/categories" className={styles.ctaGhost}>
              Browse topics
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
            </Link>
          </div>
          <p className={styles.heroMeta}>
            <span>
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {roots.length} {roots.length === 1 ? "topic" : "topics"}
            </span>
            {updated ? (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>Updated {updated}</span>
              </>
            ) : null}
            <span aria-hidden="true">&middot;</span>
            <a href="/api/rss" className={styles.rss}>
              RSS
            </a>
          </p>
        </section>

        {latest.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHead} data-motion>
              <h2 className={styles.sectionTitle}>Latest writing</h2>
              <Link href="/blogs" className={styles.sectionLink}>
                All posts <Arrow />
              </Link>
            </div>
            {featured ? <FeaturedPost post={featured} /> : null}
            {feed.length > 0 ? (
              <div className={styles.gridWrap}>
                <PostList posts={feed} />
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={styles.section} data-motion>
          <Mailchimp />
        </section>
      </div>
    </div>
  );
}
