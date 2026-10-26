# bishnuneup4ne

Personal blog + portfolio built on [Next.js 16](https://nextjs.org) App Router, [once-ui](https://once-ui.systems) components, and [Supabase](https://supabase.com). Write posts, run a diagram-builder tool, publish projects, keep a photo gallery, collect newsletter subscribers, and send them broadcasts — all managed from a structured admin.

This repo is the source for [bishnuneupane13.com.np](https://bishnuneupane13.com.np).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI kit | `@once-ui-system/core` v1.8 |
| Database | Supabase Postgres (RLS off, service-role key on server only) |
| Storage | Supabase Storage bucket `images` (public) |
| Email | Resend (newsletter broadcasts) |
| Editor | Custom Markdown + image toolbar (`src/components/admin/MarkdownEditor.tsx`) |
| Auth | HKDF-SHA256 signed session cookie, single admin password |

## Features

- **Public site** — home/blog list, blog posts with MDX content, work/projects, gallery, category pages, personal (video) hub, RSS, sitemap, OpenGraph image generation, unsubscribe flow, `/tools/diagram-builder` (self-contained, no login).
- **Admin** (`/admin/login`) — dashboard, writeups (new/edit/list), videos, categories (with reorder), projects, gallery, subscribers, site settings (structured WordPress-style editor), trash (restore/purge).
- **Site settings editor** covers Identity, broadcast sender, social links array, Home/Blog/Work SEO cards, About with TOC / avatar / calendar / intro toggles, newsletter, and gallery metadata. Nested arrays on `about` still use raw JSON.

## Quick start

```bash
npm install
cp .env.example .env.local
# edit .env.local with your Supabase URL + keys and admin password
npm run dev
```

- Site: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/login> (uses `PAGE_ACCESS_PASSWORD` from `.env.local`)

Then apply the schema:

1. Supabase dashboard → SQL Editor → paste the entire contents of [`supabase.sql`](./supabase.sql) → Run.
2. Supabase dashboard → Storage → create a **public** bucket named `images`.

Full setup, deploy, and env-var reference: **[SETUP.md](./SETUP.md)** · **[DEPLOY.md](./DEPLOY.md)**

## Repository layout

```
src/
  app/                     Next.js App Router
    admin/                 Admin panel (all "use client")
    api/                   Route handlers (auth, CRUD, og, rss, upload)
    blogs/, work/, ...     Public pages
  components/              Shared React components
    admin/                 ImageUploader, MarkdownEditor, CategoryField, ImageToolbar
    blog/                  Blog post view pieces, ZoomableImage
  hooks/                   (currently empty after orphan cleanup)
  lib/                     Config, DB helpers, admin auth, MDX sanitizer
  resources/               once-ui config + defaults + icon library
  types/                   Shared TypeScript types
  utils/                   Slug, date, misc helpers
public/
  images/                  Bundled assets (avatar default, etc.)
supabase.sql               Full schema — safe to re-run against a fresh project
.env.example               Env template — copy to .env.local, never commit
```

## Data model

Everything non-file lives in Supabase Postgres. Row-level security is disabled on the app tables; the site talks to the DB only through `supabaseAdmin` (service role) on the server.

| Table | Purpose |
|---|---|
| `writeups` | Blog posts + videos (`video_url` column, `Personal` category for videos) |
| `projects` | Portfolio projects (`slug`, `content`, `images[]`, `technologies[]`, `live_url`, `github_url`) |
| `categories` | Navbar categories with `sort_order` |
| `site_config` | Single row `id=1` — person, social, home, blog, work, about, newsletter, gallery, email |
| `subscribers` | Newsletter email list with `active` / `unsubscribed` status |
| `contact_messages` | Contact-form submissions |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server (Turbopack) |
| `npm run dev:webpack` | Dev server with Webpack (use if Turbopack chokes) |
| `npm run build` | Production build (Webpack) |
| `npm start` | Serve the built app |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome lint of `src` |
| `npm run clean` | Wipe `.next` |

## Configuration touch-points

| File | Controls |
|---|---|
| `.env.local` | Supabase keys, admin password, Resend key, base URL |
| `src/resources/once-ui.config.ts` | Routes on/off, theme (dark/light, brand/accent), fonts, effects, protected paths |
| `src/lib/config.ts` | Fallback defaults for `site_config` when DB is empty |
| Supabase `site_config` row | Live overrides — wins over defaults |

## Notes / limitations

- **`/admin/settings` is a whole-config replace.** Every Save writes all sections back to the single row. Multi-tab concurrent edits will clobber each other — treat it as a single-editor surface.
- **`about.work.experiences`, `about.studies.institutions`, `about.technical.skills`** still use labeled raw-JSON textareas. Structured repeaters for these are TODO.
- **Legacy unused keys** remain in `site_config` (`firstName`/`lastName`, `home.headline`/`subline`/`featured.*`) but have no public reader and are hidden from the admin editor.
- **`/tools/diagram-builder`** is self-contained on the public side — the admin copy and its Postgres table were removed as orphans.

## Security

- Admin cookie is HMAC-SHA256 signed, derived from `PAGE_ACCESS_PASSWORD` via HKDF-SHA256 with domain-separation salt. Rotate the password to invalidate every session.
- Service-role key is only ever read on the server; it never reaches the browser bundle.
- MDX content is sanitized via `src/lib/mdxSanitize.ts` before storage.
- Uploads go through `/api/admin/upload` (admin-only) into the `images` bucket with filename sanitisation.

## License

Personal project — no license file yet. Choose one before publishing if you want to allow reuse.
