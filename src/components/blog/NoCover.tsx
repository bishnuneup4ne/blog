import styles from "./NoCover.module.scss";

/** Shared monochrome plate for posts without cover art. */
export function NoCover({
  ratio = "16 / 10",
  className,
}: {
  ratio?: string;
  className?: string;
}) {
  return (
    <span
      className={className ? `${styles.plate} ${className}` : styles.plate}
      style={{ aspectRatio: ratio }}
      aria-hidden="true"
    >
      <span className={styles.rule} />
      <span className={styles.label}>No cover</span>
    </span>
  );
}
