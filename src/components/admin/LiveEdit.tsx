"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./LiveEdit.module.scss";

const LiveEditContext = createContext(false);

export function LiveEditProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.authenticated === true) setEnabled(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <LiveEditContext.Provider value={enabled}>{children}</LiveEditContext.Provider>;
}

export function EditableText({
  path,
  value,
  multiline = false,
  children,
}: {
  path: string;
  value: string;
  multiline?: boolean;
  children: ReactNode;
}) {
  const enabled = useContext(LiveEditContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  if (!enabled) return <>{children}</>;

  const flashSaved = () => {
    setStatus("saved");
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setStatus("idle");
      setEditing(false);
    }, 700);
  };

  const save = async () => {
    if (status === "saving") return;
    if (draft.trim() === value.trim()) {
      setEditing(false);
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, value: draft }),
      });
      if (!res.ok) throw new Error("save failed");
      flashSaved();
    } catch {
      setStatus("error");
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const cancel = () => {
    setDraft(value);
    setStatus("idle");
    setEditing(false);
  };

  const commonProps = {
    ref: inputRef as never,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void save();
      }
    },
    onBlur: () => {
      if (status !== "saving") void save();
    },
    className: styles.editor,
  };

  return (
    <span className={styles.wrapper}>
      {editing ? (
        multiline ? (
          <textarea {...commonProps} rows={3} />
        ) : (
          <input type="text" {...commonProps} />
        )
      ) : (
        <span
          className={styles.target}
          title="Click to edit"
          onClick={() => {
            setDraft(value);
            setStatus("idle");
            setEditing(true);
          }}
        >
          {children}
          <span className={styles.pencil} aria-hidden>
            ✎
          </span>
        </span>
      )}
      {status !== "idle" ? (
        <span className={styles.status}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Failed — retry"}
        </span>
      ) : null}
    </span>
  );
}
