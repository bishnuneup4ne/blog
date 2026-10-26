import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { NextResponse } from "next/server";

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** CDATA only needs the terminator escaped; everything else is literal. */
function cdata(value: unknown): string {
  const text = String(value ?? "");
  return "<![CDATA[" + text.split("]]" + ">").join("]]]]><![CDATA[>") + "]]" + ">";
}

function assetUrl(path: unknown): string {
  const value = String(path ?? "");
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `${baseURL}${value}`;
}

export async function GET() {
  const config = await getSiteConfig();
  const { blog, person } = config;
  const posts = await getSupabasePosts();

  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(b.metadata.publishedAt).getTime() - new Date(a.metadata.publishedAt).getTime();
  });

  const email = escapeXml(person.email || "noreply@example.com");
  const authorName = escapeXml(person.name);
  const avatar = assetUrl(person.avatar || "/images/avatar.jpg");

  const items = sortedPosts
    .map((post) => {
      const url = `${baseURL}/blogs/${post.slug}`;
      const enclosure = post.metadata.image
        ? `\n      <enclosure url="${escapeXml(assetUrl(post.metadata.image))}" type="image/jpeg" />`
        : "";
      const category = post.metadata.tag ? `\n      <category>${escapeXml(post.metadata.tag)}</category>` : "";

      return `
    <item>
      <title>${escapeXml(post.metadata.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(post.metadata.publishedAt).toUTCString()}</pubDate>
      <description>${cdata(post.metadata.summary)}</description>${enclosure}${category}
      <author>${email} (${authorName})</author>
    </item>`;
    })
    .join("");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(blog.title)}</title>
    <link>${escapeXml(`${baseURL}/blogs`)}</link>
    <description>${escapeXml(blog.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${baseURL}/api/rss`)}" rel="self" type="application/rss+xml" />
    <managingEditor>${email} (${authorName})</managingEditor>
    <webMaster>${email} (${authorName})</webMaster>
    <image>
      <url>${escapeXml(avatar)}</url>
      <title>${escapeXml(blog.title)}</title>
      <link>${escapeXml(`${baseURL}/blogs`)}</link>
    </image>${items}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
