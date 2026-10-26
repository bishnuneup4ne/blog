"use client";

import { Media, MasonryGrid } from "@once-ui-system/core";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfig } from "@/components/ConfigProvider";

export default function GalleryView() {
  const { gallery } = useConfig();

  if (!gallery.images?.length) {
    return (
      <EmptyState
        title="No images yet"
        description="Gallery images will show up here as soon as they are added."
      />
    );
  }

  return (
    <div data-motion-group>
      <MasonryGrid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="20">
        {gallery.images.map((image, index) => (
          <div key={index} data-motion-item>
            <Media
              enlarge
              priority={index < 10}
              sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              radius="l"
              aspectRatio={image.orientation === "horizontal" ? "16 / 9" : "3 / 4"}
              src={image.src}
              alt={image.alt}
            />
          </div>
        ))}
      </MasonryGrid>
    </div>
  );
}
