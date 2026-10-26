import Link from "next/link";
import type { CategoryNode } from "@/lib/categories";
import styles from "./CategoryDirectory.module.scss";

type Entry = { slug: string; name: string; count: number; depth: number };

/** Categories that already have a dedicated tab in the header nav. */
const OWN_TAB = new Set(["personal"]);

function flatten(
  nodes: CategoryNode[],
  activeCategory: string | null,
  depth = 0,
  out: Entry[] = [],
): Entry[] {
  for (const node of nodes) {
    const ownTab = OWN_TAB.has(node.slug.toLowerCase());
    if (ownTab && node.slug !== activeCategory) continue;
    out.push({ slug: node.slug, name: node.name, count: node.totalCount, depth });
    flatten(node.children, activeCategory, depth + 1, out);
  }
  return out;
}

/** Book-index style directory of every category, nested by depth. */
export function CategoryDirectory({
  tree,
  activeCategory,
  activeTag,
  allCount,
  query,
}: {
  tree: CategoryNode[];
  activeCategory: string | null;
  activeTag: string | null;
  allCount: number;
  query?: string;
}) {
  const entries = flatten(tree, activeCategory);
  const visibleActive =
    activeCategory !== null &&
    entries.some((entry) => entry.slug === activeCategory);
  const allActive = !visibleActive;

  const href = (slug?: string) => {
    const params = new URLSearchParams();
    if (slug) params.set("category", slug);
    if (activeTag) params.set("tag", activeTag);
    if (query) params.set("q", query);
    const search = params.toString();
    return search ? `/categories?${search}` : "/categories";
  };

  const rows = [
    {
      key: "all",
      name: "All posts",
      count: allCount,
      href: href(),
      active: allActive,
      depth: 0,
    },
    ...entries.map((entry) => ({
      key: entry.slug,
      name: entry.name,
      count: entry.count,
      href: href(entry.slug),
      active: entry.slug === activeCategory,
      depth: entry.depth,
    })),
  ];

  return (
    <nav className={styles.directory} aria-label="Category directory">
      <ol className={styles.list}>
        {rows.map((row, index) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className={row.active ? `${styles.row} ${styles.rowActive}` : styles.row}
              aria-current={row.active ? "page" : undefined}
              data-depth={row.depth > 0 ? row.depth : undefined}
            >
              <span className={styles.num} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.label}>{row.name}</span>
              <span className={styles.count}>{row.count}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
