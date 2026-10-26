"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./FilterDialog.module.scss";

/**
 * Filter trigger + modal. The popup carries the tag picker; categories live in
 * the rail (or the pill strip on narrow screens), so they are never duplicated.
 */
export function FilterDialog({
  label = "Filter",
  activeCount = 0,
  resetHref,
  children,
}: {
  label?: string;
  activeCount?: number;
  resetHref?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // A click on the ::backdrop lands on the dialog element itself.
    const onPointerDown = (event: PointerEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    return () => dialog.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className={activeCount ? `${styles.trigger} ${styles.triggerOn}` : styles.trigger}
        onClick={() => ref.current?.showModal()}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M2 4h12M4.5 8h7M7 12h2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span>{label}</span>
        {activeCount ? <span className={styles.badge}>{activeCount}</span> : null}
      </button>

      <dialog
        ref={ref}
        className={styles.dialog}
        aria-label="Filter posts"
      >
        <div className={styles.sheet}>
          <div className={styles.head}>
            <div className={styles.headText}>
              <span className={styles.title}>Filter</span>
              <span className={styles.sub}>Narrow the feed by tag</span>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => ref.current?.close()}
              aria-label="Close filters"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div
            className={styles.body}
            onClick={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("a")) ref.current?.close();
            }}
          >
            {children}
          </div>

          <div className={styles.foot}>
            {activeCount && resetHref ? (
              <Link href={resetHref} className={styles.reset}>
                Reset
              </Link>
            ) : (
              <span />
            )}
            <button
              type="button"
              className={styles.done}
              onClick={() => ref.current?.close()}
            >
              Done
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
