import Link from "next/link";
import { formatCalendarDate } from "@/utils/formatDate";
import styles from "./PostHeader.module.scss";

type FeedAuthor = { name: string; avatar?: string };

type PostHeaderProps = {
  title: string;
  date?: string;
  category?: string;
  summary?: string;
  readingMinutes?: number;
  author?: FeedAuthor;
};

export function PostHeader({
  title,
  date,
  category,
  summary,
  readingMinutes,
  author,
}: PostHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/blogs" className={styles.back}>
        ← Posts
      </Link>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.byline}>
        {author?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={author.avatar} alt="" loading="lazy" />
        ) : null}
        {author?.name ? <span className={styles.name}>{author.name}</span> : null}
        {date ? (
          <span className={styles.item}>
            <span className={styles.dot}>·</span>
            <time dateTime={date}>{formatCalendarDate(date)}</time>
          </span>
        ) : null}
        {readingMinutes ? (
          <span className={styles.item}>
            <span className={styles.dot}>·</span>
            {readingMinutes} min read
          </span>
        ) : null}
        {category ? (
          <span className={styles.item}>
            <span className={styles.dot}>·</span>
            <Link
              href={`/blogs?category=${encodeURIComponent(category)}`}
              className={styles.category}
            >
              {category}
            </Link>
          </span>
        ) : null}
      </div>
      {summary ? <p className={styles.summary}>{summary}</p> : null}
    </header>
  );
}
