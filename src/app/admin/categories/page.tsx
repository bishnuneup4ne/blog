"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Column, Row, Text } from "@once-ui-system/core";
import { AdminPageHeader, AdminShell, ConfirmDialog } from "../admin-ui";
import { AdminImage } from "@/components/admin/AdminImage";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useAdminToast } from "@/lib/adminToast";
import { iconLibrary } from "@/resources/icons";
import styles from "./categories.module.scss";

type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  image?: string | null;
};

type Draft = Pick<Category, "name" | "parent_id" | "description" | "icon" | "image">;

const ICON_OPTIONS = Object.keys(iconLibrary);

function emptyDraft(cat: Category): Draft {
  return {
    name: cat.name,
    parent_id: cat.parent_id,
    description: cat.description ?? "",
    icon: cat.icon ?? "",
    image: cat.image ?? "",
  };
}

function isDirty(cat: Category, draft: Draft): boolean {
  return (
    draft.name !== cat.name ||
    (draft.parent_id ?? null) !== cat.parent_id ||
    (draft.description || "") !== (cat.description ?? "") ||
    (draft.icon || "") !== (cat.icon ?? "") ||
    (draft.image || "") !== (cat.image ?? "")
  );
}

/** Depth-first ordering so a category is always followed by its children. */
function orderTree(categories: Category[]): { node: Category; depth: number }[] {
  const byParent = new Map<string | null, Category[]>();
  const ids = new Set(categories.map((c) => c.id));
  for (const cat of categories) {
    const key = cat.parent_id && ids.has(cat.parent_id) ? cat.parent_id : null;
    const list = byParent.get(key) ?? [];
    list.push(cat);
    byParent.set(key, list);
  }
  const bySort = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name);
  for (const list of byParent.values()) list.sort(bySort);

  const out: { node: Category; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const node of byParent.get(parent) ?? []) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      out.push({ node, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const cat of categories) {
    if (!seen.has(cat.id)) out.push({ node: cat, depth: 0 });
  }
  return out;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useAdminToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (res.ok) {
        const data: Category[] = await res.json();
        setCategories(data);
        setDrafts(Object.fromEntries(data.map((cat) => [cat.id, emptyDraft(cat)])));
      } else {
        const err = await res.json();
        addToast("error", err.error || "Failed to load categories");
      }
    } catch {
      addToast("error", "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => orderTree(categories), [categories]);
  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cat of categories) {
      if (cat.parent_id) counts.set(cat.parent_id, (counts.get(cat.parent_id) ?? 0) + 1);
    }
    return counts;
  }, [categories]);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const save = async (cat: Category) => {
    const draft = drafts[cat.id];
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      addToast("error", "Category name cannot be empty.");
      return;
    }
    setSavingId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          parent_id: draft.parent_id || null,
          description: draft.description?.trim() || null,
          icon: draft.icon?.trim() || null,
          image: draft.image?.trim() || null,
        }),
      });
      if (res.ok) {
        addToast("success", `Saved "${name}".`);
        await load();
      } else {
        const err = await res.json();
        addToast("error", err.error || "Failed to save category");
      }
    } catch {
      addToast("error", "Failed to save category");
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setAdding(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, parent_id: newParent || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName("");
        addToast("success", `Added "${data.name}".`);
        await load();
      } else {
        addToast("error", data.error || "Failed to add category");
      }
    } catch {
      addToast("error", "Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        addToast("success", `Deleted "${pendingDelete.name}".`);
        setPendingDelete(null);
        await load();
      } else {
        const err = await res.json();
        addToast("error", err.error || "Failed to delete");
      }
    } catch {
      addToast("error", "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const move = async (cat: Category, direction: -1 | 1) => {
    const siblings = tree
      .filter((entry) => entry.node.parent_id === cat.parent_id)
      .map((entry) => entry.node);
    const index = siblings.findIndex((s) => s.id === cat.id);
    const target = siblings[index + direction];
    if (!target) return;

    setReordering(cat.id);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/categories/${cat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sort_order: target.sort_order }),
        }),
        fetch(`/api/admin/categories/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sort_order: cat.sort_order }),
        }),
      ]);
      if (!r1.ok || !r2.ok) addToast("error", "Failed to reorder categories.");
      await load();
    } finally {
      setReordering(null);
    }
  };

  const parentOptions = (cat: Category) => {
    // A category may not be nested under itself or any of its own descendants.
    const blocked = new Set<string>([cat.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const other of categories) {
        if (other.parent_id && blocked.has(other.parent_id) && !blocked.has(other.id)) {
          blocked.add(other.id);
          grew = true;
        }
      }
    }
    return categories
      .filter((other) => !blocked.has(other.id))
      .map((other) => ({ value: other.id, label: other.name }));
  };

  return (
    <AdminShell>
      <AdminPageHeader
        title="Categories"
        subtitle="Categories for the topic directory. Nest a category under another to build subcategories; a cover image shows on its tile."
      />

      <Column background="surface" border="neutral-alpha-weak" radius="l" padding="20">
        <Row as="form" onSubmit={handleAdd} gap="12" wrap fillWidth vertical="end">
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <label className={styles.fieldLabel} htmlFor="newcat">
              New category
            </label>
            <input
              id="newcat"
              className={styles.control}
              placeholder="e.g. Hardware, CTF, Research"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div style={{ flex: "1 1 200px", minWidth: 180 }}>
            <label className={styles.fieldLabel} htmlFor="newparent">
              Parent category
            </label>
            <select
              id="newparent"
              className={styles.control}
              value={newParent}
              onChange={(e) => setNewParent(e.target.value)}
            >
              <option value="">Top level</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            loading={adding}
            disabled={!newName.trim()}
            label={adding ? "Adding…" : "Add category"}
          />
        </Row>
      </Column>

      {loading && categories.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          Loading categories…
        </Text>
      ) : categories.length === 0 ? (
        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24">
          <Text variant="body-default-s" onBackground="neutral-weak">
            No categories yet. Add one above — it shows up in the topic directory.
          </Text>
        </Column>
      ) : (
        <div className={styles.tree}>
          {tree.map(({ node, depth }) => {
            const draft = drafts[node.id];
            if (!draft) return null;
            const dirty = isDirty(node, draft);
            const children = childCounts.get(node.id) ?? 0;
            return (
              <div
                key={node.id}
                className={`${styles.row} ${dirty ? styles.rowDirty : ""}`}
              >
                <div className={styles.top}>
                  <div className={styles.nameWrap}>
                    {depth > 0 ? (
                      <span className={styles.indent} aria-hidden="true">
                        {"│  ".repeat(depth - 1) + "└─ "}
                      </span>
                    ) : null}
                    <input
                      className={styles.control}
                      value={draft.name}
                      aria-label="Category name"
                      onChange={(e) => updateDraft(node.id, { name: e.target.value })}
                    />
                  </div>
                  <span className={styles.slug}>/{node.slug}</span>
                  {children > 0 ? (
                    <span className={styles.childCount}>
                      {children} subcategor{children === 1 ? "y" : "ies"}
                    </span>
                  ) : null}
                  <span className={styles.actions}>
                    <Button
                      size="s"
                      variant="tertiary"
                      aria-label="Move up"
                      disabled={reordering !== null}
                      onClick={() => move(node, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="s"
                      variant="tertiary"
                      aria-label="Move down"
                      disabled={reordering !== null}
                      onClick={() => move(node, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      size="s"
                      variant="secondary"
                      label={savingId === node.id ? "Saving…" : "Save"}
                      disabled={!dirty || savingId !== null}
                      loading={savingId === node.id}
                      onClick={() => save(node)}
                    />
                    <Button
                      size="s"
                      variant="danger"
                      label="Delete"
                      onClick={() => setPendingDelete(node)}
                    />
                  </span>
                </div>

                <div className={styles.fields}>
                  <div>
                    <label
                      className={styles.fieldLabel}
                      htmlFor={`parent-${node.id}`}
                    >
                      Parent category
                    </label>
                    <select
                      id={`parent-${node.id}`}
                      className={styles.control}
                      value={draft.parent_id ?? ""}
                      onChange={(e) =>
                        updateDraft(node.id, { parent_id: e.target.value || null })
                      }
                    >
                      <option value="">Top level</option>
                      {parentOptions(node).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.fieldLabel} htmlFor={`icon-${node.id}`}>
                      Icon
                    </label>
                    <select
                      id={`icon-${node.id}`}
                      className={styles.control}
                      value={draft.icon ?? ""}
                      onChange={(e) => updateDraft(node.id, { icon: e.target.value })}
                    >
                      <option value="">None</option>
                      {ICON_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className={styles.fieldLabel}
                      htmlFor={`desc-${node.id}`}
                    >
                      Description
                    </label>
                    <input
                      id={`desc-${node.id}`}
                      className={styles.control}
                      placeholder="Shown under the category name"
                      value={draft.description ?? ""}
                      onChange={(e) => updateDraft(node.id, { description: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className={styles.fieldLabel}>Cover image</span>
                    <div className={styles.cover}>
                      {draft.image ? (
                        <AdminImage
                          className={styles.coverPreview}
                          src={draft.image}
                          alt={`${node.name} cover`}
                        />
                      ) : (
                        <span className={styles.coverEmpty}>No cover — the tile stays text-only.</span>
                      )}
                      <Row gap="8" vertical="center" wrap>
                        <ImageUploader
                          compact
                          onUploadSuccess={(url) => updateDraft(node.id, { image: url })}
                        />
                        {draft.image ? (
                          <Button
                            size="s"
                            variant="tertiary"
                            label="Remove"
                            onClick={() => updateDraft(node.id, { image: "" })}
                          />
                        ) : null}
                      </Row>
                      <input
                        className={styles.control}
                        placeholder="Or paste an image URL"
                        value={draft.image ?? ""}
                        onChange={(e) => updateDraft(node.id, { image: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete category?"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}"? Its subcategories are deleted too, and writeups assigned to it keep their category text.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </AdminShell>
  );
}
