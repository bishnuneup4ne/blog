import Link from "next/link";
import styles from "./TagFilter.module.scss";

/** Tag picker shown inside the filter popup. */
export function TagFilter({
  tags,
  activeTag,
  categorySlug,
  query,
}: {
  tags: [string, number][];
  activeTag: string | null;
  categorySlug?: string | null;
  query?: string;
}) {
  const href = (tag: string) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (query) params.set("q", query);
    params.set("tag", tag);
    return `/categories?${params.toString()}`;
  };

  return (
    <nav className={styles.panel} aria-label="Tags">
      <div className={styles.sectionHead}>
        <span className={styles.kicker}>Tags</span>
        <span className={styles.count}>{tags.length}</span>
      </div>

      {tags.length ? (
        <ul className={styles.cloud}>
          {tags.map(([name, count]) => {
            const active = name === activeTag?.toLowerCase();
            return (
              <li key={name}>
                <Link
                  href={href(name)}
                  className={active ? `${styles.tag} ${styles.tagActive}` : styles.tag}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.hash} aria-hidden="true">
                    #
                  </span>
                  <span>{name}</span>
                  <span className={styles.tagCount}>{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>No tags yet.</p>
      )}
    </nav>
  );
}
