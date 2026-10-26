import mdx from "@next/mdx";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A production build over a live dev server's .next makes Turbopack re-read
  // thousands of replaced files; NEXT_DIST_DIR keeps the two apart.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async redirects() {
    return [
      { source: "/blog", destination: "/blogs", permanent: true },
      { source: "/blog/:path*", destination: "/blogs/:path*", permanent: true },
      { source: "/rss.xml", destination: "/api/rss", permanent: true },
      { source: "/feed", destination: "/api/rss", permanent: true },
      { source: "/feed.xml", destination: "/api/rss", permanent: true },
    ];
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["next-mdx-remote"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: ["@once-ui-system/core", "react-icons"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "**",
      },
      // Pexels (used in writeups)
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "**",
      },
      // Supabase Storage
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "**",
      },
      // Imgur
      {
        protocol: "https",
        hostname: "i.imgur.com",
        pathname: "**",
      },
      // Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "**",
      },
      // GitHub raw content
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "user-images.githubusercontent.com",
        pathname: "**",
      },
      // Allow any https hostname (catches any other CDN/storage)
      {
        protocol: "https",
        hostname: "**",
        pathname: "**",
      },
    ],
  },
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default withMDX(nextConfig);
