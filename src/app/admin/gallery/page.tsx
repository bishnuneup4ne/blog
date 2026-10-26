"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Column,
  Grid,
  Heading,
  IconButton,
  Input,
  Row,
  Select,
  Spinner,
  Text,
} from "@once-ui-system/core";
import { X } from "lucide-react";
import { AdminPageHeader, AdminShell, ConfirmDialog } from "../admin-ui";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { AdminImage } from "@/components/admin/AdminImage";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import { useAdminToast } from "@/lib/adminToast";

interface GalleryImage {
  src: string;
  alt: string;
  orientation: "horizontal" | "vertical";
}

const emptyNew: GalleryImage = { src: "", alt: "", orientation: "horizontal" };

const ORIENTATION_OPTIONS = [
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" },
];

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<GalleryImage>(emptyNew);
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const { addToast } = useAdminToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFullConfig(data);
        const galleryImages = (data.gallery as { images?: GalleryImage[] })?.images;
        if (galleryImages?.length) {
          setImages(
            galleryImages.map((img) => ({
              ...img,
              src: normalizeImageUrl(img.src),
            })),
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveImages = async (newImages: GalleryImage[]) => {
    if (!fullConfig) return;
    setSaving(true);
    try {
      const normalized = newImages.map((img) => ({
        ...img,
        src: normalizeImageUrl(img.src),
      }));
      const updatedConfig = {
        ...fullConfig,
        gallery: {
          ...(fullConfig.gallery as object),
          images: normalized,
        },
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        setImages(normalized);
        setFullConfig(updatedConfig);
        addToast("success", "Gallery saved.");
      } else {
        addToast("error", "Failed to save gallery.");
      }
    } catch {
      addToast("error", "Network error while saving.");
    }
    setSaving(false);
  };

  const handleAddImage = () => {
    const src = normalizeImageUrl(newImage.src);
    if (!src) {
      addToast("error", "Upload an image or paste a URL first.");
      return;
    }
    saveImages([...images, { ...newImage, src }]);
    setNewImage(emptyNew);
  };

  const handleRemoveImage = (index: number) => {
    setPendingRemove(index);
  };

  const confirmRemove = async () => {
    if (pendingRemove === null) return;
    const updated = [...images];
    updated.splice(pendingRemove, 1);
    setPendingRemove(null);
    await saveImages(updated);
  };

  const previewSrc = normalizeImageUrl(newImage.src);

  return (
    <AdminShell>
      <AdminPageHeader title="Gallery" subtitle="Images appear on the public Gallery page." />

      <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="20">
        <Heading variant="heading-strong-m">Add new image</Heading>

        <Column gap="8" fillWidth>
          <Text variant="label-default-s">Upload or URL</Text>
          <ImageUploader onUploadSuccess={(url) => setNewImage((prev) => ({ ...prev, src: normalizeImageUrl(url) }))} />
          <Input
            id="gallery-src"
            placeholder="https://…"
            value={newImage.src}
            onChange={(e) => setNewImage((prev) => ({ ...prev, src: e.target.value }))}
            onBlur={(e) => setNewImage((prev) => ({ ...prev, src: normalizeImageUrl(e.target.value) }))}
          />
        </Column>

        <Grid columns="2" s={{ columns: "1" }} gap="16">
          <Input
            id="gallery-alt"
            label="Alt text"
            placeholder="Describe the image…"
            value={newImage.alt}
            onChange={(e) => setNewImage((prev) => ({ ...prev, alt: e.target.value }))}
          />
          <Column gap="8">
            <Text variant="label-default-s">Orientation</Text>
            <Select
              id="gallery-orientation"
              options={ORIENTATION_OPTIONS}
              value={newImage.orientation}
              onSelect={(v) =>
                setNewImage((prev) => ({
                  ...prev,
                  orientation: (typeof v === "string" ? v : v[0]) as "horizontal" | "vertical",
                }))
              }
            />
          </Column>
        </Grid>

        {previewSrc ? (
          <Column gap="8" fillWidth>
            <Text variant="label-default-s">Preview</Text>
            <AdminImage
              src={previewSrc}
              alt="Preview"
              style={{ width: "100%", maxWidth: 320, borderRadius: 12, display: "block" }}
            />
          </Column>
        ) : null}

        <Row fillWidth horizontal="end">
          <Button onClick={handleAddImage} disabled={saving || loading || !previewSrc} label="Add image" />
        </Row>
      </Column>

      <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="20">
        <Heading variant="heading-strong-m">Current images</Heading>

        {loading ? (
          <Row center fill padding="24">
            <Spinner />
          </Row>
        ) : images.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">No gallery images yet.</Text>
        ) : (
          <Grid columns="4" l={{ columns: "3" }} m={{ columns: "2" }} s={{ columns: "1" }} gap="16">
            {images.map((img, i) => (
              <Column
                key={`${img.src}-${i}`}
                position="relative"
                background="overlay"
                border="neutral-alpha-weak"
                radius="l"
                overflow="hidden"
              >
                <AdminImage
                  src={img.src}
                  alt={img.alt}
                  style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                />
                <Column padding="12" gap="2">
                  <Text variant="body-default-s" truncate>{img.alt || "No alt text"}</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">{img.orientation}</Text>
                </Column>
                <div style={{ position: "absolute", top: 8, right: 8 }}>
                  <IconButton
                    variant="danger"
                    size="s"
                    aria-label="Remove image"
                    onClick={() => handleRemoveImage(i)}
                  >
                    <X size={14} />
                  </IconButton>
                </div>
              </Column>
            ))}
          </Grid>
        )}
      </Column>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove image?"
        message="This removes the image from the public Gallery page. The file stays in storage and other references are unaffected."
        confirmLabel="Remove"
        loading={saving}
        onConfirm={confirmRemove}
        onClose={() => setPendingRemove(null)}
      />
    </AdminShell>
  );
}
