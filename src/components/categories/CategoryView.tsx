import Link from "next/link";
import type { CategoryNode } from "@/lib/categories";
import { formatCalendarDate } from "@/utils/formatDate";
import { CategoryDirectory } from "@/components/categories/CategoryDirectory";
import { PostList, type PostListItem } from "@/components/blog/PostList";
import { NoCover } from "@/components/blog/NoCover";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./CategoryView.module.scss";

export type CategoryPost = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  image?: string;
};

export function CategoryView({
  trail,
  tree,
  posts,
  allCount,
}: {
  trail: CategoryNode[];
  tree: CategoryNode[];
  posts: CategoryPost[];
  allCount: number;
}) {
  const node = trail[trail.length - 1];
  const [feature, ...rest] = posts;
  const updated = posts[0]?.publishedAt;
  const restItems: PostListItem[] = rest.map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    publishedAt: post.publishedAt,
    tags: post.tags,
    image: post.image,
  }));

  return (
    <div className={styles.view}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/categories">Categories</Link>
        {trail.slice(0, -1).map((ancestor) => (
          <span key={ancestor.id} className={styles.crumbItem}>
            <span aria-hidden="true">/</span>
            <Link href={`/category/${ancestor.slug}`}>{ancestor.name}</Link>
          </span>
        ))}
        <span aria-hidden="true">/</span>
        <span className={styles.crumbCurrent}>{node.name}</span>
      </nav>

      <div className={styles.layout}>
        <aside className={styles.side} data-motion>
          <CategoryDirectory
            tree={tree}
            activeCategory={node.slug}
            activeTag={null}
            allCount={allCount}
          />
        </aside>

        <main className={styles.main}>
          <header className={styles.chapter} data-motion>
            <p className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              Category
            </p>
            <h1 className={styles.title}>{node.name}</h1>
            {node.description ? (
              <p className={styles.lead}>{node.description}</p>
            ) : null}
            <p className={styles.meta}>
              <span>
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
              {node.children.length > 0 ? (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>
                    {node.children.length}{" "}
                    {node.children.length === 1 ? "subtopic" : "subtopics"}
                  </span>
                </>
              ) : null}
              {updated ? (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>Updated {formatCalendarDate(updated)}</span>
                </>
              ) : null}
            </p>
          </header>

          {feature ? (
            <article className={styles.feature} data-motion>
              <div className={styles.featureMedia}>
                {feature.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={feature.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <NoCover ratio="16 / 10" />
                )}
              </div>

              <div className={styles.featureBody}>
                <p className={styles.featureKicker}>Latest</p>
                <h2 className={styles.featureTitle}>
                  <Link href={`/blogs/${feature.slug}`}>{feature.title}</Link>
                </h2>
                {feature.summary ? (
                  <p className={styles.featureSummary}>{feature.summary}</p>
                ) : null}
                <p className={styles.featureMeta}>
                  <time dateTime={feature.publishedAt}>
                    {formatCalendarDate(feature.publishedAt)}
                  </time>
                  {feature.tags.length > 0 ? (
                    <>
                      <span aria-hidden="true">&middot;</span>
                      <span>{feature.tags[0]}</span>
                    </>
                  ) : null}
                </p>
                <Link
                  href={`/blogs/${feature.slug}`}
                  className={styles.featureCta}
                >
                  Read the post
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </article>
          ) : (
            <EmptyState
              title="Nothing published here yet"
              description="This category is ready — posts will show up as soon as they are published."
            />
          )}

          {restItems.length > 0 ? (
            <section className={styles.more} data-motion>
              <div className={styles.moreHead}>
                <h2 className={styles.moreTitle}>More in {node.name}</h2>
                <span className={styles.moreCount}>{restItems.length}</span>
              </div>
              <PostList posts={restItems} variant="list" />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
