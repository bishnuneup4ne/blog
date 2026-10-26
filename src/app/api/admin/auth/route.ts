import { NextRequest, NextResponse } from "next/server";
import * as cookie from "cookie";
import { createAdminToken, ADMIN_COOKIE_NAME } from "@/lib/adminSession";
import { isAdminAuthenticated } from "@/lib/adminAuth";

// Used by the public-site live-edit overlay to decide whether to arm itself.
export async function GET() {
  return NextResponse.json({ authenticated: await isAdminAuthenticated() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const submitted = typeof body?.password === "string" ? body.password.trim() : "";

  // Trim the env value too, so accidental trailing whitespace / CRLF in the
  // .env file can never silently break the comparison.
  const correctPassword = process.env.PAGE_ACCESS_PASSWORD?.trim() ?? "";

  // Server-side diagnostics only (never log the password itself).
  console.log(
    `[admin-auth] PAGE_ACCESS_PASSWORD ${correctPassword ? `is set (${correctPassword.length} chars)` : "is NOT set"} — submitted ${submitted.length} chars`,
  );

  if (!correctPassword) {
    return NextResponse.json(
      {
        message:
          "Admin password is not configured. Add PAGE_ACCESS_PASSWORD to your .env / .env.local (or Vercel → Settings → Environment Variables), then fully restart the dev server.",
      },
      { status: 500 },
    );
  }

  if (submitted === correctPassword) {
    const token = await createAdminToken();
    if (!token) {
      return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
    }
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.headers.set(
      "Set-Cookie",
      cookie.serialize(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "strict",
        path: "/",
      }),
    );
    return response;
  }

  return NextResponse.json(
    {
      message: `Incorrect password. It must exactly match PAGE_ACCESS_PASSWORD in your .env file (that value is ${correctPassword.length} characters). Tip: after editing .env you must fully restart the dev server (Ctrl+C, then npm run dev again) — env changes are not hot-reloaded.`,
    },
    { status: 401 },
  );
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set(
    "Set-Cookie",
    cookie.serialize(ADMIN_COOKIE_NAME, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    }),
  );
  return response;
}
