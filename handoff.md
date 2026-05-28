# Handoff

## Goal

Build and deploy a Next.js 15 web service (`bandapa-web`) as the companion to the Bandapa Android app. The service must:

1. **Auth confirmation** — handle Supabase email confirmation redirect links so new users can verify accounts before opening the app.
2. **APK download** — polished marketing/download page where users get the latest `.apk` and see install instructions.
3. **Admin Dashboard** — authenticated portal (Supabase email+password, checked against `admin_users` table) with full CRUD on: `bands`, `artists`, `venues`, `albums`, and `announcements`.
4. **Announcements** — admins write to `bandapa-main.announcements`; the mobile app listens via Supabase Realtime.
5. **Deployed to Google Cloud Run** via Docker (multi-stage, standalone Next.js output).

Design: Bandapa Web Stitch project "Eco-Systemic Modernism" — Chlorophyll Green `#6EE384`, Obsidian Deep `#0F1509`, dark sidebar, Plus Jakarta Sans / Inter / JetBrains Mono.

---

## Current State

**✅ Fully working and production-ready:**
- All pages implement the Stitch design system exactly.
- `npm run build` passes clean — 13 routes, zero TypeScript errors, last confirmed this session.
- Full animation system: staggered hero entrance, scroll reveal, page-enter transitions, floating ambient orbs, modal enter/exit, auth-confirm state crossfades.
- `prefers-reduced-motion` accessibility override in globals.css.
- Material Symbols icons loaded globally, used across all admin pages and download page.
- All admin CRUD pages have proper Material Symbols icon buttons for edit/delete.
- Brand color system is consistent: no raw Tailwind `red-*`/`blue-*`/`amber-*` — all error/badge colors use brand tokens (`error-container`, `on-error-container`, `secondary-container`, etc.).
- Login double-call bug fixed (guard + removed `router.refresh()`).
- `.gitignore` created.
- `PRODUCT.md` created at project root for `/impeccable` context.
- Venue type badges show type-specific colors (studio/bar/hangout) with Material Symbols icons.

**⚠️ Not yet done (requires manual steps before the app functions):**
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is still placeholder `your-service-role-key-here` — admin dashboard DB writes will fail.
- No admin user seeded in `bandapa-main.admin_users` — cannot log in to admin portal.
- `NEXT_PUBLIC_APK_DOWNLOAD_URL` still points to non-existent Supabase Storage path — download button 404s.
- Supabase Auth redirect URL not configured in Dashboard — email confirmation links will be broken in production.
- Not deployed to Cloud Run.

**⚠️ Windows build quirk:**
ENOENT errors on `.next` cache renames are transient (Windows file-lock). Fix: `Remove-Item -Recurse -Force .next && npm run build`.

---

## Files Actively Being Edited

All files below were created or significantly changed this session:

**Config & foundation:**
- `tailwind.config.ts` — Full Stitch token set as flat keys: `obsidian-deep`, `chlorophyll-green`, `pure-white`, `primary` = `#006e2d` (corrected from wrong `#6EE384`), `primary-container` = `#6ee384`, full secondary/tertiary/surface/error/outline token set. Legacy `chlorophyll`, `chlorophyll-dark`, `obsidian` kept for backward compat.
- `app/globals.css` — Added: `.material-symbols-outlined` CSS, `.glass-card`, `.hero-gradient`, full animation keyframe system (`fadeInUp`, `fadeIn`, `slideInRight`, `scaleIn`, `floatY`), `.animate-*` utility classes, `.page-enter`, `.reveal`/`.reveal.visible` scroll reveal system, `prefers-reduced-motion` accessibility override, custom scrollbar. Component classes updated: `btn-primary` hover = `bg-primary-fixed`, `btn-danger` uses brand error tokens, all buttons have `active:scale-[0.98]`.
- `app/layout.tsx` — Added Material Symbols Outlined Google Font link.
- `.gitignore` — Created (node_modules, .next, .env.local, dist, *.log).
- `PRODUCT.md` — Created for `/impeccable` skill context.

**New components:**
- `components/ScrollReveal.tsx` — IntersectionObserver wrapper, adds `.visible` class on viewport entry. Accepts `className`, `delay`, `threshold` props.
- `components/LandingNav.tsx` — Scroll-aware nav: transparent on load → `bg-pure-white/92 backdrop-blur-xl` after 32px scroll. Logo scales on hover. Underline-sweep on nav links.
- `components/DownloadButton.tsx` — 3-phase animated download CTA: idle → loading (spinning refresh) → done (filled checkmark, green glow) → idle after 3.5s.

