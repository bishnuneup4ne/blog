"use client";

import { useState } from "react";
import styles from "./PostCover.module.scss";

/**
 * A post's cover art. Renders nothing when the post has no image, or when the
 * image fails to load — a text-only card reads better than an empty box.
 */
export function PostCover({
  src,
  ratio = "16 / 9",
  className,
}: {
  src?: string;
  ratio?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <span
      className={className ? `${styles.cover} ${className}` : styles.cover}
      style={{ aspectRatio: ratio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
