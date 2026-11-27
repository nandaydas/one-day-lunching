# Phase 4: Cloud Tasks + Cloud Run Export Pipeline (JPG/PNG/PDF & FFmpeg MP4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end automated export pipeline inside `@nimantro/export-engine` and `apps/worker` (Cloud Run + Playwright Chromium + `sharp` + `pdf-lib` + `archiver` + `ffmpeg`), triggered via Google Cloud Tasks (with local HTTP dev fallback), to render Single-Card (`JPG`/`PNG`/`PDF`), Multi-Page (`PDF` / `Images ZIP`), and Video (`MP4` with selected temple music) invitations from `card_studio` designs, wired to Studio Step 4 (`ExportSharePanel`) and `/dashboard/exports`.

**Architecture:** Extend `ExportFormat` and `CreateExportJobSchema` to support all single-card, multi-page, and MP4 video outputs plus optional draft snapshots (`events/{eventId}/exportSnapshots/{snapshotId}`) so users can export before or after publishing. Build `@nimantro/export-engine` as a pure, framework-agnostic HTML+SVG card template renderer and FFmpeg command builder with unit tests. Implement `apps/worker` as a containerized Cloud Run HTTP service (`POST /jobs/export`) running Playwright Chromium with local bundled Bengali/Latin fonts and FFmpeg, writing output files to Firebase Storage (`/events/{eventId}/exports/{exportId}.{ext}`) and updating `exports/{exportId}` progress & notifications in Firestore. Dispatch jobs from `POST /api/exports` via `@google-cloud/tasks` in production or direct HTTP in local development, and deliver files through a permission-checked `GET /api/exports/[exportId]/download` endpoint.

**Tech Stack:** TypeScript 5.7, Playwright (Chromium), Sharp, `pdf-lib`, `archiver`, FFmpeg (`h264`/`aac`), `@google-cloud/tasks`, Docker, Firebase Admin SDK, Next.js 15, Vitest 2.1.

**Spec:** `docs/superpowers/specs/2026-11-27-nimantro-simple-studio-design.md`

## Global Constraints

- Bengali conjuncts (`যুক্তাক্ষর`) and typography MUST render identically to the web preview; `apps/worker/Dockerfile` MUST install or copy local `.ttf`/`.woff2` files for `Noto Serif Bengali`, `Noto Sans Bengali`, `Hind Siliguri`, `Anek Bangla`, `Playfair Display`, and `Lato` and wait for `document.fonts.ready` before capturing PNG frames.
- All FFmpeg processes MUST be invoked via `child_process.spawn("ffmpeg", args, { shell: false })` using validated argument arrays (zero shell interpolation) and bounded timeouts.
- Remote media URLs fetched by the worker (photos, AI backgrounds, temple music) MUST be validated against allowlisted Storage hosts (`firebasestorage.googleapis.com`, `storage.googleapis.com`, local Firebase Storage emulator `127.0.0.1:9199`, or bundled `/art/` assets) to prevent SSRF.
- `apps/worker` endpoint `POST /jobs/export` MUST verify either a valid Cloud Tasks OIDC JWT (`WORKER_AUTH_AUDIENCE`) or a configured `WORKER_SHARED_SECRET` header (`x-nimantro-worker-secret`) in dev/staging.

---

### File Structure Map

