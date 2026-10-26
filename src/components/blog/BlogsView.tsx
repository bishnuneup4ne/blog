import { Schema } from "@once-ui-system/core";
import Link from "next/link";
import { Mailchimp } from "@/components/Mailchimp";
import { EditableText } from "@/components/admin/LiveEdit";
import { CategoryToolbar } from "@/components/blog/CategoryToolbar";
import { PostList } from "@/components/blog/PostList";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { getBlogCategories } from "@/lib/categories";
import { getSupabasePosts } from "@/utils/supabasePosts";
import pageStyles from "@/styles/page-shell.module.scss";
import styles from "@/components/blog/BlogsGrid.module.scss";

function isVideoPost(post: { metadata: { video_url?: string } }) {
  return Boolean(post.metadata.video_url?.trim());
}

export async function BlogsView({
  searchParams,
  basePath = "/blogs",
}: {
  searchParams: Promise<{ category?: string }>;
  basePath?: string;
}) {
  const { category } = await searchParams;
  const [config, allPosts, categories] = await Promise.all([
    getSiteConfig(),
    getSupabasePosts(),
    getBlogCategories(),
  ]);
  const { blog, person } = config;

  const nonVideo = allPosts.filter((p) => !isVideoPost(p));
  const filtered = (
    category
      ? nonVideo.filter(
          (p) =>
            (p.metadata as { category?: string }).category?.toLowerCase() ===
            category.toLowerCase(),
        )
      : nonVideo
  ).sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime(),
  );

  const title = category ? category : blog.title;

  return (
    <div className={pageStyles.shell}>
      <Schema
        as="blogPosting"
        baseURL={baseURL}
        title={title}
        description={blog.description}
        path={blog.path}
        image={`/api/og/generate?title=${encodeURIComponent(title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${basePath}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />

      <div className={styles.page}>
        <header className={pageStyles.pageHeader} data-motion>
          <div>
            {category ? (
              <Link href="/categories" className={styles.backLink}>
                ← All categories
              </Link>
            ) : null}
            <EditableText path="blog.title" value={String(title ?? "")}>
              <h1 className={pageStyles.pageTitle}>{title}</h1>
            </EditableText>
          </div>
          <span className={pageStyles.pageCount}>
            {filtered.length} {filtered.length === 1 ? "post" : "posts"}
          </span>
        </header>

        <div data-motion>
          <CategoryToolbar
            categories={categories}
            active={category}
            categoryBase="/blogs"
            showPills={Boolean(category)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>No posts in this category yet.</div>
        ) : (
          <PostList
            posts={filtered.map((post) => ({
              slug: post.slug,
              title: post.metadata.title,
              summary: post.metadata.summary,
              publishedAt: post.metadata.publishedAt,
              category: post.metadata.category,
              tags: post.metadata.tags ?? [],
              image: post.metadata.image,
            }))}
            showCategory={!category}
          />
        )}

        {!category && (
          <section className={pageStyles.newsletter} data-motion>
            <Mailchimp />
          </section>
        )}
      </div>
    </div>
  );
}
