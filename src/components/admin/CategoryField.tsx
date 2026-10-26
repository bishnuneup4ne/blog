"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Column, Input, Row, Select, Text } from "@once-ui-system/core";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

type CategoryFieldProps = {
  value: string;
  onChange: (name: string) => void;
  onLoadingChange?: (loading: boolean) => void;
};

export function CategoryField({ value, onChange, onLoadingChange }: CategoryFieldProps) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName("");
        onChange(data.name);
        await load();
      } else {
        setError(data.error || "Could not add category");
      }
    } catch {
      setError("Could not add category");
    } finally {
      setAdding(false);
    }
  };

  const options = [
    { label: "Select category…", value: "" },
    ...categories.map((c) => ({ label: c.name, value: c.name })),
  ];

  return (
    <Column gap="8" fillWidth>
      <Text variant="label-default-s">Category</Text>
      <Select
        id="category"
        options={options}
        value={value}
        onSelect={(v) => onChange(typeof v === "string" ? v : v[0])}
      />

      <Row gap="8" wrap vertical="end">
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <Input
            id="new-category"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
        </div>
        <Button
          variant="secondary"
          disabled={adding || !newName.trim()}
          loading={adding}
          label={adding ? "Adding…" : "Add category"}
          onClick={handleAdd}
        />
      </Row>

      {error ? (
        <Text variant="body-default-s" style={{ color: "var(--danger-on-background-strong)" }}>
          {error}
        </Text>
      ) : null}
      <Text variant="body-default-s" onBackground="neutral-weak">
        New categories appear in the navbar and on the Categories page.
      </Text>
    </Column>
  );
}
