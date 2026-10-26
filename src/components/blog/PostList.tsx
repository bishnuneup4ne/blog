import Link from "next/link";
import { formatCalendarDate } from "@/utils/formatDate";
import { PostCover } from "./PostCover";
import { NoCover } from "./NoCover";
import styles from "./PostList.module.scss";

export type PostListItem = {
  slug: string;
  title: string;
  summary?: string;
  publishedAt: string;
  category?: string;
  tags?: string[];
  image?: string;
};

function Meta({
  post,
  showCategory,
  className,
}: {
  post: PostListItem;
  showCategory: boolean;
  className: string;
}) {
  return (
    <div className={className}>
      <span className={styles.date}>{formatCalendarDate(post.publishedAt)}</span>
      {showCategory && post.category ? (
        <Link
          href={`/blogs?category=${encodeURIComponent(post.category)}`}
          className={styles.category}
        >
          {post.category}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * The site's post feed. `grid` is a wall of cover-art cards, `list` is the
 * compact text-only column used inside an article measure.
 */
export function PostList({
  posts,
  showCategory = false,
  variant = "grid",
  columns,
}: {
  posts: PostListItem[];
  showCategory?: boolean;
  variant?: "grid" | "list";
  columns?: 1 | 2 | 3;
}) {
  if (variant === "list") {
    return (
      <div className={styles.rows} data-cols={columns} data-motion-group>
        {posts.map((post) => (
          <div className={styles.row} key={post.slug} data-motion-item>
            <Meta post={post} showCategory={showCategory} className={styles.meta} />
            <Link href={`/blogs/${post.slug}`} className={styles.rowTitle}>
              {post.title}
            </Link>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid} data-cols={columns} data-motion-group>
      {posts.map((post) => (
        <div
          className={styles.card}
          data-cover={post.image ? "image" : "none"}
          key={post.slug}
          data-motion-item
        >
          {post.image ? (
            <PostCover
              src={post.image}
              className={styles.cardMedia}
              ratio="16 / 10"
            />
          ) : (
            <NoCover className={styles.noCover} />
          )}
          <Meta post={post} showCategory={showCategory} className={styles.meta} />
          <Link href={`/blogs/${post.slug}`} className={styles.title}>
            {post.title}
          </Link>
          {post.summary ? (
            <p className={styles.summary}>{post.summary}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
