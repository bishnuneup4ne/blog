"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Column, Heading, Row, Table, Text } from "@once-ui-system/core";
import { AdminPageHeader, AdminShell, ConfirmDialog, EmptyState } from "../admin-ui";
import { useAdminToast } from "@/lib/adminToast";
import { Trash2 } from "lucide-react";

type TrashWriteup = {
  id: string;
  title: string;
  slug: string;
  category: string;
  updated_at: string;
};

export default function AdminTrashPage() {
  const [writeups, setWriteups] = useState<TrashWriteup[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPurge, setPendingPurge] = useState<{ type: "writeup"; id: string; title: string } | null>(null);
  const [purging, setPurging] = useState(false);
  const { addToast } = useAdminToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/trash", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setWriteups(data.writeups ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (
    action: "restore" | "purge",
    type: "writeup",
    id: string,
  ) => {
    const res = await fetch("/api/admin/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, type, id }),
    });

    if (res.ok) {
      addToast("success", action === "restore" ? "Restored." : "Permanently deleted.");
      load();
      return true;
    }
    const data = await res.json().catch(() => ({}));
    addToast("error", data.error || "Action failed.");
    return false;
  };

  const handleRestore = (type: "writeup", id: string) => {
    runAction("restore", type, id);
  };

  const handlePurge = (type: "writeup", id: string, title: string) => {
    setPendingPurge({ type, id, title });
  };

  const confirmPurge = async () => {
    if (!pendingPurge) return;
    setPurging(true);
    const ok = await runAction("purge", pendingPurge.type, pendingPurge.id);
    setPurging(false);
    if (ok) setPendingPurge(null);
  };

  const fmt = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

  const writeupHeaders = [
    { key: "title", content: "Title" },
    { key: "category", content: "Category" },
    { key: "deleted", content: "Deleted" },
    { key: "actions", content: "Actions", align: "right" as const },
  ];

  const writeupRows = writeups.map((w) => [
    <Text key="t" variant="body-default-s" truncate>{w.title}</Text>,
    <Text key="c" variant="body-default-s" onBackground="neutral-weak">{w.category || "—"}</Text>,
    <Text key="d" variant="body-default-s" onBackground="neutral-weak">{fmt(w.updated_at)}</Text>,
    <Row key="a" gap="8" vertical="center" fillWidth horizontal="end">
      <Button size="s" variant="secondary" label="Restore" onClick={() => handleRestore("writeup", w.id)} />
      <Button size="s" variant="danger" label="Delete forever" onClick={() => handlePurge("writeup", w.id, w.title)} />
    </Row>,
  ]);

  const empty = !loading && writeups.length === 0;

  return (
    <AdminShell>
      <AdminPageHeader
        title="Trash"
        subtitle="Restore soft-deleted items or remove them permanently."
      />

      {empty ? (
        <EmptyState
          icon={<Trash2 size={28} />}
          title="Trash is empty"
          message="Deleted writeups appear here."
        />
      ) : (
        <Column gap="24" fillWidth>
          {writeups.length > 0 ? (
            <Column gap="12" fillWidth>
              <Heading variant="heading-strong-m">Writeups</Heading>
              <Table data={{ headers: writeupHeaders, rows: writeupRows }} loading={loading} hoverable />
            </Column>
          ) : null}
        </Column>
      )}

      <ConfirmDialog
        open={pendingPurge !== null}
        title="Permanently delete?"
        message={
          pendingPurge
            ? `"${pendingPurge.title}" will be removed from the database. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete forever"
        loading={purging}
        onConfirm={confirmPurge}
        onClose={() => setPendingPurge(null)}
      />
    </AdminShell>
  );
}
