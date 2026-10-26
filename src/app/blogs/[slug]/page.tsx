import { notFound } from "next/navigation";
import { CustomMDX, ScrollToHash } from "@/components";
import { Meta, Schema, Media } from "@once-ui-system/core";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { getSupabasePosts, getSupabasePostBySlug } from "@/utils/supabasePosts";
import { DEFAULT_IMAGE_SETTINGS } from "@/lib/imageSettings";
import type { Metadata } from "next";
import { MorePosts } from "@/components/blog/MorePosts";
import { ShareSection } from "@/components/blog/ShareSection";
import { VideoEmbed } from "@/components/blog/VideoEmbed";
import { PostHeader } from "@/components/blog/PostHeader";
import pageStyles from "@/styles/page-shell.module.scss";
import styles from "./post.module.scss";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await getSupabasePosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string | string[] }>;
}): Promise<Metadata> {
  const routeParams = await params;
  const slugPath = Array.isArray(routeParams.slug)
    ? routeParams.slug.join("/")
    : routeParams.slug || "";

  const post = await getSupabasePostBySlug(slugPath);
  const config = await getSiteConfig();

  if (!post) return {};

  return Meta.generate({
    title: post.metadata.title,
    description: post.metadata.summary,
    baseURL: baseURL,
    image: post.metadata.image || `/api/og/generate?title=${post.metadata.title}`,
    path: `${config.blog.path}/${post.slug}`,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string | string[] }>;
}) {
  const routeParams = await params;
  const slugPath = Array.isArray(routeParams.slug)
    ? routeParams.slug.join("/")
    : routeParams.slug || "";

  const config = await getSiteConfig();
  const { blog, person, about } = config;
  const post = await getSupabasePostBySlug(slugPath);

  if (!post) notFound();

  const meta = post.metadata as {
    video_url?: string;
    category?: string;
    subtitle?: string;
  };
  const videoUrl = meta.video_url?.trim() || "";
  const isVideoPost = Boolean(videoUrl);
  const category = meta.category || meta.subtitle || "";
  const contentLength = post.content?.trim().length ?? 0;
  const hasBody = isVideoPost ? contentLength > 0 : contentLength > 80;
  const wordCount = hasBody
    ? (post.content || "").trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readingMinutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 238)) : 0;
  const coverAspectRatio = DEFAULT_IMAGE_SETTINGS.coverAspectRatio;

  return (
    <div className={pageStyles.shell}>
      <article className={`${pageStyles.page} ${styles.article}`}>
        <Schema
          as="blogPosting"
          baseURL={baseURL}
          path={`${blog.path}/${post.slug}`}
          title={post.metadata.title}
          description={post.metadata.summary}
          datePublished={post.metadata.publishedAt}
          dateModified={post.metadata.publishedAt}
          image={
            post.metadata.image ||
            `/api/og/generate?title=${encodeURIComponent(post.metadata.title)}`
          }
          author={{
            name: person.name,
            url: `${baseURL}${about.path}`,
            image: `${baseURL}${person.avatar}`,
          }}
        />

        <div className={styles.head} data-motion>
          <PostHeader
            title={post.metadata.title}
            date={post.metadata.publishedAt}
            category={category}
            summary={isVideoPost ? post.metadata.summary : undefined}
            readingMinutes={readingMinutes}
            author={{ name: person.name, avatar: person.avatar }}
          />
        </div>

        {!isVideoPost && post.metadata.image ? (
          <figure className={styles.cover} data-motion>
            <Media
              src={post.metadata.image}
              alt={post.metadata.title}
              aspectRatio={coverAspectRatio === "auto" ? undefined : coverAspectRatio}
              priority
              sizes="(min-width: 1240px) 1160px, 100vw"
            />
          </figure>
        ) : null}

        <div className={styles.body}>
          {isVideoPost ? (
            <div className={styles.videoBlock}>
              <VideoEmbed url={videoUrl} title={post.metadata.title} />
            </div>
          ) : null}

          {hasBody ? <CustomMDX source={post.content} /> : null}

          <ShareSection
            title={post.metadata.title}
            url={`${baseURL}${blog.path}/${post.slug}`}
          />
        </div>

        <div className={styles.more} data-motion>
          <MorePosts
            current={{
              slug: post.slug,
              tags: post.metadata.tags,
              category,
            }}
          />
        </div>
        <ScrollToHash />
      </article>
    </div>
  );
}
