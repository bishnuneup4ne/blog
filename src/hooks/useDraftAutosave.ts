"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "draft:";

function storageKey(id: string) {
  return `${PREFIX}${id}`;
}

export type StoredDraft<T> = { data: T; savedAt: number };

export function peekDraft<T = unknown>(id: string): StoredDraft<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("data" in parsed)) return null;
    return parsed as StoredDraft<T>;
  } catch {
    return null;
  }
}

export function dropDraft(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
}

export type DraftState = {
  dirty: boolean;
  savedAt: number | null;
  reset: () => void;
};

export function useDraftAutosave<T>(
  id: string,
  data: T,
  opts?: { delayMs?: number; enabled?: boolean },
): DraftState {
  const delay = opts?.delayMs ?? 2000;
  const enabled = opts?.enabled ?? true;

  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSerialized = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(data ?? null);

    if (lastSerialized.current === null) {
      lastSerialized.current = serialized;
      return;
    }
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;

    setDirty(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey(id),
          JSON.stringify({ data, savedAt: Date.now() }),
        );
        setSavedAt(Date.now());
        setDirty(false);
      } catch {
        setSavedAt(null);
        setDirty(false);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, data, delay, enabled]);

  const reset = useCallback(() => {
    dropDraft(id);
    lastSerialized.current = null;
    setDirty(false);
    setSavedAt(null);
  }, [id]);

  return { dirty, savedAt, reset };
}
