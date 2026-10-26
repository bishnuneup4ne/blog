import { Meta, Schema } from "@once-ui-system/core";
import GalleryView from "@/components/gallery/GalleryView";
import { baseURL } from "@/resources";
import { getSiteConfig } from "@/lib/config";
import pageStyles from "@/styles/page-shell.module.scss";

export async function generateMetadata() {
  const config = await getSiteConfig();
  return Meta.generate({
    title: config.gallery.title,
    description: config.gallery.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(config.gallery.title)}`,
    path: config.gallery.path,
  });
}

export default async function Gallery() {
  const config = await getSiteConfig();
  const { gallery, person } = config;
  const count = gallery.images?.length ?? 0;
  return (
    <div className={pageStyles.shell}>
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={gallery.title}
        description={gallery.description}
        path={gallery.path}
        image={`/api/og/generate?title=${encodeURIComponent(gallery.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${gallery.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <div className={pageStyles.page}>
        <header className={pageStyles.pageHeader} data-motion>
          <div>
            <h1 className={pageStyles.pageTitle}>{gallery.title}</h1>
          </div>
          <span className={pageStyles.pageCount}>
            {count} {count === 1 ? "image" : "images"}
          </span>
        </header>
        <GalleryView />
      </div>
    </div>
  );
}