| Action | File Path | Responsibility |
|---|---|---|
| Modify | `packages/types/src/index.ts` | Extend `ExportFormat`, add `ExportJobOptions`, progress fields on `ExportJob`, and `ExportSnapshotDocument` |
| Modify | `packages/validation/src/index.ts` | Extend `CreateExportJobSchema` (`single_jpg`, `single_png`, `single_pdf`, `multi_pdf`, `multi_images_zip`, `video_mp4`, plus legacy aliases) & `ExportOptionsSchema` |
| Create | `packages/export-engine/package.json` & `tsconfig.json` | Package manifest for `@nimantro/export-engine` |
| Create | `packages/export-engine/src/html-renderer.ts` | Self-contained `1080×1350` HTML+CSS+SVG card page renderer with `@font-face`, Alpona/Arch/Floral SVG borders, and scrim contrast |
| Create | `packages/export-engine/src/ffmpeg-command.ts` | Pure FFmpeg argument builder for `4:5` (`1080×1350`) and `9:16` (`1080×1920`) slideshows with `xfade`, audio loop/fade, and silent AAC fallback |
| Create | `packages/export-engine/src/index.ts` | Re-export `html-renderer.ts` and `ffmpeg-command.ts` |
| Create | `packages/export-engine/src/index.test.ts` | Unit tests verifying HTML escaping, Bengali text preservation, SVG border generation, and FFmpeg arg arrays |
| Create | `apps/worker/package.json` & `tsconfig.json` | Cloud Run worker service manifest (`playwright`, `sharp`, `pdf-lib`, `archiver`, `firebase-admin`, `@nimantro/export-engine`) |
| Create | `apps/worker/Dockerfile` | Node 20 + Playwright Chromium + FFmpeg + bundled Bengali/Latin fonts container image |
| Create | `apps/worker/src/image/page-capture.ts` | Playwright Chromium launcher/pool + `captureCardPagePng` (`1080×1350` @ `1x` or `2x`) + `sharp` JPG conversion |
| Create | `apps/worker/src/export/pdf-zip-builder.ts` | `buildPdfFromPngBuffers` (`pdf-lib`) & `buildZipFromNamedImages` (`archiver`) |
| Create | `apps/worker/src/export/video-builder.ts` | Safe URL allowlist downloader + FFmpeg `spawn` runner (`4:5` & `9:16` with music) |
| Create | `apps/worker/src/jobs/process-export.ts` | End-to-end job orchestrator: lock Firestore job -> load design snapshot -> render -> upload to Storage -> update status & notification |
| Create | `apps/worker/src/index.ts` | HTTP server (`/healthz`, `POST /jobs/export`) with Cloud Tasks/secret auth |
| Create | `apps/worker/src/jobs/process-export.test.ts` | Unit tests for URL SSRF allowlist & job error handling |
| Create | `apps/web/lib/cloud-tasks.ts` | `@google-cloud/tasks` dispatcher with local HTTP fallback (`CLOUD_TASKS_DISABLED=true`) |
| Modify | `apps/web/app/api/exports/route.ts` | Support draft snapshot creation (`designDocument` or published `versionId`), extended formats, and Cloud Tasks dispatch |
| Create | `apps/web/app/api/exports/[exportId]/download/route.ts` | Permission-checked signed URL / emulator stream download route |
| Modify | `apps/functions/src/exports/createExportJob.ts` | Align Cloud Function validation & task enqueue with extended `ExportFormat` |
| Modify | `firebase/firestore.rules` | Allow event managers to read/create `exportSnapshots/{snapshotId}` (or server-only) |
| Modify | `apps/web/.env.example` | Document `CLOUD_TASKS_QUEUE_PATH`, `WORKER_BASE_URL`, `WORKER_SHARED_SECRET`, `CLOUD_TASKS_DISABLED`, `LOCAL_WORKER_URL` |
| Create | `apps/web/components/editor/ExportSharePanel.tsx` | Step 4 panel: Single Card (`JPG`/`PNG`/`PDF`), Multi-Page (`PDF`/`ZIP`), Video (`MP4` + Music + `4:5`/`9:16`), live `onSnapshot` job status & Publish/WhatsApp share |
| Modify | `apps/web/components/editor/SimpleStudioShell.tsx` | Mount `ExportSharePanel` in Step 4 (`studioStep === "export"`) |
| Modify | `apps/web/app/(dashboard)/dashboard/exports/page.tsx` | Support all new export formats (`MP4`, `Multi-Page PDF`, `Images ZIP`), real-time status updates, and `/api/exports/[id]/download` |

---

### Task 1: Extend Export Types, Validation & Draft Snapshot Support

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `packages/validation/src/index.ts`
- Test: `packages/validation/src/index.test.ts`

**Interfaces:**
- Produces in `@nimantro/types`: updated `ExportFormat`, `ExportJobOptions`, `ExportJob`, `ExportSnapshotDocument`.
- Produces in `@nimantro/validation`: `ExportFormatSchema`, `ExportOptionsSchema`, updated `CreateExportJobSchema`.

