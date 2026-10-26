"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Column, Input, Row, Text } from "@once-ui-system/core";

type TagsFieldProps = {
  value: string;
  onChange: (tags: string) => void;
};

function parse(value: string): string[] {
  return value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function TagsField({ value, onChange }: TagsFieldProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Tracks only what is typed, so picking a chip does not filter the list down
  // to the tag that was just picked.
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/tags", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setSuggestions(data.filter((t): t is string => typeof t === "string"));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => parse(value), [value]);
  const selectedLower = useMemo(() => new Set(selected.map((t) => t.toLowerCase())), [selected]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = suggestions.filter((tag) => !selectedLower.has(tag));
    return (needle ? pool.filter((tag) => tag.includes(needle)) : pool).slice(0, 24);
  }, [query, suggestions, selectedLower]);

  const toggle = (tag: string) => {
    const next = selectedLower.has(tag.toLowerCase())
      ? selected.filter((t) => t.toLowerCase() !== tag.toLowerCase())
      : [...selected, tag];
    onChange(next.join(", "));
    setQuery("");
  };

  return (
    <Column gap="8" fillWidth>
      <Input
        id="tags"
        label="Tags (comma-separated)"
        placeholder="ctf, web, xss, reverse-engineering"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value.split(",").pop() ?? "");
        }}
      />

      {visible.length ? (
        <Column gap="8" fillWidth>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {selected.length ? "Add another tag" : "Existing tags"} — click to use
          </Text>
          <Row gap="8" wrap>
            {visible.map((tag) => (
              <Chip key={tag} label={tag} onClick={() => toggle(tag)} />
            ))}
          </Row>
        </Column>
      ) : null}

      {selected.length ? (
        <Row gap="8" wrap>
          {selected.map((tag) => (
            <Chip
              key={tag.toLowerCase()}
              label={tag}
              selected
              onRemove={() =>
                onChange(selected.filter((t) => t.toLowerCase() !== tag.toLowerCase()).join(", "))
              }
            />
          ))}
        </Row>
      ) : null}
    </Column>
  );
}