**Updated components:**
- `components/AdminSidebar.tsx` — Rewritten: Material Symbols icons, `text-chlorophyll-green bg-white/10` active state, 3px left-border indicator on active item, staggered `animate-fade-in` on nav items (45ms per item), "New Announcement" CTA with glow shadow, sidebar-scroll custom scrollbar.
- `components/Modal.tsx` — Rewritten: mounted-delay pattern (double-RAF for enter, setTimeout for exit), backdrop `rgba(15,21,9,0.45)` with 200ms fade, dialog `scale(0.97) + translateY(10px)` enter/exit, exit 180ms (faster than 220ms enter per reference spec), `aria-modal="true"` added.

**Pages:**
- `app/download/page.tsx` — Full rewrite matching Stitch `landing-download-page.html`. Uses `LandingNav`, `ScrollReveal`, `DownloadButton`. Hero: `min-h-[100dvh]`, 2-col, staggered entrance (0/80/180/280ms), glassmorphic card slides from right at 380ms. Download section: asymmetric 2-col header (anti-center), APK card + Guide card with stagger. Bento grid: 4-tile asymmetric layout with scroll reveal stagger.
- `app/admin/layout.tsx` — Changed outer div to `flex h-screen overflow-hidden bg-background`.
- `app/admin/page.tsx` — Full rewrite: Stitch overview dashboard. Metric cards with `animate-scale-in` 90ms stagger. Announcement feed with `animate-fade-in-up` 70ms row stagger. Dark "Content Summary" card + broadcast action card.
- `app/admin/login/page.tsx` — Fixed double-submit (`if (loading) return`), moved `createClient()` to component scope, removed `router.refresh()`, error banner uses `bg-error-container/50 text-on-error-container`, button hover uses `bg-primary-fixed`.
- `app/auth/confirm/AuthConfirmContent.tsx` — Card gets `animate-fade-in-up` on mount. Each status block (`loading`/`success`/`error`) is its own mounted div with `animate-fade-in-up` — remounts on status change, crossfading between states.
- `app/admin/bands/page.tsx` — Edit/delete → Material Symbols icon buttons. Error text → `text-error`. `page-enter` on root div.
- `app/admin/artists/page.tsx` — Genre badges `bg-chlorophyll/10 text-chlorophyll-dark` (was blue-50). Instrument badges `bg-secondary-container text-on-secondary-container` (was amber-50). Same icon/error fixes.
- `app/admin/venues/page.tsx` — Venue type badges: type-specific colors + Material Symbols icons (`mic`/`local_bar`/`place`). Emoji removed from labels and `<option>` elements. `venueTypeIcons` lookup map added.
- `app/admin/albums/page.tsx` — Warning banner: `bg-secondary-container/40` (was amber-50). Track count badge: `bg-surface-container text-secondary` (was rose-50). Track remove: `text-error/60 hover:text-error`.
- `app/admin/announcements/page.tsx` — Error text → `text-error`. `page-enter` on root div.

---

## Failed Attempts

- **Windows ENOENT on `.next` cache rename** — `npm run build` sometimes throws `ENOENT: no such file or directory, rename '...5.pack_' → '...5.pack'` or similar rename errors. Transient Windows file-lock. Fix: delete `.next` and rebuild.
- **`SyntaxError: Unexpected end of JSON input` during Collecting page data** — Stale `.next` cache from a previous aborted build. Fix: delete `.next` and rebuild. Never a code error.
- **TypeScript `select("id, name")` on Band[]** — Strict mode rejected partial object. Fixed by selecting `"*"`.
- **`setAll` without type annotation in server.ts** — Implicit `any`. Fixed with explicit cookie type.
- **`useSearchParams()` without Suspense** — Next.js 15 requires boundary. Fixed by splitting into `page.tsx` (boundary) + `AuthConfirmContent.tsx`.
- **Spawning subagent for mobile app exploration** — User rejected the tool call. Switched to direct Glob + Read.
- **`router.push + router.refresh` on login** — Caused admin layout's server-side auth check to re-run immediately, appearing as a duplicate login call. Fixed by removing `router.refresh()`.
- **`createClient()` inside `handleSubmit`** — Not a functional bug (ssr singleton), but moved to component scope for clarity.
- **`primary.DEFAULT = #6EE384` in old tailwind config** — Wrong: Stitch defines `primary` as `#006e2d` (dark forest green) and `chlorophyll-green`/`primary-container` as `#6EE384`. No pages used `bg-primary` directly (they used `bg-chlorophyll`), so correcting it was safe.

---

## Next Step

**Complete the four unblocking setup steps, then deploy to Cloud Run.**

### Step 1 — Fill in service role key
```env
# In .env.local
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API → service_role secret>
```

