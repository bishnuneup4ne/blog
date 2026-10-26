import { unstable_cache } from "next/cache";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { DATA_REVALIDATE_SECONDS } from "@/lib/cache";
import { withCategories } from "@/lib/categoryColumns";
import { toSlug } from "@/lib/slug";

export type NavCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  parent_id: string | null;
  description: string | null;
  icon: string | null;
  /** Admin-uploaded cover art for the category tile. */
  image?: string | null;
};

/** A category plus its resolved descendants and post counts. */
export type CategoryNode = NavCategory & {
  depth: number;
  children: CategoryNode[];
  /** Posts filed directly under this category. */
  ownCount: number;
  /** ownCount plus every descendant's posts. */
  totalCount: number;
};

async function fetchAllCategories(): Promise<NavCategory[]> {
  const { data, error } = await withCategories((columns) =>
    supabase
      .from("categories")
      .select(columns)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  );

  if (error || !data) return [];

  return (data as unknown as NavCategory[]).map((row) => ({
    ...row,
    image: row.image ?? null,
  }));
}

async function fetchCategoriesFromWriteups(): Promise<NavCategory[]> {
  const { data, error } = await supabase
    .from("writeups")
    .select("category")
    .eq("is_deleted", false)
    .eq("status", "Published");

  if (error || !data) return [];

  const names = Array.from(
    new Set(
      data
        .map((row) => row.category?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return names.map((name, index) => ({
    id: `writeup-${toSlug(name)}`,
    name,
    slug: toSlug(name),
    sort_order: index,
    parent_id: null,
    description: null,
    icon: null,
  }));
}

async function fetchNavCategories(): Promise<NavCategory[]> {
  try {
    const rows = await fetchAllCategories();
    if (rows.length) return rows;
    return fetchCategoriesFromWriteups();
  } catch {
    return fetchCategoriesFromWriteups();
  }
}

const getCachedNavCategories = unstable_cache(
  fetchNavCategories,
  ["nav-categories"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["nav-categories"] },
);

/** Every category row, any depth, ordered. Falls back to writeup categories. */
export const getNavCategories = cache(getCachedNavCategories);

/** @deprecated Top-level categories only — use getNavCategories for the whole tree. */
export async function getRootCategories(): Promise<NavCategory[]> {
  const all = await getNavCategories();
  const ids = new Set(all.map((c) => c.id));
  return all.filter((c) => !c.parent_id || !ids.has(c.parent_id));
}

export type CategoryCounts = Record<string, number>;

/** Published post counts keyed by lowercased category name. */
async function fetchCategoryPostCounts(): Promise<CategoryCounts> {
  const { data, error } = await supabase
    .from("writeups")
    .select("category")
    .eq("is_deleted", false)
    .eq("status", "Published");

  const counts: CategoryCounts = {};
  if (error || !data) return counts;

  for (const row of data) {
    const name = row.category?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

const getCachedCategoryCounts = unstable_cache(
  fetchCategoryPostCounts,
  ["category-post-counts"],
  { revalidate: DATA_REVALIDATE_SECONDS, tags: ["nav-categories", "writeups"] },
);

function bySort(a: NavCategory, b: NavCategory): number {
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
}

/**
 * Builds the forest from a flat category list. Rows whose parent is missing
 * (deleted parent, or the writeup-derived fallback ids) are promoted to roots,
 * and a cycle guard keeps malformed data from hanging the render.
 */
function buildForest(
  categories: NavCategory[],
  counts: CategoryCounts,
): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  for (const cat of categories) {
    nodes.set(cat.id, {
      ...cat,
      depth: 0,
      children: [],
      ownCount: counts[cat.name.toLowerCase()] ?? 0,
      totalCount: 0,
    });
  }

  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const setDepth = (node: CategoryNode, depth: number, seen: Set<string>) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    node.depth = depth;
    node.children.sort(bySort);
    for (const child of node.children) setDepth(child, depth + 1, seen);
  };
  for (const root of roots) setDepth(root, 0, new Set());

  const rollUp = (node: CategoryNode, stack: Set<string>): number => {
    if (stack.has(node.id)) return node.ownCount;
    stack.add(node.id);
    node.totalCount = node.children.reduce(
      (sum, child) => sum + rollUp(child, stack),
      node.ownCount,
    );
    stack.delete(node.id);
    return node.totalCount;
  };
  for (const root of roots) rollUp(root, new Set());

  roots.sort(bySort);
  return roots;
}

/** The full category tree with rolled-up post counts. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [categories, counts] = await Promise.all([
    getNavCategories(),
    getCachedCategoryCounts(),
  ]);
  return buildForest(categories, counts);
}

function flatten(nodes: CategoryNode[], out: CategoryNode[] = []): CategoryNode[] {
  for (const node of nodes) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

export type CategoryWithCount = NavCategory & {
  count: number;
  /** Posts in this category plus everything nested under it. */
  totalCount: number;
};

/** Flat list, every depth, with both direct and rolled-up counts. */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const tree = await getCategoryTree();
  return flatten(tree).map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    sort_order: node.sort_order,
    parent_id: node.parent_id,
    description: node.description,
    icon: node.icon,
    image: node.image ?? null,
    count: node.ownCount,
    totalCount: node.totalCount,
  }));
}

/** A category plus its ancestors, outermost first. */
export async function getCategoryTrail(
  slug: string,
): Promise<CategoryNode[] | null> {
  const tree = await getCategoryTree();
  const walk = (nodes: CategoryNode[], trail: CategoryNode[]): CategoryNode[] | null => {
    for (const node of nodes) {
      const next = [...trail, node];
      if (node.slug === slug) return next;
      const found = walk(node.children, next);
      if (found) return found;
    }
    return null;
  };
  return walk(tree, []);
}

export async function getCategoryBySlug(slug: string): Promise<CategoryNode | null> {
  const trail = await getCategoryTrail(slug);
  return trail ? trail[trail.length - 1] : null;
}

/** Slugs of a category and everything nested beneath it. */
export function getSubtreeSlugs(node: CategoryNode): string[] {
  return [node.slug, ...node.children.flatMap(getSubtreeSlugs)];
}

/** @deprecated Use getNavCategories — kept for API compatibility. */
export async function getBlogCategories(): Promise<string[]> {
  const tree = await getCategoryTree();
  return tree.map((node) => node.name);
}
