"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchDialog.module.scss";

type Entry = {
  kind: "post" | "category" | "page" | "tool";
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
};

const RECENTS_KEY = "search:recents";
const MAX_RECENTS = 5;

const GROUP_LABEL: Record<Entry["kind"], string> = {
  post: "Posts",
  category: "Categories",
  tool: "Tools",
  page: "Pages",
};

const GROUP_ORDER: Entry["kind"][] = ["post", "category", "tool", "page"];

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRecents(hrefs: string[]) {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(hrefs.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore */
  }
}

function search(entries: Entry[], q: string): Entry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const terms = needle.split(/\s+/).filter(Boolean);
  const scored = entries.map((e) => {
    const titleL = e.title.toLowerCase();
    const hay = `${e.title} ${e.subtitle} ${e.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (titleL.startsWith(t)) score += 6;
      else if (titleL.includes(t)) score += 4;
      else if (e.keywords.some((k) => k.toLowerCase().includes(t))) score += 3;
      else if (hay.includes(t)) score += 1;
    }
    return { entry: e, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((s) => s.entry);
}

export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecents(readRecents());
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    if (entries || loadError) return;
    let cancelled = false;
    fetch("/api/search")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((data: { entries: Entry[] }) => {
        if (!cancelled) setEntries(data.entries || []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entries, loadError]);

  useEffect(() => {
    if (!open || !entries) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open, entries]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const results = useMemo(() => {
    if (!entries) return [];
    if (!query.trim()) return [];
    return search(entries, query);
  }, [entries, query]);

  const grouped = useMemo(() => {
    const map = new Map<Entry["kind"], Entry[]>();
    for (const r of results) {
      const arr = map.get(r.kind) || [];
      arr.push(r);
      map.set(r.kind, arr);
    }
    const flat: Entry[] = [];
    const groups: { kind: Entry["kind"]; items: Entry[] }[] = [];
    for (const k of GROUP_ORDER) {
      const items = map.get(k);
      if (items && items.length > 0) {
        groups.push({ kind: k, items });
        flat.push(...items);
      }
    }
    return { groups, flat };
  }, [results]);

  const recentEntries = useMemo(() => {
    if (!entries || query.trim()) return [];
    return recents
      .map((href) => entries.find((e) => e.href === href))
      .filter((x): x is Entry => Boolean(x));
  }, [entries, recents, query]);

  const visibleList = query.trim() ? grouped.flat : recentEntries;

  useEffect(() => {
    if (active >= visibleList.length) setActive(Math.max(0, visibleList.length - 1));
  }, [visibleList.length, active]);

  const navigate = useCallback(
    (href: string) => {
      const next = [href, ...recents.filter((h) => h !== href)].slice(0, MAX_RECENTS);
      writeRecents(next);
      setRecents(next);
      onClose();
      router.push(href);
    },
    [recents, onClose, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (visibleList.length === 0 ? 0 : (i + 1) % visibleList.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) =>
          visibleList.length === 0 ? 0 : (i - 1 + visibleList.length) % visibleList.length,
        );
      } else if (e.key === "Enter") {
        const picked = visibleList[active];
        if (picked) {
          e.preventDefault();
          navigate(picked.href);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, visibleList, active, navigate, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.sheet}>
        <div className={styles.searchRow}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={entries ? "Search posts, categories, tools…" : "Loading index…"}
            value={query}
            disabled={!entries}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search query"
          />
          <kbd className={styles.kbdHint}>esc</kbd>
        </div>

        <div ref={listRef} className={styles.results}>
          {!entries && !loadError ? (
            <div className={styles.empty}>Loading…</div>
          ) : loadError ? (
            <div className={styles.empty}>Could not load search index.</div>
          ) : query.trim() && visibleList.length === 0 ? (
            <div className={styles.empty}>No matches for “{query}”.</div>
          ) : !query.trim() ? (
            recentEntries.length === 0 ? (
              <div className={styles.emptyHint}>
                Type to search posts, categories, and tools.
              </div>
            ) : (
              <>
                <div className={styles.groupLabel}>Recent</div>
                {recentEntries.map((e) => {
                  flatIndex += 1;
                  const i = flatIndex;
                  return (
                    <button
                      key={`r-${e.href}`}
                      type="button"
                      data-index={i}
                      className={`${styles.item} ${i === active ? styles.itemActive : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(e.href)}
                    >
                      <KindBadge kind={e.kind} />
                      <span className={styles.itemBody}>
                        <span className={styles.itemTitle}>{e.title}</span>
                        <span className={styles.itemSubtitle}>{e.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </>
            )
          ) : (
            grouped.groups.map((g) => (
              <div key={g.kind}>
                <div className={styles.groupLabel}>{GROUP_LABEL[g.kind]}</div>
                {g.items.map((e) => {
                  flatIndex += 1;
                  const i = flatIndex;
                  return (
                    <button
                      key={e.href}
                      type="button"
                      data-index={i}
                      className={`${styles.item} ${i === active ? styles.itemActive : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigate(e.href)}
                    >
                      <KindBadge kind={e.kind} />
                      <span className={styles.itemBody}>
                        <span className={styles.itemTitle}>{e.title}</span>
                        {e.subtitle && (
                          <span className={styles.itemSubtitle}>{e.subtitle}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: Entry["kind"] }) {
  const labels: Record<Entry["kind"], string> = {
    post: "Post",
    category: "Category",
    page: "Page",
    tool: "Tool",
  };
  return <span className={styles.badge}>{labels[kind]}</span>;
}
