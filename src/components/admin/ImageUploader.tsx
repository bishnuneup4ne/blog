"use client";

import { useRef, useState } from "react";
import { Button, Column, Input, Row, Text } from "@once-ui-system/core";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

type ImageUploaderProps = {
  onUploadSuccess?: (url: string) => void;
  compact?: boolean;
};

export function ImageUploader({ onUploadSuccess, compact }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyUrl = (url: string) => {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return;
    setLastUrl(normalized);
    setError("");
    onUploadSuccess?.(normalized);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok && data.url) {
        applyUrl(data.url);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submitPaste = () => {
    applyUrl(pasteUrl);
    setPasteUrl("");
  };

  return (
    <Column gap="8" fillWidth>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        ref={fileInputRef}
        style={{ display: "none" }}
      />
      <Row gap="8" wrap vertical="center" horizontal={compact ? "end" : "start"} fillWidth>
        <Button
          variant="secondary"
          size="s"
          loading={uploading}
          label={uploading ? "Uploading…" : "Upload to Supabase"}
          onClick={() => fileInputRef.current?.click()}
        />
        {!compact ? (
          <>
            <div style={{ flex: "1 1 160px", minWidth: 140 }}>
              <Input
                id="paste-url"
                height="s"
                placeholder="Or paste image URL…"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitPaste();
                  }
                }}
              />
            </div>
            <Button variant="tertiary" size="s" label="Use URL" onClick={submitPaste} />
          </>
        ) : null}
      </Row>
      {error ? (
        <Text variant="body-default-s" style={{ color: "var(--danger-on-background-strong)" }}>
          {error}
        </Text>
      ) : null}
      {lastUrl ? (
        <Text variant="body-default-xs" onBackground="success-strong" style={{ wordBreak: "break-all" }}>
          ✓ {lastUrl}
        </Text>
      ) : null}
    </Column>
  );
}
