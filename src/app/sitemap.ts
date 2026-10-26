import { baseURL, routes as routesConfig } from "@/resources";
import { getSupabasePosts } from "@/utils/supabasePosts";
import { getNavCategories } from "@/lib/categories";

export default async function sitemap() {
  const posts = await getSupabasePosts();
  const blogs = posts.map((post) => ({
    url: `${baseURL}/blogs/${post.slug}`,
    lastModified: post.metadata.publishedAt,
  }));

  const today = new Date().toISOString().split("T")[0];

  const categories = routesConfig["/category"]
    ? (await getNavCategories())
        .filter(
          (cat) =>
            posts.some((post) => post.metadata.category?.toLowerCase() === cat.name.toLowerCase()),
        )
        .map((cat) => ({ url: `${baseURL}/category/${cat.slug}`, lastModified: today }))
    : [];

  const staticPaths = ["/", "/blogs", "/categories", "/gallery", "/personal"].filter(
    (path) => path === "/" || routesConfig[path as keyof typeof routesConfig],
  );

  const routes = staticPaths.map((route) => ({
    url: `${baseURL}${route}`,
    lastModified: today,
  }));

  return [...routes, ...categories, ...blogs];
}