- [ ] **Step 1: Write failing validation test in `packages/validation/src/index.test.ts`**

```typescript
import { CreateExportJobSchema } from "./index";

describe("CreateExportJobSchema Phase 4 formats", () => {
  it("accepts video_mp4 and multi_images_zip with video options and draft designDocument", () => {
    const res = CreateExportJobSchema.safeParse({
      invitationId: "inv-1",
      format: "video_mp4",
      options: {
        videoAspect: "9:16",
        slideDurationSec: 4,
        includeMusic: true,
        qualityScale: 1,
      },
    });
    expect(res.success).toBe(true);
  });

  it("rejects out-of-range slideDurationSec", () => {
    const res = CreateExportJobSchema.safeParse({
      invitationId: "inv-1",
      format: "video_mp4",
      options: { slideDurationSec: 30 },
    });
    expect(res.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nimantro/validation test:unit`
Expected: FAIL — `video_mp4` invalid enum value.

- [ ] **Step 3: Update `packages/types/src/index.ts` and `packages/validation/src/index.ts`**

In `packages/types/src/index.ts`:
```typescript
export type ExportFormat =
  | "pdf"
  | "jpg"
  | "png"
  | "gif"
  | "mp4"
  | "single_jpg"
  | "single_png"
  | "single_pdf"
  | "multi_pdf"
  | "multi_images_zip"
  | "video_mp4";

export interface ExportJobOptions {
  pageIndex?: number;
  videoAspect?: "4:5" | "9:16";
  slideDurationSec?: number;
  includeMusic?: boolean;
  qualityScale?: 1 | 2;
}

export interface ExportJob {
  id: string;
  userId: string;
  eventId: string;
  invitationId: string;
  versionId: string;
  snapshotId?: string;
  format: ExportFormat;
  options?: ExportJobOptions;
  status: ExportStatus;
  progressPercent?: number;
  progressStage?: string;
  storagePath?: string;
  downloadUrl?: string;
  outputSizeBytes?: number;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: FirestoreTimestamp;
  startedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
}
```

In `packages/validation/src/index.ts`:
```typescript
export const ExportFormatSchema = z.enum([
  "pdf",
  "jpg",
  "png",
  "mp4",
  "single_jpg",
  "single_png",
  "single_pdf",
  "multi_pdf",
  "multi_images_zip",
  "video_mp4",
]);

export const ExportOptionsSchema = z.object({
  pageIndex: z.number().int().min(0).max(15).optional(),
  videoAspect: z.enum(["4:5", "9:16"]).optional().default("4:5"),
  slideDurationSec: z.number().int().min(2).max(10).optional().default(4),
  includeMusic: z.boolean().optional().default(true),
  qualityScale: z.union([z.literal(1), z.literal(2)]).optional().default(2),
});

export const CreateExportJobSchema = z.object({
  invitationId: z.string().min(1),
  versionId: z.string().min(1).optional(),
  format: ExportFormatSchema,
  pageSize: z.enum(["a4", "a5", "letter", "square", "card_4_5"]).optional(),
  options: ExportOptionsSchema.optional(),
});
```

- [ ] **Step 4: Build & run unit tests**

Run:
```bash
pnpm --filter @nimantro/types build && pnpm --filter @nimantro/validation build && pnpm --filter @nimantro/validation test:unit
```
Expected: PASS.

---

### Task 2: Build `@nimantro/export-engine` (HTML Card Renderer & FFmpeg Command Builder)

**Files:**
- Create: `packages/export-engine/package.json`
- Create: `packages/export-engine/tsconfig.json`
- Create: `packages/export-engine/src/html-renderer.ts`
- Create: `packages/export-engine/src/ffmpeg-command.ts`
- Create: `packages/export-engine/src/index.ts`
- Create: `packages/export-engine/src/index.test.ts`

