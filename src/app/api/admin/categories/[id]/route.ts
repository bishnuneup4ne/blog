import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { revalidateContentCache } from "@/lib/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import {
  normalizeCategoryImage,
  withCategories,
} from "@/lib/categoryColumns";
import { toSlug } from "@/lib/slug";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    let imagePatch: string | null | undefined;

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
      updates.slug = toSlug(name);
    }

    if (typeof body.sort_order === "number") {
      updates.sort_order = body.sort_order;
    }

    if (body.description !== undefined) {
      updates.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if (body.icon !== undefined) {
      updates.icon =
        typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : null;
    }

    if (body.image !== undefined) {
      imagePatch = normalizeCategoryImage(body.image);
    }

    if (body.parent_id !== undefined) {
      const parentId =
        typeof body.parent_id === "string" && body.parent_id ? body.parent_id : null;

      if (parentId === id) {
        return NextResponse.json(
          { error: "A category cannot be its own parent" },
          { status: 400 },
        );
      }

      if (parentId) {
        const { data: all, error: allError } = await supabaseAdmin
          .from("categories")
          .select("id, parent_id");
        if (allError) {
          return NextResponse.json({ error: allError.message }, { status: 500 });
        }
        const byId = new Map((all ?? []).map((row) => [row.id as string, row.parent_id as string | null]));
        if (!byId.has(parentId)) {
          return NextResponse.json(
            { error: "Parent category does not exist" },
            { status: 400 },
          );
        }
        // Walking up from the proposed parent must never reach this category.
        let cursor: string | null = parentId;
        while (cursor) {
          if (cursor === id) {
            return NextResponse.json(
              { error: "That parent is a subcategory of this one" },
              { status: 400 },
            );
          }
          cursor = byId.get(cursor) ?? null;
        }
      }

      updates.parent_id = parentId;
    }

    if (!Object.keys(updates).length && imagePatch === undefined) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await withCategories((columns, hasImage) =>
      supabaseAdmin
        .from("categories")
        .update({
          ...updates,
          ...(hasImage && imagePatch !== undefined ? { image: imagePatch } : {}),
        })
        .eq("id", id)
        .select(columns)
        .single(),
    );

    if (error) {
      const message =
        error.code === "23505" ? "A category with that name already exists" : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    revalidatePath("/", "layout");
    revalidateContentCache();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to update category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;

  const { error } = await supabaseAdmin.from("categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/", "layout");
  revalidateContentCache();
  return NextResponse.json({ success: true });
}
