"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Column, Table, Text } from "@once-ui-system/core";
import { AdminPageHeader, AdminShell, StatusBadge } from "../admin-ui";

type WriteupRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  video_url?: string;
  created_at: string;
};

const headers = [
  { key: "title", content: "Title" },
  { key: "category", content: "Category" },
  { key: "status", content: "Status" },
  { key: "date", content: "Date" },
  { key: "actions", content: "Actions", align: "right" as const },
];

export default function AdminVideosPage() {
  const [items, setItems] = useState<WriteupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/writeups", { credentials: "include" });
    if (res.ok) {
      const data: WriteupRow[] = await res.json();
      setItems(data.filter((w) => w.video_url?.trim()));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

  const rows = items.map((w) => [
    <Text key="t" variant="body-default-s" truncate>{w.title}</Text>,
    <Text key="c" variant="body-default-s" onBackground="neutral-weak">{w.category || "—"}</Text>,
    <StatusBadge key="s" status={w.status} />,
    <Text key="d" variant="body-default-s" onBackground="neutral-weak">{fmt(w.created_at)}</Text>,
    <div key="a" style={{ textAlign: "right" }}>
      <Button size="s" variant="secondary" label="Edit" href={`/admin/writeups/${w.id}/edit`} />
    </div>,
  ]);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Videos"
        subtitle="Personal videos shown on /personal → Videos"
        actions={<Button href="/admin/writeups/new?mode=video" label="New video" />}
      />

      <Table
        data={{ headers, rows }}
        loading={loading}
        hoverable
        emptyState={
          <Column gap="8" padding="24" fillWidth>
            <Text variant="body-default-m">No videos yet.</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Add a writeup with a YouTube/Vimeo URL — category should be{" "}
              <strong>Personal</strong> so it appears on the Personal → Videos tab. You can add an
              optional short description and markdown notes in the editor; they show in the video
              preview panel.
            </Text>
          </Column>
        }
      />

      <Text variant="body-default-s" onBackground="neutral-weak">
        See them live at{" "}
        <Link href="/personal?tab=videos" target="_blank" rel="noreferrer">
          /personal → Videos
        </Link>
      </Text>
    </AdminShell>
  );
}