**Interfaces:**
- Consumes: `InvitationDesignDocument`, `InvitationCardPage`, `InvitationTheme` (`@nimantro/types`), `resolveSectionText`, `getFontStack`, `getOrderedEnabledCardPages` (`@nimantro/invitation-engine`).
- Produces:
  - `renderCardPageToHtml({ page, theme, locale, fontCss?, assetMap? }): string`
  - `buildFfmpegSlideshowArgs({ framePaths, outputPath, audioPath?, aspect, slideDurationSec, transitionDurationSec }): { args: string[]; totalDurationSec: number }`

- [ ] **Step 1: Create package config & failing test `packages/export-engine/src/index.test.ts`**

Create `packages/export-engine/package.json` (`"name": "@nimantro/export-engine"`, `tsup src/index.ts --format esm,cjs --dts`, deps `@nimantro/types`, `@nimantro/invitation-engine`, `vitest`) and `packages/export-engine/tsconfig.json` extending `../../tsconfig.base.json`.

Write `packages/export-engine/src/index.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { buildFfmpegSlideshowArgs, renderCardPageToHtml } from "./index";
import type { InvitationCardPage, InvitationTheme } from "@nimantro/types";

const sampleTheme: InvitationTheme = {
  primary: "#8B1E2D",
  secondary: "#C9A84C",
  background: "#FFF9F0",
  surface: "#FFFFFF",
  text: "#1A1218",
  muted: "#7A6B62",
  border: "#E8D8B8",
  headingFont: "Noto Serif Bengali",
  bodyFont: "Hind Siliguri",
};

const samplePage: InvitationCardPage = {
  id: "cover",
  role: "cover",
  layout: "framed_royal",
  enabled: true,
  order: 0,
  slots: {
    title: { bn: "শুভ বিবাহ", en: "Wedding Invitation" },
    primaryNames: { bn: "ঋতুপর্ণা ও অনির্বাণ", en: "Rituparna & Anirban" },
  },
  visual: {
    backgroundMode: "theme_gradient",
    overlayScrimOpacity: 0.14,
    borderStyle: "alpona_gold",
  },
};

describe("@nimantro/export-engine", () => {
  it("renders self-contained 1080x1350 HTML preserving Bengali Unicode text and escaping XSS", () => {
    const html = renderCardPageToHtml({
      page: {
        ...samplePage,
        slots: {
          ...samplePage.slots,
          eyebrow: { bn: "<script>alert(1)</script>", en: "Safe" },
        },
      },
      theme: sampleTheme,
      locale: "bn",
    });

    expect(html).toContain("width: 1080px");
    expect(html).toContain("height: 1350px");
    expect(html).toContain("ঋতুপর্ণা ও অনির্বাণ");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("builds deterministic FFmpeg args with xfade transitions and looped audio", () => {
    const { args, totalDurationSec } = buildFfmpegSlideshowArgs({
      framePaths: ["/tmp/p1.png", "/tmp/p2.png", "/tmp/p3.png"],
      outputPath: "/tmp/out.mp4",
      audioPath: "/tmp/shehnai.mp3",
      aspect: "4:5",
      slideDurationSec: 4,
      transitionDurationSec: 0.6,
    });

    // 3 slides * 4s - 2 transitions * 0.6s = 10.8s
    expect(totalDurationSec).toBeCloseTo(10.8, 1);
    expect(args).toContain("-filter_complex");
    expect(args.join(" ")).toContain("xfade=transition=fade");
    expect(args.join(" ")).toContain("afade=t=out");
    expect(args).toContain("/tmp/out.mp4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm install --offline || pnpm install` then `pnpm --filter @nimantro/export-engine test:unit`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Implement `html-renderer.ts`, `ffmpeg-command.ts`, and `index.ts`**

1. **`packages/export-engine/src/html-renderer.ts`:**
   - Escapes all text values via `escapeHtml()` (`&`, `<`, `>`, `"`, `'`).
   - Resolves bilingual/mono text with `resolveSectionText` (`locale: "bn" | "en"` or dual-script layout when `invitation.language === "both"`).
   - Emits a fixed `1080px × 1350px` canvas (`overflow: hidden`) with `@font-face` rules injected via `fontCss` parameter (or fallback system font family), background image (`<img src="...">`), radial scrim overlay, SVG Alpona / Temple Arch / Floral corner frames matching `CardPageRenderer.tsx`, and semantic HTML typography for every `CardPageRole` (`cover`, `family`, `couple_story`, `schedule`, `venue`, `gallery`, `blessings`).
