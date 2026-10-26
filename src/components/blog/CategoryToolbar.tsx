"use client";

import Link from "next/link";
import styles from "./BlogsGrid.module.scss";

export function CategoryToolbar({
  categories,
  active,
  categoryBase = "/blogs",
  showPills = true,
}: {
  categories: string[];
  active?: string;
  categoryBase?: string;
  showPills?: boolean;
}) {
  const activeLower = active?.toLowerCase();
  return (
    <div className={styles.toolbar}>
      {showPills ? (
        <div className={styles.pills}>
          <Link
            href={categoryBase}
            className={active ? styles.pill : `${styles.pill} ${styles.pillActive}`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`${categoryBase}?category=${encodeURIComponent(c)}`}
              className={
                c.toLowerCase() === activeLower
                  ? `${styles.pill} ${styles.pillActive}`
                  : styles.pill
              }
            >
              {c}
            </Link>
          ))}
        </div>
      ) : null}
      <div className={styles.tools}>
        <button
          type="button"
          className={styles.searchBox}
          onClick={() => window.dispatchEvent(new Event("site:open-search"))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search...</span>
        </button>
        <a href="/api/rss" className={styles.rssBtn} aria-label="RSS feed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>
    </div>
  );
}
