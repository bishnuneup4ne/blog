const BASE_COLUMNS =
  "id, name, slug, sort_order, parent_id, description, icon, created_at";

type QueryError = { code?: string; message?: string };

type QueryResult<T> = { data: T | null; error: QueryError | null };

/**
 * `categories.image` was added after the first schema, so a database that has
 * not re-run supabase.sql rejects the column. Postgres fails such a statement
 * at parse time — nothing is written — so the first rejection flips this flag
 * and the same statement is retried without it.
 */
let imageSupported = true;

export function acceptsCategoryImage(): boolean {
  return imageSupported;
}

function isMissingImageColumn(error: QueryError): boolean {
  return error.code === "42703" && /image/i.test(String(error.message ?? ""));
}

export function withCategories<T>(
  run: (
    columns: string,
    hasImage: boolean,
  ) => PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  return (async () => {
    const first = await run(
      imageSupported ? `${BASE_COLUMNS}, image` : BASE_COLUMNS,
      imageSupported,
    );
    if (!first.error || !isMissingImageColumn(first.error)) return first;
    imageSupported = false;
    return run(BASE_COLUMNS, false);
  })();
}

export function normalizeCategoryImage(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