2. **`packages/export-engine/src/ffmpeg-command.ts`:**
   - Validates `framePaths.length >= 1` (`1..8` slides).
   - Computes `totalDurationSec = framePaths.length * slideDurationSec - (framePaths.length - 1) * transitionDurationSec`.
   - Builds inputs (`-loop 1 -t <slideDuration> -i <frame>` for each frame; plus `-stream_loop -1 -i <audioPath>` if audio provided, or `-f lavfi -t <totalDurationSec> -i anullsrc=channel_layout=stereo:sample_rate=44100` for universal silent AAC compatibility).
   - When `aspect === "9:16"`: scales each `1080×1350` frame over a blurred darkened `1080×1920` backdrop using FFmpeg `split[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.12[b];[fg]scale=1020:-1[f];[b][f]overlay=(W-w)/2:(H-h)/2` before chaining `xfade`!
   - When `framePaths.length === 1`: applies gentle slow zoompan (`zoom='min(zoom+0.0008,1.08)'`) over `slideDurationSec` (`s=1080x1350` or `1080x1920`) so single-card MP4 invitations still have subtle, elegant motion.
   - Outputs `["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", "-y", outputPath]`.

- [ ] **Step 4: Build & run unit tests**

Run: `pnpm --filter @nimantro/export-engine build && pnpm --filter @nimantro/export-engine test:unit`
Expected: PASS.

---

### Task 3: Build Cloud Run Worker (`apps/worker`) with Playwright, `pdf-lib`, `sharp`, `archiver` & FFmpeg

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/Dockerfile`
- Create: `apps/worker/src/image/page-capture.ts`
- Create: `apps/worker/src/export/pdf-zip-builder.ts`
- Create: `apps/worker/src/export/video-builder.ts`
- Create: `apps/worker/src/jobs/process-export.ts`
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/jobs/process-export.test.ts`

**Interfaces:**
- Consumes: `@nimantro/export-engine`, `@nimantro/firebase/admin`, `@nimantro/types`, `@nimantro/invitation-engine`.
- Produces HTTP server:
  - `GET /healthz` → `200 { ok: true }`
  - `POST /jobs/export` `{ exportId: string }` → executes `processExportJob(exportId)` and returns `200 { ok: true, exportId, storagePath }`.

- [ ] **Step 1: Write failing unit test `apps/worker/src/jobs/process-export.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { isAllowedMediaUrl } from "../export/video-builder";

describe("worker media URL allowlist (SSRF protection)", () => {
  it("allows Firebase Storage, GCS, and local emulator URLs", () => {
    expect(
      isAllowedMediaUrl("https://firebasestorage.googleapis.com/v0/b/nimantro/o/a.mp3")
    ).toBe(true);
    expect(isAllowedMediaUrl("https://storage.googleapis.com/nimantro/track.mp3")).toBe(true);
    expect(isAllowedMediaUrl("http://127.0.0.1:9199/v0/b/nimantro/o/a.mp3")).toBe(true);
  });

  it("blocks internal metadata and arbitrary private IPs", () => {
    expect(isAllowedMediaUrl("http://169.254.169.254/computeMetadata/v1/")).toBe(false);
    expect(isAllowedMediaUrl("http://localhost:8080/admin")).toBe(false);
    expect(isAllowedMediaUrl("file:///etc/passwd")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter worker test:unit` (after adding `apps/worker/package.json`)
Expected: FAIL — `Cannot find module '../export/video-builder'`.

- [ ] **Step 3: Implement `apps/worker` modules and `Dockerfile`**

1. **`apps/worker/package.json`:**
   - `"name": "worker"`, scripts `build` (`tsup src/index.ts --format cjs --out-dir dist --external playwright --external sharp`), `dev` (`tsx watch src/index.ts`), `start` (`node dist/index.js`), `type-check`, `test:unit` (`vitest run`).
   - Dependencies: `@nimantro/export-engine`, `@nimantro/firebase`, `@nimantro/invitation-engine`, `@nimantro/types`, `playwright`, `sharp`, `pdf-lib`, `archiver`, `firebase-admin`, `google-auth-library`.
