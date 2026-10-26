import Link from "next/link";
import { CategoryDirectory } from "@/components/categories/CategoryDirectory";
import { FilterDialog } from "@/components/categories/FilterDialog";
import { TagFilter } from "@/components/categories/TagFilter";
import { PostList, type PostListItem } from "@/components/blog/PostList";
import { getCategoryTree, type CategoryNode } from "@/lib/categories";
import { getSiteConfig } from "@/lib/config";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { EmptyState } from "@/components/ui/EmptyState";
import pageStyles from "@/styles/page-shell.module.scss";
import styles from "./page.module.scss";

export const revalidate = 60;

export async function generateMetadata() {
  const config = await getSiteConfig();
  return {
    title: `Categories – ${config.person.name}`,
    description: "Browse every writeup by category and tag",
  };
}

function collect(nodes: CategoryNode[], out: Map<string, CategoryNode> = new Map()) {
  for (const node of nodes) {
    out.set(node.slug, node);
    collect(node.children, out);
  }
  return out;
}

function tagCounts(
  posts: { metadata: { tags?: string[] } }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.metadata.tags ?? []) {
      const name = tag.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; q?: string }>;
}) {
  const { category, tag, q } = await searchParams;
  const [tree, allPosts] = await Promise.all([getCategoryTree(), getSupabasePosts()]);

  const posts = allPosts
    .filter((post) => !post.metadata.video_url?.trim())
    .sort(
      (a, b) =>
        new Date(b.metadata.publishedAt).getTime() -
        new Date(a.metadata.publishedAt).getTime(),
    );

  const bySlug = collect(tree);
  const active = category ? bySlug.get(category) : undefined;
  const activeTag = tag ? decodeURIComponent(tag) : "";
  const query = q?.trim() ?? "";
  const needle = query.toLowerCase();

  const wanted = new Set<string>();
  if (active) {
    for (const node of [active, ...collect(active.children).values()]) {
      wanted.add(node.name.toLowerCase());
    }
  }

  const filtered = posts.filter((post) => {
    if (wanted.size && !wanted.has(post.metadata.category?.trim().toLowerCase() ?? "")) {
      return false;
    }
    if (activeTag) {
      const tags = (post.metadata.tags ?? []).map((t) => t.trim().toLowerCase());
      if (!tags.includes(activeTag.toLowerCase())) return false;
    }
    if (needle) {
      const haystack = [
        post.metadata.title,
        post.metadata.summary ?? "",
        (post.metadata.tags ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const tags = [...tagCounts(posts).entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  const list: PostListItem[] = filtered.map((post) => ({
    slug: post.slug,
    title: post.metadata.title,
    summary: post.metadata.summary,
    publishedAt: post.metadata.publishedAt,
    category: post.metadata.category,
    tags: post.metadata.tags ?? [],
    image: post.metadata.image,
  }));

  const heading = [active?.name, activeTag ? `#${activeTag}` : "", query || ""]
    .filter(Boolean)
    .join(" · ");

  const withoutTag = active
    ? `/categories?category=${encodeURIComponent(active.slug)}${query ? `&q=${encodeURIComponent(query)}` : ""}`
    : query
      ? `/categories?q=${encodeURIComponent(query)}`
      : "/categories";

  const withoutQuery = active
    ? `/categories?category=${encodeURIComponent(active.slug)}${activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ""}`
    : activeTag
      ? `/categories?tag=${encodeURIComponent(activeTag)}`
      : "/categories";

  return (
    <div className={`${pageStyles.shell} ${pageStyles.wide}`}>
      <div className={`${pageStyles.page} ${pageStyles.wide} ${styles.page}`}>
        <div className={styles.layout}>
          <aside className={styles.rail}>
            <div className={styles.side} data-motion>
              <header className={styles.hero}>
                <h1 className={styles.title}>{heading || "All posts"}</h1>
                <p className={styles.lead}>
                  Every writeup, grouped by the topics and tags I keep coming back to.
                </p>
                <p className={styles.count}>
                  <strong>{filtered.length}</strong>{" "}
                  {filtered.length === 1 ? "post" : "posts"}
                </p>
              </header>

              <CategoryDirectory
                tree={tree}
                activeCategory={active?.slug ?? null}
                activeTag={activeTag || null}
                allCount={posts.length}
                query={query}
              />
            </div>
          </aside>

          <section className={styles.main}>
            <div className={styles.toolbar} data-motion>
              <form
                action="/categories"
                method="get"
                className={`${pageStyles.search} ${styles.search}`}
              >
                {active ? (
                  <input type="hidden" name="category" value={active.slug} />
                ) : null}
                {activeTag ? (
                  <input type="hidden" name="tag" value={activeTag} />
                ) : null}
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search posts…"
                  aria-label="Search posts"
                />
                <button type="submit" className={pageStyles.searchButton}>
                  Search
                </button>
              </form>

              <div className={styles.tools}>
                <FilterDialog resetHref={withoutTag} activeCount={activeTag ? 1 : 0}>
                  <TagFilter
                    tags={tags}
                    activeTag={activeTag || null}
                    categorySlug={active?.slug ?? null}
                    query={query}
                  />
                </FilterDialog>

                {activeTag ? (
                  <Link href={withoutTag} className={pageStyles.chip}>
                    #{activeTag} ×
                  </Link>
                ) : null}

                {query ? (
                  <Link href={withoutQuery} className={pageStyles.chip}>
                    “{query}” ×
                  </Link>
                ) : null}
              </div>
            </div>

            <div className={styles.results}>
              {list.length === 0 ? (
                <EmptyState
                  title="Nothing matches those filters"
                  description="Try clearing a filter, or browse all posts."
                />
              ) : (
                <PostList posts={list} showCategory={!active} columns={3} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
