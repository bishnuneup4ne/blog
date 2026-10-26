"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Column,
  Feedback,
  Grid,
  Input,
  Row,
  Select,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { AdminPageHeader, AdminShell } from "../../admin-ui";
import { MarkdownEditor, type MarkdownEditorHandle } from "@/components/admin/MarkdownEditor";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { CategoryField } from "@/components/admin/CategoryField";
import { TagsField } from "@/components/admin/TagsField";
import { ImageToolbar } from "@/components/admin/ImageToolbar";
import { DraftBadge } from "@/components/admin/DraftBadge";
import {
  dropDraft,
  peekDraft,
  useDraftAutosave,
} from "@/hooks/useDraftAutosave";
import { sanitizeMdxContent } from "@/lib/mdxSanitize";

interface WriteupFormData {
  title: string;
  slug: string;
  category: string;
  date: string;
  summary: string;
  content: string;
  status: string;
  featured_image_url: string;
  video_url: string;
  tags: string;
}

const empty: WriteupFormData = {
  title: "",
  slug: "",
  category: "",
  date: new Date().toISOString().split("T")[0],
  summary: "",
  content: "",
  status: "Draft",
  featured_image_url: "",
  video_url: "",
  tags: "",
};

const STATUS_OPTIONS = [
  { label: "Draft", value: "Draft" },
  { label: "Published", value: "Published" },
];

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function NewWriteupForm() {
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("mode") === "video";
  const draftKey = isVideoMode ? "writeups:new:video" : "writeups:new";

  const [form, setForm] = useState<WriteupFormData>({
    ...empty,
    category: isVideoMode ? "Personal" : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState<{ savedAt: number } | null>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const router = useRouter();
  const draft = useDraftAutosave(draftKey, form, {
    enabled: !draftPrompt,
  });

  useEffect(() => {
    const existing = peekDraft<WriteupFormData>(draftKey);
    if (existing && existing.data && (existing.data.title || existing.data.content)) {
      setDraftPrompt({ savedAt: existing.savedAt });
    } else if (existing) {
      dropDraft(draftKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const restoreDraft = () => {
    const existing = peekDraft<WriteupFormData>(draftKey);
    if (existing?.data) {
      setForm({ ...empty, ...existing.data });
      if (existing.data.title) setSlugEdited(Boolean(existing.data.slug));
    }
    setDraftPrompt(null);
  };

  const discardDraft = () => {
    dropDraft(draftKey);
    setDraftPrompt(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        (document.getElementById("writeup-form") as HTMLFormElement | null)?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const insertImage = (url: string) => {
    editorRef.current?.insertText(`\n![Image](${url})\n`);
  };

  const insertImageHtml = (html: string) => {
    editorRef.current?.insertText(`\n${html}`);
  };

  useEffect(() => {
    if (!slugEdited && form.title) {
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
    }
  }, [form.title, slugEdited]);

  const setField = (k: keyof WriteupFormData, v: string) => {
    if (k === "slug") setSlugEdited(true);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!isVideoMode && !form.content.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    if (isVideoMode && !form.video_url.trim()) {
      setError("Video URL is required for personal videos.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      content: sanitizeMdxContent(form.content),
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const res = await fetch("/api/admin/writeups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      dropDraft(draftKey);
      router.push(isVideoMode ? "/admin/videos" : "/admin");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save. Try again.");
      setSaving(false);
    }
  };

  const backHref = isVideoMode ? "/admin/videos" : "/admin";

  return (
    <AdminShell>
      <AdminPageHeader
        title={isVideoMode ? "New Video" : "New Writeup"}
        subtitle={
          isVideoMode
            ? "Creates a Personal post with a video — shows under Personal → Videos"
            : "Create a new blog post / writeup"
        }
        actions={
          <>
            <DraftBadge state={draft} />
            <Button variant="tertiary" label="Cancel" href={backHref} />
            <Button
              type="submit"
              form="writeup-form"
              disabled={saving || (categoriesLoading && !isVideoMode)}
              label={saving ? "Saving…" : "Publish"}
            />
          </>
        }
      />

      {draftPrompt ? (
        <Column gap="8">
          <Feedback
            variant="warning"
            title="Unsaved draft found"
            description={`A draft from ${new Date(draftPrompt.savedAt).toLocaleString()} is still in your browser.`}
          />
          <Row gap="8" wrap>
            <Button size="s" variant="secondary" label="Restore" onClick={restoreDraft} />
            <Button size="s" variant="tertiary" label="Discard" onClick={discardDraft} />
          </Row>
        </Column>
      ) : null}

      {error ? <Feedback variant="danger" title="Error" description={error} /> : null}

      <Column as="form" id="writeup-form" onSubmit={handleSave} gap="20">
        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24">
          <Input
            id="title"
            label="Title"
            placeholder="Enter writeup title..."
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            required
          />
        </Column>

        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="20">
          <Grid columns="2" s={{ columns: "1" }} gap="16">
            <Input
              id="slug"
              label="Slug"
              placeholder="auto-generated-from-title"
              value={form.slug}
              onChange={(e) => setField("slug", e.target.value)}
              description={`URL: /blogs/${form.slug || "your-slug"}`}
            />
            <Column gap="8">
              <Text variant="label-default-s">Status</Text>
              <Select
                id="status"
                options={STATUS_OPTIONS}
                value={form.status}
                onSelect={(v) => setField("status", typeof v === "string" ? v : v[0])}
              />
            </Column>
          </Grid>

          <Grid columns="2" s={{ columns: "1" }} gap="16">
            <CategoryField
              value={form.category}
              onChange={(category) => setField("category", category)}
              onLoadingChange={setCategoriesLoading}
            />
            <Column gap="8">
              <Text variant="label-default-s">Date</Text>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </Column>
          </Grid>

          <TagsField
            value={form.tags}
            onChange={(tags) => setField("tags", tags)}
          />

          <Column gap="8" fillWidth>
            <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
              <Text variant="label-default-s">Featured Image URL</Text>
              <ImageUploader compact onUploadSuccess={(url) => setField("featured_image_url", url)} />
            </Row>
            <Input
              id="featured_image_url"
              placeholder="https://... (or upload an image above)"
              value={form.featured_image_url}
              onChange={(e) => setField("featured_image_url", e.target.value)}
            />
            {form.featured_image_url ? (
              <div style={{ borderRadius: 12, overflow: "hidden", maxWidth: 200 }}>
                <img src={form.featured_image_url} alt="Preview" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            ) : null}
          </Column>

          <Input
            id="video_url"
            label={isVideoMode ? "Video URL (YouTube / Vimeo) *" : "Video URL (YouTube / Vimeo) — optional"}
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            value={form.video_url || ""}
            onChange={(e) => setField("video_url", e.target.value)}
            required={isVideoMode}
            description={isVideoMode ? "Category is set to Personal so this appears on the Videos tab." : undefined}
          />

          <Textarea
            id="summary"
            label={isVideoMode ? "Short description" : "Summary / Excerpt"}
            placeholder={
              isVideoMode
                ? "Shown on the video card and preview panel (optional but recommended)..."
                : "A short description shown in the blog list..."
            }
            value={form.summary}
            onChange={(e) => setField("summary", e.target.value)}
            lines={3}
            description={isVideoMode ? "One or two sentences for the gallery hover card and preview sidebar." : undefined}
          />
        </Column>

        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="12">
          <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
            <Text variant="label-default-s">
              {isVideoMode ? "Video notes & text (Markdown, optional)" : "Content (Markdown) *"}
            </Text>
            <ImageUploader compact onUploadSuccess={insertImage} />
          </Row>
          <ImageToolbar onInsertImage={insertImageHtml} />
          <MarkdownEditor
            ref={editorRef}
            value={form.content}
            onChange={(val) => setField("content", val)}
            placeholder={
              isVideoMode
                ? "## What this video covers\n\n- Timestamps\n- Links\n- Extra context..."
                : "# Your writeup content here..."
            }
          />
          <Text variant="body-default-s" onBackground="neutral-weak">
            {isVideoMode
              ? "Optional. Shown in the video preview panel and on the full post page. Supports Markdown, images, and links."
              : "Supports Markdown. Use Upload Image to insert at the cursor, or drag an image into the editor toolbar."}
          </Text>
        </Column>

        <Row fillWidth horizontal="end" gap="8">
          <Button variant="tertiary" label="Cancel" href={backHref} />
          <Button
            type="submit"
            disabled={saving || (categoriesLoading && !isVideoMode)}
            label={saving ? "Saving…" : isVideoMode ? "Save Video" : "Save Writeup"}
          />
        </Row>
      </Column>
    </AdminShell>
  );
}

export default function NewWriteupPage() {
  return (
    <Suspense fallback={<AdminShell><Text>Loading…</Text></AdminShell>}>
      <NewWriteupForm />
    </Suspense>
  );
}