2. **`apps/worker/Dockerfile`:**
   - Base image `mcr.microsoft.com/playwright:v1.49.0-noble` (includes Chromium + system deps).
   - Install `ffmpeg` and Bengali/Latin fonts (`fonts-noto-core`, `fonts-noto-extra`, plus `COPY public/fonts /usr/local/share/fonts/nimantro && fc-cache -fv`).
   - Build monorepo workspace (`pnpm install --frozen-lockfile && pnpm --filter worker build`), run as non-root user, expose `8085`, `CMD ["node", "apps/worker/dist/index.js"]`.
3. **`apps/worker/src/image/page-capture.ts`:**
   - Reuses a shared Chromium browser instance (`chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] })`).
   - Creates an isolated browser context per export (`viewport: { width: 1080, height: 1350 }`, `deviceScaleFactor: qualityScale`).
   - Resolves local `/art/...` paths to `data:` URIs or `WEB_PUBLIC_DIR` file URIs so template art always loads offline inside Cloud Run.
   - Loads HTML via `page.setContent(html, { waitUntil: "networkidle" })`, awaits `page.evaluate(() => document.fonts.ready)`, captures PNG buffer (`page.screenshot({ type: "png" })`), and optionally converts to JPG via `sharp(png).jpeg({ quality: 92, mozjpeg: true }).toBuffer()`.
4. **`apps/worker/src/export/pdf-zip-builder.ts`:**
   - `buildPdfFromPngBuffers(pngBuffers)`: creates a `PDFDocument` (`pdf-lib`), embeds each PNG (`pdfDoc.embedPng(buf)`), adds page sized `540 × 675 pt` (exact `4:5` ratio at 144 DPI / `2160×2700`), draws full-bleed image, returns `Uint8Array`.
   - `buildZipFromNamedImages(items)`: writes compressed ZIP buffer using `archiver("zip", { zlib: { level: 6 } })`.
5. **`apps/worker/src/export/video-builder.ts`:**
   - Implements `isAllowedMediaUrl(rawUrl: string): boolean` allowing only `https://firebasestorage.googleapis.com`, `https://storage.googleapis.com`, and in non-production `http://127.0.0.1:9199` / `http://localhost:9199`.
   - Downloads validated audio/media to an `fs.mkdtemp` scratch folder (enforcing max `25 MB` audio download), runs `spawn("ffmpeg", args, { shell: false })` with a 180-second timeout, cleans up temp dir in `finally {}`.
6. **`apps/worker/src/jobs/process-export.ts`:**
   - Atomically transitions `exports/{exportId}` from `"queued"` → `"processing"` (`startedAt: serverTimestamp()`, `progressPercent: 10`). (Idempotent: skips if already `"completed"` or `"processing"`).
   - Loads snapshot (`events/{eventId}/exportSnapshots/{snapshotId}` or `events/{eventId}/invitationVersions/{versionId}`).
   - Renders pages + builds output per `job.format` (`single_png` / `png`, `single_jpg` / `jpg`, `single_pdf`, `multi_pdf` / `pdf`, `multi_images_zip`, `video_mp4` / `mp4`).
   - Uploads artifact to `getAdminStorage().bucket().file(\`events/\${job.eventId}/exports/\${job.id}.\${ext}\`)` with proper `contentType` and `Content-Disposition: attachment`.
   - Updates `exports/{exportId}` (`status: "completed"`, `progressPercent: 100`, `storagePath`, `outputSizeBytes`, `durationMs`, `completedAt`) and writes `notifications/{notifId}` (`type: "export_completed"`).
   - On any exception: marks `exports/{exportId}` (`status: "failed"`, `errorCode`, `errorMessage`) and writes `notifications/{notifId}` (`type: "export_failed"`).
