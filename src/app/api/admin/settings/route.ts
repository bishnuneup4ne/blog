import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { getSiteConfig } from "@/lib/config";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const config = await getSiteConfig();
    // Include the admin email settings (from-address for Resend broadcasts).
    const { data: row } = await supabaseAdmin
      .from("site_config")
      .select("email")
      .eq("id", 1)
      .maybeSingle();
    const email = (row as { email?: unknown } | null)?.email ?? null;
    return NextResponse.json({ ...config, email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// WordPress-style live edit: single-field updates addressed by dotted config path.
const EDITABLE_FIELDS: Record<string, string> = {
  "person.name": "person",
  "person.role": "person",
  "person.email": "person",
  "person.location": "person",
  "home.headline": "home",
  "home.subline": "home",
  "home.title": "home",
  "home.description": "home",
  "blog.title": "blog",
  "blog.description": "blog",
  "gallery.title": "gallery",
  "gallery.description": "gallery",
  "newsletter.title": "newsletter",
  "newsletter.description": "newsletter",
  "about.title": "about",
  "about.description": "about",
  "about.intro.title": "about",
  "about.intro.description": "about",
};

function setDeep(target: Record<string, any>, segments: string[], value: string) {
  let node = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (typeof node[key] !== "object" || node[key] === null || Array.isArray(node[key])) {
      node[key] = {};
    }
    node = node[key];
  }
  node[segments[segments.length - 1]] = value;
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const { path, value } = (await request.json()) as { path?: unknown; value?: unknown };
    if (typeof path !== "string" || !EDITABLE_FIELDS[path]) {
      return NextResponse.json({ error: "Field is not editable" }, { status: 400 });
    }
    if (typeof value !== "string" || value.length > 2000) {
      return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    }

    const column = EDITABLE_FIELDS[path];
    const { data: row, error: fetchError } = await supabaseAdmin
      .from("site_config")
      .select(column)
      .eq("id", 1)
      .maybeSingle();
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Site config row not found" }, { status: 404 });
    }

    const nextColumn = { ...((row as Record<string, any>)[column] ?? {}) };
    setDeep(nextColumn, path.split(".").slice(1), value);

    const { error: updateError } = await supabaseAdmin
      .from("site_config")
      .update({ [column]: nextColumn, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    revalidateTag("site-config", "max");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, path });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save field";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const data = await request.json();

    // Check if row exists
    const { data: existing } = await supabaseAdmin.from("site_config").select("id").eq("id", 1).single();

    let res;
    if (existing) {
      res = await supabaseAdmin.from("site_config").update({
        person: data.person,
        newsletter: data.newsletter,
        social_links: data.social,
        home: data.home,
        about: data.about,
        blog: data.blog,
        gallery: data.gallery,
        email: data.email ?? null,
        updated_at: new Date().toISOString()
      }).eq("id", 1);
    } else {
      res = await supabaseAdmin.from("site_config").insert({
        id: 1,
        person: data.person,
        newsletter: data.newsletter,
        social_links: data.social,
        home: data.home,
        about: data.about,
        blog: data.blog,
        gallery: data.gallery,
        email: data.email ?? null,
      });
    }

    if (res.error) {
      console.error("Supabase settings save error:", res.error);
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    revalidateTag("site-config", "max");
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
