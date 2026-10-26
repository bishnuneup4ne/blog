"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Checkbox,
  Column,
  Grid,
  IconButton,
  Input,
  Row,
  Select,
  Table,
  Text,
} from "@once-ui-system/core";
import {
  SquarePen,
  Video,
  Tag,
  Settings,
  Eye,
  Trash2,
  Pencil,
  Check,
  File,
  Users,
  Clock,
  Inbox,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminShell,
  ConfirmDialog,
  QuickCard,
  StatCard,
  StatusBadge,
} from "./admin-ui";
import { useAdminToast } from "@/lib/adminToast";

interface Writeup {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  created_at: string;
  date: string;
  summary: string;
  tags: string[];
}

type SortField = "title" | "slug" | "status" | "category" | "date";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Drafts", value: "draft" },
];

export default function AdminDashboard() {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Writeup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subscribersCount, setSubscribersCount] = useState<number>(0);
  const { addToast } = useAdminToast();

  useEffect(() => {
    fetchWriteups();
    fetchSubscribers();
  }, []);

  const fetchWriteups = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/writeups");
    if (res.ok) setWriteups(await res.json());
    setLoading(false);
  };

  const fetchSubscribers = async () => {
    const res = await fetch("/api/admin/subscribers");
    if (res.ok) {
      const data = await res.json();
      setSubscribersCount(data.length);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/writeups/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setWriteups((w) => w.filter((x) => x.id !== deleteTarget.id));
      addToast("success", `"${deleteTarget.title}" deleted successfully.`);
    } else {
      addToast("error", "Failed to delete. Try again.");
    }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      const res = await fetch(`/api/admin/writeups/${id}`, { method: "DELETE" });
      if (res.ok) ok++;
      else fail++;
    }
    if (ok > 0) {
      setWriteups((w) => w.filter((x) => !selectedIds.has(x.id)));
      addToast("success", `Deleted ${ok} writeup(s).`);
    }
    if (fail > 0) addToast("error", `Failed to delete ${fail} writeup(s).`);
    setSelectedIds(new Set());
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      const res = await fetch(`/api/admin/writeups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) ok++;
      else fail++;
    }
    if (ok > 0) {
      setWriteups((w) => w.map((x) => (selectedIds.has(x.id) ? { ...x, status } : x)));
      addToast("success", `Updated ${ok} writeup(s) to "${status}".`);
    }
    if (fail > 0) addToast("error", `Failed to update ${fail} writeup(s).`);
    setSelectedIds(new Set());
  };

  const sorted = useMemo(() => {
    const list = [...writeups];
    const cmp = (a: string | undefined, b: string | undefined) =>
      (a ?? "").localeCompare(b ?? "");
    list.sort((a, b) => {
      let r = 0;
      switch (sortField) {
        case "title":
          r = cmp(a.title, b.title);
          break;
        case "slug":
          r = cmp(a.slug, b.slug);
          break;
        case "status":
          r = cmp(a.status, b.status);
          break;
        case "category":
          r = cmp(a.category, b.category);
          break;
        case "date":
          r = cmp(a.date || a.created_at, b.date || b.created_at);
          break;
      }
      return sortDir === "asc" ? r : -r;
    });
    return list;
  }, [writeups, sortField, sortDir]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === sorted.length && sorted.length > 0) return new Set();
      return new Set(sorted.map((w) => w.id));
    });
  }, [sorted]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const lowercaseSearch = search.toLowerCase();
  const filtered = useMemo(
    () =>
      sorted.filter((w) => {
        const matchSearch =
          w.title?.toLowerCase().includes(lowercaseSearch) ||
          w.slug?.toLowerCase().includes(lowercaseSearch);
        const matchFilter =
          filter === "all" ||
          (filter === "published" && w.status === "Published") ||
          (filter === "draft" && w.status !== "Published");
        return matchSearch && matchFilter;
      }),
    [sorted, lowercaseSearch, filter],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const gotoPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  const total = writeups.length;
  const published = writeups.filter((w) => w.status === "Published").length;
  const drafts = total - published;
  const last7 = writeups.filter((w) => {
    const d = new Date(w.date || w.created_at);
    return Date.now() - d.getTime() < 7 * 86400000;
  }).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const latestDraft = useMemo(() => {
    const draftList = writeups
      .filter((w) => w.status !== "Published")
      .sort((a, b) =>
        new Date(b.date || b.created_at).getTime() -
        new Date(a.date || a.created_at).getTime(),
      );
    return draftList[0] || null;
  }, [writeups]);

  const fmt = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        color: sortField === field ? "var(--brand-on-background-strong)" : "inherit",
        font: "inherit",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {label}
      <span aria-hidden>{sortField === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );

  const headers = [
    {
      key: "select",
      width: "40px",
      content: (
        <Checkbox
          isChecked={selectedIds.size === sorted.length && sorted.length > 0}
          onToggle={toggleSelectAll}
          hoverable={false}
        />
      ),
    },
    { key: "title", content: <SortHeader field="title" label="Title" /> },
    { key: "slug", content: <SortHeader field="slug" label="Slug" /> },
    { key: "status", content: <SortHeader field="status" label="Status" /> },
    { key: "category", content: <SortHeader field="category" label="Category" /> },
    { key: "date", content: <SortHeader field="date" label="Date" /> },
    { key: "actions", content: "Actions" },
  ];

  const rows = paginated.map((w) => [
    <Checkbox key="c" isChecked={selectedIds.has(w.id)} onToggle={() => toggleSelect(w.id)} hoverable={false} />,
    <Link
      key="t"
      href={`/admin/writeups/${w.id}/edit`}
      style={{ color: "inherit", textDecoration: "none" }}
      className="admin-title-link"
    >
      <Text variant="body-strong-s" truncate>
        {w.title || <span style={{ opacity: 0.5 }}>(no title)</span>}
      </Text>
    </Link>,
    <Text key="s" variant="code-default-s" onBackground="neutral-weak" truncate>
      {w.slug}
    </Text>,
    <StatusBadge key="st" status={w.status} />,
    <Text key="cat" variant="body-default-s" onBackground="neutral-weak">
      {w.category || "—"}
    </Text>,
    <Text key="d" variant="body-default-s" onBackground="neutral-weak">
      {fmt(w.date || w.created_at)}
    </Text>,
    <Row key="a" gap="4" vertical="center">
      <IconButton
        variant="ghost"
        size="s"
        tooltip="View post"
        href={`/blogs/${w.slug}`}
        target="_blank"
        aria-label="View post"
      >
        <Eye size={16} />
      </IconButton>
      <IconButton
        variant="ghost"
        size="s"
        tooltip="Edit"
        href={`/admin/writeups/${w.id}/edit`}
        aria-label="Edit"
      >
        <Pencil size={16} />
      </IconButton>
      <IconButton
        variant="danger"
        size="s"
        tooltip="Delete"
        aria-label="Delete"
        onClick={() => setDeleteTarget(w)}
      >
        <Trash2 size={16} />
      </IconButton>
    </Row>,
  ]);

  return (
    <AdminShell>
      <AdminPageHeader
        title={`${greeting} 👋`}
        subtitle={`${today} · Manage your writeups and blog posts`}
        actions={
          <Button href="/admin/writeups/new" label="New Writeup" />
        }
      />

      {latestDraft ? (
        <Row
          fillWidth
          gap="12"
          vertical="center"
          horizontal="between"
          wrap
          background="brand-alpha-weak"
          border="brand-alpha-medium"
          radius="l"
          padding="12"
        >
          <Row gap="12" vertical="center" wrap>
            <span style={{ display: "inline-flex", color: "var(--brand-background-strong)" }}>
              <Clock size={18} />
            </span>
            <Text variant="body-default-s">
              You have an unpublished draft —{" "}
              <strong>{latestDraft.title || "(untitled)"}</strong>
            </Text>
          </Row>
          <Button
            size="s"
            variant="secondary"
            label="Resume draft"
            href={`/admin/writeups/${latestDraft.id}/edit`}
          />
        </Row>
      ) : null}

      <Grid columns="4" m={{ columns: "2" }} s={{ columns: "1" }} gap="16">
        <QuickCard href="/admin/writeups/new" icon={<SquarePen size={20} />} title="New writeup" subtitle="Blog post" />
        <QuickCard href="/admin/writeups/new?mode=video" icon={<Video size={20} />} title="New video" subtitle="Personal tab" />
        <QuickCard href="/admin/categories" icon={<Tag size={20} />} title="Categories" subtitle="Flow map nav" />
        <QuickCard href="/admin/settings" icon={<Settings size={20} />} title="Settings" subtitle="Site config" />
      </Grid>

      <Grid columns="6" l={{ columns: "3" }} m={{ columns: "2" }} s={{ columns: "1" }} gap="16">
        <StatCard label="Published" value={loading ? "—" : published} icon={<Check size={18} />} accent="var(--brand-background-strong)" />
        <StatCard label="Drafts" value={loading ? "—" : drafts} icon={<File size={18} />} accent="var(--warning-background-strong)" />
        <StatCard label="Subscribers" value={loading ? "—" : subscribersCount} icon={<Users size={18} />} accent="var(--success-background-strong)" />
        <StatCard label="Total Posts" value={loading ? "—" : total} icon={<Inbox size={18} />} />
        <StatCard label="Last 7 Days" value={loading ? "—" : last7} icon={<Clock size={18} />} accent="var(--accent-background-strong)" />
      </Grid>

      <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <Input
            id="search"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
              setSelectedIds(new Set());
            }}
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            id="filter"
            options={FILTER_OPTIONS}
            value={filter}
            onSelect={(v) => {
              setFilter(typeof v === "string" ? v : v[0]);
              setCurrentPage(1);
              setSelectedIds(new Set());
            }}
          />
        </div>
      </Row>

      {selectedIds.size > 0 ? (
        <Row
          fillWidth
          gap="12"
          vertical="center"
          background="surface"
          border="brand-alpha-weak"
          radius="l"
          padding="12"
        >
          <Text variant="body-strong-s">{selectedIds.size} selected</Text>
          <Button size="s" variant="secondary" label="Publish all" onClick={() => handleBulkStatus("Published")} />
          <Button size="s" variant="tertiary" label="Draft all" onClick={() => handleBulkStatus("Draft")} />
          <Button size="s" variant="danger" label="Delete all" onClick={handleBulkDelete} />
        </Row>
      ) : null}

      <Table
        data={{ headers, rows }}
        loading={loading}
        hoverable
        emptyState={
          <Column center gap="8" padding="24" fillWidth>
            <Text variant="body-default-m">No writeups found</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {search ? "Try a different search term." : "Start by creating your first writeup."}
            </Text>
            {!search ? (
              <Button href="/admin/writeups/new" label="Create First Post" />
            ) : null}
          </Column>
        }
      />

      {filtered.length > 0 ? (
        <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
          <Text variant="body-default-s" onBackground="neutral-weak">
            Showing {filtered.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </Text>
          <Row gap="4" wrap vertical="center">
            <Button
              size="s"
              variant="tertiary"
              label="Prev"
              disabled={currentPage <= 1}
              onClick={() => gotoPage(currentPage - 1)}
            />
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) page = i + 1;
              else if (currentPage <= 4) page = i + 1;
              else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
              else page = currentPage - 3 + i;
              return (
                <Button
                  key={page}
                  size="s"
                  variant={page === currentPage ? "primary" : "tertiary"}
                  label={String(page)}
                  onClick={() => gotoPage(page)}
                />
              );
            })}
            <Button
              size="s"
              variant="tertiary"
              label="Next"
              disabled={currentPage >= totalPages}
              onClick={() => gotoPage(currentPage + 1)}
            />
          </Row>
        </Row>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Writeup"
        message={
          <>
            Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This action
            cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