7. **`apps/worker/src/index.ts`:**
   - Verifies `x-nimantro-worker-secret === process.env.WORKER_SHARED_SECRET` OR verifies Cloud Tasks Google OIDC Bearer token via `google-auth-library` (`OAuth2Client.verifyIdToken`).
   - Parses `{ exportId }`, calls `processExportJob(exportId)`, returns `200` (so Cloud Tasks does not infinitely retry permanent validation errors) or `500` on transient failures.

- [ ] **Step 4: Build & test `apps/worker`**

Run: `pnpm --filter worker build && pnpm --filter worker test:unit && pnpm --filter worker type-check`
Expected: PASS.

---

### Task 4: Wire Cloud Tasks Enqueue, Draft Snapshots & Signed Download Route

**Files:**
- Create: `apps/web/lib/cloud-tasks.ts`
- Modify: `apps/web/app/api/exports/route.ts`
- Create: `apps/web/app/api/exports/[exportId]/download/route.ts`
- Modify: `apps/functions/src/exports/createExportJob.ts`
- Modify: `firebase/firestore.rules`
- Modify: `apps/web/.env.example`

**Interfaces:**
- Produces:
  - `enqueueExportTask(exportId: string): Promise<{ dispatchedVia: "cloud_tasks" | "local_http" | "queued_only" }>`
  - `POST /api/exports`: supports either `versionId` (published) OR current draft `invitation.designDocument` (creates immutable `events/{eventId}/exportSnapshots/{snapshotId}`), writes `exports/{exportId}`, calls `enqueueExportTask(exportId)`.
  - `GET /api/exports/[exportId]/download`: verifies `getServerUser()` + ownership/event access, generates 15-minute signed URL (`getSignedUrl({ action: "read", expires: Date.now() + 900_000 })`) and redirects or returns `{ downloadUrl }`, or streams bytes cleanly when running against Firebase Storage Emulator.

- [ ] **Step 1: Write failing unit test `apps/web/lib/cloud-tasks.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { resolveWorkerDispatchMode } from "./cloud-tasks";

describe("cloud-tasks dispatcher config", () => {
  it("selects local_http when CLOUD_TASKS_DISABLED=true and LOCAL_WORKER_URL is set", () => {
    expect(
      resolveWorkerDispatchMode({
        CLOUD_TASKS_DISABLED: "true",
        LOCAL_WORKER_URL: "http://127.0.0.1:8085",
      })
    ).toEqual({ mode: "local_http", url: "http://127.0.0.1:8085/jobs/export" });
  });

  it("selects cloud_tasks when queue path and worker URL are configured", () => {
    expect(
      resolveWorkerDispatchMode({
        CLOUD_TASKS_QUEUE_PATH: "projects/p/locations/asia-south1/queues/exports",
        WORKER_BASE_URL: "https://worker-xyz.a.run.app",
      })
    ).toEqual({
      mode: "cloud_tasks",
      queuePath: "projects/p/locations/asia-south1/queues/exports",
      url: "https://worker-xyz.a.run.app/jobs/export",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `Cannot find module './cloud-tasks'`.

- [ ] **Step 3: Implement `cloud-tasks.ts`, update `api/exports/route.ts`, create `download/route.ts`, update `createExportJob.ts` and `firestore.rules`**

Add `@google-cloud/tasks` to `apps/web/package.json` and `apps/functions/package.json`.
Update `apps/web/.env.example`:
```
# ─── Export Worker & Cloud Tasks ──────────────────────────────
CLOUD_TASKS_DISABLED=true
LOCAL_WORKER_URL=http://127.0.0.1:8085
CLOUD_TASKS_QUEUE_PATH=
WORKER_BASE_URL=
WORKER_SERVICE_ACCOUNT_EMAIL=
WORKER_SHARED_SECRET=dev-local-worker-secret
```
Update `firebase/firestore.rules` inside `match /events/{eventId}`:
```
      match /exportSnapshots/{snapshotId} {
        allow read: if signedIn() && (isEventOwner(eventId) || isEventMember(eventId));
        allow write: if false; // Created exclusively by trusted API/Cloud Functions
      }