### Step 2 — Seed the first admin user
```sql
-- In Supabase Dashboard → SQL Editor:
-- First create the user via Authentication → Users (or via the app signup)
-- Then get their UUID and run:
INSERT INTO "bandapa-main".admin_users (user_id)
VALUES ('<auth-user-uuid>');
```

### Step 3 — Upload APK + set env var
- Create `releases` bucket (public) in Supabase Storage
- Upload APK as `bandapa-latest.apk`
- Add to `.env.local`: `NEXT_PUBLIC_APK_DOWNLOAD_URL=https://rrfelwwoypouqcjbdzrb.supabase.co/storage/v1/object/public/releases/bandapa-latest.apk`

### Step 4 — Configure Auth redirect URL
In Supabase Dashboard → Authentication → URL Configuration, add:
`https://YOUR-CLOUD-RUN-URL.run.app/auth/confirm`

### Step 5 — Deploy to Cloud Run
```bash
docker build -t gcr.io/<PROJECT_ID>/bandapa-web .
docker push gcr.io/<PROJECT_ID>/bandapa-web
gcloud run deploy bandapa-web \
  --image gcr.io/<PROJECT_ID>/bandapa-web \
  --platform managed \
  --region <REGION> \
  --allow-unauthenticated \
  --set-env-vars="SUPABASE_SERVICE_ROLE_KEY=<key>"
```

---

## Context & Gotchas

**Supabase:**
- Schema is `bandapa-main`, not `public`. Both Supabase clients set `db: { schema: 'bandapa-main' }` as default, so all `.from('table_name')` calls work without prefixing.
- `admin_users` has no INSERT RLS policy — only service role can add admins. Must use SQL editor or service-role client to seed.
- `artists` is a new table not in the original mobile app schema. Standalone artist profiles, no FK to users.
- `invite_code` on bands is auto-generated by DB trigger. Never put it in create/edit forms.

**Auth flow:**
- Admin auth is two-layered: middleware checks JWT (fast), then `app/admin/layout.tsx` queries `admin_users` (DB check). Both must pass.
- Login page: `if (loading) return` guard prevents double-submit. No `router.refresh()` after `router.push` — the push alone picks up the new auth cookie on the server side.

**Tailwind token naming:**
- `primary` = `#006e2d` (dark forest green, matches Stitch spec). NOT chlorophyll.
- `chlorophyll` / `chlorophyll-green` / `primary-container` = `#6EE384` (bright leaf green).
- `btn-primary` uses `bg-chlorophyll`, NOT `bg-primary` — this is intentional and correct.
- Legacy tokens (`chlorophyll`, `chlorophyll-dark`, `obsidian`) kept for backward compat with CRUD pages. New pages use Stitch flat tokens (`obsidian-deep`, `chlorophyll-green`, `pure-white`, etc.).

**Animation system:**
- `prefers-reduced-motion` kills all animations and transitions instantly. `.reveal` elements are forced to `opacity: 1; transform: none` so they stay visible.
- `Modal.tsx` mounted-delay pattern: mount → double-RAF → `visible=true` (enter). `visible=false` → `setTimeout(unmount, 200ms)` (exit). Do NOT simplify back to `if (!open) return null` — it removes all exit animation.
- `ScrollReveal.tsx` adds `.visible` via `IntersectionObserver`. Can be used as a grid child by passing `className` with grid-span classes (e.g., `className="md:col-span-2 md:row-span-2 flex"`). Inner content needs `flex-1` to fill the reveal wrapper.
- `DownloadButton.tsx` is a client component embedded in the server component `app/download/page.tsx`. Server components CAN import client components.

**Docker / Cloud Run:**
- `output: 'standalone'` in `next.config.ts` is required for the Dockerfile. Do not remove it.
- `SUPABASE_SERVICE_ROLE_KEY` must NOT be baked into the Docker image. Inject at `gcloud run deploy` time via `--set-env-vars` or Secret Manager.
- Cloud Run auto-sets `PORT=8080`; the standalone server reads it.

**Material Symbols:**
- Loaded globally via Google Font link in `app/layout.tsx`. Use `<span className="material-symbols-outlined">icon_name</span>` anywhere. For filled icons, add `style={{ fontVariationSettings: "'FILL' 1" }}`.
- `.material-symbols-outlined` base CSS is in `globals.css` (sets variation settings).

**Stitch reference files (read-only, do not edit):**
- `stitch/screenshots/*.png` — 6 design screenshots
- `stitch/html/*.html` — 5 source-of-truth HTML files (fully applied this session)

**`PRODUCT.md`** — Created at project root for `/impeccable` skill. Contains brand, users, register (brand vs product), tone, and strategic color principles. Run `/impeccable document` to generate a matching `DESIGN.md` for richer skill output.
