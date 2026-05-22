# Changelog

## 2026-05-21

- Typed Rust adapter: new `ClipVariant` and `ClipSocial(+Entry)` types in
  `src/api/types.ts`; `adaptRustClip()` in `src/api/client.ts` maps raw
  `/api/clips` responses (start_ms / end_ms / clip_renders / social_copy /
  posts) into the dashboard's `Clip` shape. Unblocks per-platform social
  copy + variant playback.
- Clips page rewrite (`src/pages/Clips.tsx`): per-platform copy panels for
  YouTube Shorts / TikTok / Instagram Reels / Threads / LinkedIn / X /
  Bluesky, each with per-field "Copy" buttons. Mirrors the layout of
  `autoseo/tools/serve_clips.py`. Drops the old dropdown-actions UI and
  the sample-fixture fallback.
- New job-management dialogs: `NewJobDialog` (file upload OR video URL
  ingest, with show_slug + top-K) and `JobDetailsDialog` (stage progress
  + clip list).
- Pipeline page: live "N jobs active" counter computed from
  `jobsQuery.data` (was a hardcoded "2"); pulsing green dot becomes
  muted when count is 0; auto-refreshes every 5s while jobs are
  in-flight.
- WebSocket default URL switched to **same-origin `/ws`** (auto-picks
  ws:// vs wss:// based on page protocol). Still respects
  `window.__AUTOSEO_WS_URL` (injected by the autoseo binary) and
  `VITE_WS_URL` overrides.
- `use-jobs` hook no longer seeds initial state from sample data.
- Settings + Setup Wizard: object-storage block (Cloudflare R2 /
  S3-compatible) — Endpoint, Bucket, Access Key ID, Secret Access Key,
  Public Base URL. Wired to `POST /api/config/test/r2` connectivity
  probe. Skippable in the wizard (defaults to local-disk render storage).

## 2026-05-19 and earlier

- See git log. Highlights: setup wizard (#13), clip approval/veto/posting
  workflow UI (#16), TanStack React Query everywhere (#17), build green
  on main (#18), gitignore for build artifacts (#19), default API_BASE
  to same-origin (#21).