```

- [ ] **Step 4: Run web tests & type-check**

Run: `pnpm --filter web test:unit && pnpm --filter web type-check && pnpm --filter functions type-check`
Expected: PASS.

---

### Task 5: Studio Step 4 `ExportSharePanel` & Updated `/dashboard/exports` Page

**Files:**
- Create: `apps/web/components/editor/ExportSharePanel.tsx`
- Modify: `apps/web/components/editor/SimpleStudioShell.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/exports/page.tsx`
- Modify: `packages/i18n/messages/en.json` & `bn.json`

**Interfaces:**
- Consumes: `useEditorStore` (`@nimantro/editor`), `/api/exports`, `/api/exports/[exportId]/download`, `/api/invitations/publish`, Firestore `onSnapshot` on `exports` query.
- Produces: One-click export cards & live job status list inside Studio Step 4 and `/dashboard/exports`.

- [ ] **Step 1: Write unit test for export option builder `apps/web/lib/export-ui-helpers.ts` + `.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { getAvailableExportCards } from "./export-ui-helpers";

describe("export UI options", () => {
  it("shows single card formats when cardFormat is single_card", () => {
    const cards = getAvailableExportCards("single_card", true);
    expect(cards.map((c) => c.format)).toEqual([
      "single_jpg",
      "single_png",
      "single_pdf",
      "video_mp4",
    ]);
  });

  it("shows multi-page PDF, ZIP, and video formats when cardFormat is multi_page", () => {
    const cards = getAvailableExportCards("multi_page", false);
    expect(cards.map((c) => c.format)).toEqual([
      "multi_pdf",
      "multi_images_zip",
      "single_png",
      "video_mp4",
    ]);
    expect(cards.find((c) => c.format === "video_mp4")?.includesMusic).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test:unit`
Expected: FAIL — `Cannot find module './export-ui-helpers'`.

- [ ] **Step 3: Implement `export-ui-helpers.ts`, `ExportSharePanel.tsx`, update `SimpleStudioShell.tsx`, and upgrade `dashboard/exports/page.tsx`**

UI features in `ExportSharePanel.tsx`:
1. **Live Invitation Sharing Card:**
   - Status badge (`Draft` vs `Live at /i/[slug]`).
   - One-click **Publish / Update Live Invitation**, **Copy Link**, **WhatsApp Share** (`https://wa.me/?text=...`), and **Open Live Page** (with interactive RSVP).
2. **Simple Export Cards:**
   - Single Card (`JPG`, `PNG`, `PDF`) or Multi-Page (`Multi-Page PDF`, `Individual PNG Images ZIP`, `Cover Image PNG`).
   - **Video Invitation (`MP4`)** card showing selected music track name (or `"Silent slideshow — add temple music in Step 2"`), simple aspect ratio toggle (`4:5 Feed / WhatsApp` vs `9:16 Status / Reels`), and **Generate MP4 Video** button.
3. **Live Recent Exports List:**
   - Subscribes via Firestore `onSnapshot` on `exports` filtered by `invitationId` and `userId == user.uid` (`orderBy("createdAt", "desc")`, limit 10 — add composite index `userId ASC, invitationId ASC, createdAt DESC` in `firebase/firestore.indexes.json`).
   - Displays live progress percentage (`progressStage`), status badge, and **Download** button calling `/api/exports/${job.id}/download`.

Also update `apps/web/app/(dashboard)/dashboard/exports/page.tsx` format `<Select>` to include `single_pdf`, `single_png`, `single_jpg`, `multi_pdf`, `multi_images_zip`, and `video_mp4`, live `onSnapshot` refresh, and `/api/exports/${job.id}/download` links.

- [ ] **Step 4: Run final workspace verification across all packages & apps**

Run:
```bash
pnpm --filter @nimantro/types build && pnpm --filter @nimantro/validation build && pnpm --filter @nimantro/template-schema build && pnpm --filter @nimantro/i18n build && pnpm --filter @nimantro/invitation-engine build && pnpm --filter @nimantro/editor build && pnpm --filter @nimantro/export-engine build && pnpm --filter worker build && pnpm type-check && pnpm test:unit && pnpm --filter web build
```
Expected: All workspace builds, TypeScript type-checks, and unit test suites PASS.
