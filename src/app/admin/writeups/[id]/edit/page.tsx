"use client";

import { useEffect, useState, use, useRef } from "react";
import {
  Button,
  Column,
  Feedback,
  Grid,
  Input,
  Row,
  Select,
  Spinner,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { AdminPageHeader, AdminShell } from "../../../admin-ui";
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
  date: "",
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

export default function EditWriteup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const draftKey = `writeups:edit:${id}`;
  const [form, setForm] = useState<WriteupFormData>(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [draftPrompt, setDraftPrompt] = useState<{ savedAt: number } | null>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const draft = useDraftAutosave(draftKey, form, {
    enabled: !loading && !draftPrompt,
  });

  const insertImage = (url: string) => {
    editorRef.current?.insertText(`\n![Image](${url})\n`);
  };

  const insertImageHtml = (html: string) => {
    editorRef.current?.insertText(`\n${html}`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        (document.getElementById("edit-form") as HTMLFormElement | null)?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/writeups/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const loaded: WriteupFormData = {
          title: data.title || "",
          slug: data.slug || "",
          category: data.category || "",
          date: data.date || new Date(data.created_at).toISOString().split("T")[0],
          summary: data.summary || "",
          content: data.content || "",
          status: data.status || "Draft",
          featured_image_url: data.featured_image_url || data.image_url || "",
          video_url: data.video_url || "",
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || ""),
        };
        setForm(loaded);
        setLoading(false);
        const existing = peekDraft<WriteupFormData>(draftKey);
        if (
          existing?.data &&
          existing.savedAt > new Date(data.updated_at || data.created_at || 0).getTime() &&
          (existing.data.content !== loaded.content || existing.data.title !== loaded.title)
        ) {
          setDraftPrompt({ savedAt: existing.savedAt });
        } else if (existing) {
          dropDraft(draftKey);
        }
      })
      .catch(() => {
        setError("Failed to load writeup.");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, draftKey]);

  const restoreDraft = () => {
    const existing = peekDraft<WriteupFormData>(draftKey);
    if (existing?.data) setForm({ ...empty, ...existing.data });
    setDraftPrompt(null);
  };

  const discardDraft = () => {
    dropDraft(draftKey);
    setDraftPrompt(null);
  };

  const setField = (k: keyof WriteupFormData, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const isVideoMode = Boolean(form.video_url?.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!isVideoMode && !form.content.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      content: sanitizeMdxContent(form.content),
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const res = await fetch(`/api/admin/writeups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      dropDraft(draftKey);
      setSuccess("Saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AdminShell>
        <Row center fill padding="64">
          <Spinner />
        </Row>
      </AdminShell>
    );
  }

  const backHref = isVideoMode ? "/admin/videos" : "/admin";

  return (
    <AdminShell>
      <AdminPageHeader
        title={isVideoMode ? "Edit Video" : "Edit Writeup"}
        subtitle={`${form.slug}${isVideoMode ? " · Personal → Videos" : ""}`}
        actions={
          <>
            <DraftBadge state={draft} />
            <Button variant="tertiary" label="Preview" href={`/blogs/${form.slug}`} target="_blank" />
            <Button variant="tertiary" label={isVideoMode ? "Videos" : "Dashboard"} href={backHref} />
            <Button
              type="submit"
              form="edit-form"
              disabled={saving || (categoriesLoading && !isVideoMode)}
              label={saving ? "Saving…" : "Save Changes"}
            />
          </>
        }
      />

      {draftPrompt ? (
        <Column gap="8">
          <Feedback
            variant="warning"
            title="Local draft newer than server copy"
            description={`An unsaved edit from ${new Date(draftPrompt.savedAt).toLocaleString()} is in your browser.`}
          />
          <Row gap="8" wrap>
            <Button size="s" variant="secondary" label="Restore local draft" onClick={restoreDraft} />
            <Button size="s" variant="tertiary" label="Discard" onClick={discardDraft} />
          </Row>
        </Column>
      ) : null}

      {error ? <Feedback variant="danger" title="Error" description={error} /> : null}
      {success ? <Feedback variant="success" title="Saved" description={success} /> : null}

      <Column as="form" id="edit-form" onSubmit={handleSave} gap="20">
        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24">
          <Input
            id="title"
            label="Title"
            placeholder="Writeup title..."
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
              value={form.slug}
              onChange={(e) => setField("slug", e.target.value)}
              description={`URL: /blogs/${form.slug}`}
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
              <Input id="date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
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
            placeholder="https://youtube.com/watch?v=..."
            value={form.video_url || ""}
            onChange={(e) => setField("video_url", e.target.value)}
            description={isVideoMode ? "With category Personal, this appears on the Videos tab." : undefined}
          />

          <Textarea
            id="summary"
            label={isVideoMode ? "Short description" : "Summary / Excerpt"}
            placeholder={
              isVideoMode
                ? "Shown on the video card and preview panel..."
                : "Short description shown in blog list..."
            }
            value={form.summary}
            onChange={(e) => setField("summary", e.target.value)}
            lines={3}
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
            placeholder={isVideoMode ? "## Notes, timestamps, links..." : "# Your writeup content here..."}
          />
          <Text variant="body-default-s" onBackground="neutral-weak">
            {isVideoMode
              ? "Optional. Appears in the video preview panel and on the full post page."
              : "Supports Markdown. Use Upload Image to insert at the cursor, or drag an image into the editor toolbar."}
          </Text>
        </Column>

        <Row fillWidth horizontal="end" gap="8">
          <Button variant="tertiary" label="Cancel" href={backHref} />
          <Button
            type="submit"
            disabled={saving || (categoriesLoading && !isVideoMode)}
            label={saving ? "Saving…" : "Save Changes"}
          />
        </Row>
      </Column>
    </AdminShell>
  );
}
