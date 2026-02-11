# Phase 1: Configure Benchmark - Research

**Researched:** 2026-02-11
**Domain:** Auth, multi-step wizard, image upload, JSON validation, schema inference, draft persistence
**Confidence:** HIGH

## Summary

Phase 1 covers everything a user does before payment: sign up, configure benchmark priorities, upload images with expected JSON, review inferred schema, and see cost estimates. The scope breaks into four technical domains: (1) authentication with Supabase Auth supporting email/password, Google, GitHub, and magic link; (2) a multi-step wizard with URL-persisted state and database-backed draft saving; (3) image upload via Supabase Storage with signed URLs and drag-and-drop UX; and (4) a JSON editing/validation experience with schema inference and compatibility checking across images.

The stack is constrained by prior decisions: Next.js 16 App Router, Supabase (Auth + Postgres + Storage), TypeScript, Tailwind CSS v4, dark-warm palette. This is a fresh build -- the existing repo is a Vite/React prototype for visual reference only. Key additions for Phase 1 beyond the core stack: `@dnd-kit/react` for drag-to-rank priority ordering, `react-dropzone` for file upload UX, `@uiw/react-codemirror` with `@codemirror/lang-json` for the JSON editor, `@jsonhero/schema-infer` for automatic schema detection, and `nuqs` for URL-based wizard step state.

**Primary recommendation:** Build the wizard as a single client-side page with URL search params tracking the active step (`?step=config|upload|schema`), persisting draft state to Supabase on each step transition. Use Supabase Auth middleware for session refresh, Supabase Storage signed upload URLs for images, and CodeMirror 6 for the JSON editor with inline validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multi-step wizard, not single page
- Flow order reversed: **configuration questions first**, then upload, then schema/prompt
  - Step 1: Configuration questions (rank priorities, choose strategy preset, set sample count)
  - Step 2: Image upload loop (1-10 images, each with expected JSON output)
  - Step 3: Schema & prompt (auto-generate for review, or user provides their own). Warn if schemas across images are incompatible
- Free navigation between completed steps (click any step to go back and edit)
- Draft state persisted to database -- users can leave and resume later
- List view showing all uploaded images as cards -- click into any to add/edit JSON
- Both paste (code editor) and file upload (.json) supported for expected output
- Image preview is expandable: starts as thumbnail, click to expand full preview
- Inline validation errors in the JSON editor (red underlines + error message)
- Progression blocked until all JSON is valid -- hard stop with clear messaging
- Schema mismatch between images surfaced as validation error
- Priority ranking via drag-to-rank: speed, accuracy, cost -- user drags into #1/#2/#3 order
- Strategy selection via named presets (e.g., "Quick Survey", "Deep Dive", "Balanced")
- System suggests a model set based on priorities and strategy; user can add/remove models to override
- Cost preview shown as a summary card: estimated models tested, total runs, estimated time, confidence level
- Dashboard is the primary logged-in experience -- list of past reports
- Empty state: big CTA "Run your first benchmark" with link to example report
- Report cards show summary stats: date, top model, accuracy %, cost, number of models tested
- Simple chronological list (newest first), no search/filter/tags for v1

### Claude's Discretion
- Auth provider UI and flow (email/password, Google, GitHub, magic link -- all supported per requirements)
- Loading states, transitions, and animations between wizard steps
- Exact layout and visual design of wizard steps
- Error state handling throughout the flow
- Mobile responsiveness approach

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (from project-level research -- Phase 1 subset)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.x | Full-stack React framework | App Router, React Compiler stable, Turbopack default. Prior decision. |
| React | 19.2.x | UI library | Bundled with Next.js 16. React Compiler 1.0 eliminates manual memoization. |
| TypeScript | ~5.9.x | Type safety | Strict mode. Zod schemas for runtime validation. |
| @supabase/supabase-js | ^2.95.x | Browser/server Supabase client | Single client for Auth, DB, Storage, Realtime. |
| @supabase/ssr | ^0.8.x | SSR auth helpers for Next.js | Cookie-based auth with middleware token refresh. Replaces deprecated auth-helpers-nextjs. |
| Zod | ^4.3.x | Schema validation | Form validation, JSON structure validation, API input validation. |
| Tailwind CSS | ^4.1.x | Utility-first CSS | CSS-native config via `@theme`, `@tailwindcss/postcss` for Next.js. |
| lucide-react | ^0.563.x | Icons | Tree-shakeable, consistent style. Already in prototype. |

### Phase 1 Additions
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/react | ^0.2.4 | Drag-to-rank priority ordering | Step 1: drag accuracy/speed/cost into ranked order. New API (replaces @dnd-kit/core+sortable). |
| @dnd-kit/helpers | ^0.2.4 | Array reorder helpers for dnd-kit | Used with @dnd-kit/react for `move()` utility on drag end. |
| react-dropzone | ^14.3.x | Drag-and-drop file upload | Step 2: image upload drop zone. Handles file type validation, multiple files. |
| @uiw/react-codemirror | ^4.23.x | CodeMirror 6 React wrapper | Step 2: JSON editor for expected output per image. |
| @codemirror/lang-json | ^6.0.x | JSON language support for CodeMirror | Syntax highlighting, bracket matching, folding. |
| @uiw/codemirror-theme-vscode | latest | Dark theme for CodeMirror | Matches dark-warm palette. Use VS Code Dark theme as base, customize to match void/ember palette. |
| @jsonhero/schema-infer | ^0.1.x | JSON schema inference from examples | Step 3: auto-detect schema from user-provided JSON examples. |
| nuqs | ^2.8.x | URL search param state management | Track active wizard step in URL (`?step=config`). Type-safe, server-compatible. |
| nanoid | ^5.1.x | Generate unique IDs | Draft IDs, image IDs, file path generation for Storage. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/react (v0.2.4) | @dnd-kit/core + @dnd-kit/sortable (v10.0.0 / v10.0.0) | New @dnd-kit/react is pre-1.0 but actively published (3 days ago). For a 3-item ranked list, API surface is small. If stability issues arise, can fall back to stable v10 packages. |
| @dnd-kit/react | Simple CSS + pointer events | For only 3 items (accuracy, speed, cost), a custom drag handler is feasible in ~100 lines. But @dnd-kit provides accessibility (keyboard reorder), touch support, and animation out of the box. |
| react-dropzone | HTML5 native drag-and-drop | react-dropzone handles edge cases: file type validation, multiple files, click-to-browse fallback, `getInputProps`/`getRootProps` pattern. Worth the dependency for upload UX. |
| @uiw/react-codemirror | Monaco Editor (@monaco-editor/react) | Monaco is ~5MB vs CodeMirror ~200KB. For a JSON editor with validation, CodeMirror is the right weight class. Monaco would dominate the client bundle for minimal gain. |
| @uiw/react-codemirror | Textarea + manual JSON.parse | Loses syntax highlighting, bracket matching, line numbers, inline error markers. The user decision requires "inline validation errors with red underlines" -- needs a real code editor. |
| @jsonhero/schema-infer | Custom schema inference (~80 lines) | For flat/shallow JSON (receipts, invoices), custom inference is straightforward. But @jsonhero/schema-infer handles edge cases (nested arrays, optional fields from multiple examples, type unions) and produces standard JSON Schema output. |
| nuqs | React state + manual URL sync | nuqs provides type-safe parsers, server component compatibility, batched updates. Manual URL sync is error-prone with Next.js App Router hydration. |

**Installation:**
```bash
# Create Next.js 16 project
npx create-next-app@latest modelpick --typescript --tailwind --app --src-dir

# Core (Supabase + validation)
npm install @supabase/supabase-js @supabase/ssr zod nanoid

# Phase 1 UI
npm install @dnd-kit/react @dnd-kit/helpers react-dropzone @uiw/react-codemirror @codemirror/lang-json @uiw/codemirror-theme-vscode @jsonhero/schema-infer nuqs lucide-react
```

## Architecture Patterns

### Recommended Project Structure (Phase 1)
```
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                    # Landing (minimal for Phase 1)
│   │   └── layout.tsx                  # Marketing layout (no auth)
│   ├── (app)/
│   │   ├── layout.tsx                  # Authenticated layout (sidebar/nav)
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Past reports list (AUTH-05)
│   │   └── benchmark/
│   │       └── new/
│   │           └── page.tsx            # Wizard page (single route, steps via URL param)
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx                # Login form (AUTH-01, AUTH-02, AUTH-03)
│   │   ├── signup/
│   │   │   └── page.tsx                # Signup form
│   │   ├── callback/
│   │   │   └── route.ts               # OAuth/magic link callback handler
│   │   └── confirm/
│   │       └── route.ts               # Email confirmation PKCE exchange
│   ├── api/
│   │   └── upload/
│   │       └── signed-url/
│   │           └── route.ts            # Generate signed upload URLs
│   └── layout.tsx                      # Root layout
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient helper
│   │   ├── server.ts                   # createServerClient helper
│   │   ├── admin.ts                    # Service role client (server only)
│   │   └── middleware.ts               # Session refresh logic
│   ├── schema/
│   │   ├── infer.ts                    # Schema inference from JSON examples
│   │   └── validate.ts                 # Schema compatibility checking across images
│   ├── wizard/
│   │   ├── presets.ts                  # Strategy presets (Quick Survey, Deep Dive, Balanced)
│   │   ├── cost-estimator.ts           # Estimate API cost from config
│   │   └── model-recommender.ts        # Suggest models based on priorities + strategy
│   └── config/
│       ├── models.ts                   # Curated model lineup with metadata
│       └── constants.ts                # Limits, defaults, pricing
├── components/
│   ├── wizard/
│   │   ├── wizard-shell.tsx            # Step navigation, progress indicator, step routing
│   │   ├── step-config.tsx             # Step 1: Priority ranking + strategy + sample count
│   │   ├── step-upload.tsx             # Step 2: Image upload + JSON editing
│   │   ├── step-schema.tsx             # Step 3: Schema review + prompt
│   │   ├── priority-ranker.tsx         # Drag-to-rank component (dnd-kit)
│   │   ├── strategy-picker.tsx         # Preset selection cards
│   │   ├── model-override.tsx          # Add/remove models from suggestion
│   │   ├── cost-preview.tsx            # Summary card with estimates
│   │   ├── image-card.tsx              # Thumbnail card for uploaded image
│   │   ├── image-uploader.tsx          # Drag-and-drop zone (react-dropzone)
│   │   ├── json-editor.tsx             # CodeMirror JSON editor with validation
│   │   └── schema-review.tsx           # Auto-detected schema with override
│   ├── auth/
│   │   ├── login-form.tsx              # Email/password + social buttons
│   │   ├── signup-form.tsx             # Registration form
│   │   └── social-buttons.tsx          # Google + GitHub OAuth buttons
│   ├── dashboard/
│   │   ├── report-list.tsx             # Past reports chronological list
│   │   ├── report-card.tsx             # Summary card per report
│   │   └── empty-state.tsx             # "Run your first benchmark" CTA
│   └── ui/
│       ├── button.tsx                  # Shared button component
│       ├── card.tsx                    # Shared card component
│       └── step-indicator.tsx          # Wizard progress bar
├── types/
│   ├── database.ts                     # Supabase generated types (supabase gen types)
│   ├── wizard.ts                       # WizardConfig, Priority, Strategy types
│   └── benchmark.ts                    # Report, BenchmarkConfig types
├── middleware.ts                        # Next.js middleware (Supabase session refresh)
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql      # Phase 1 database schema
```

### Pattern 1: Supabase Auth with Middleware Token Refresh
**What:** Supabase Auth uses PKCE flow for server-side rendering. Middleware intercepts every request, refreshes expired tokens, and sets updated cookies so Server Components have a valid session.
**When to use:** Every authenticated route.
**Confidence:** HIGH (official Supabase docs)
```typescript
// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login for protected routes
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/(app)")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### Pattern 2: OAuth + Magic Link Callback Route
**What:** After OAuth redirect or magic link click, Supabase sends a code to a callback URL. The Route Handler exchanges the code for a session using PKCE.
**When to use:** OAuth login (Google, GitHub) and magic link confirmation.
**Confidence:** HIGH (official Supabase docs)
```typescript
// app/auth/callback/route.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error -- redirect to error page
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
```

### Pattern 3: Wizard with URL-Persisted Step State
**What:** The wizard is a single page (`/benchmark/new`) with the active step stored in URL search params via `nuqs`. Draft config is persisted to Supabase on each step transition. Users can refresh, leave, and return to their draft.
**When to use:** The entire wizard flow.
**Confidence:** HIGH (nuqs is well-established, Supabase draft persistence is standard CRUD)
```typescript
// app/(app)/benchmark/new/page.tsx
"use client";

import { useQueryState, parseAsStringEnum } from "nuqs";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { StepConfig } from "@/components/wizard/step-config";
import { StepUpload } from "@/components/wizard/step-upload";
import { StepSchema } from "@/components/wizard/step-schema";

const STEPS = ["config", "upload", "schema"] as const;
type Step = typeof STEPS[number];

export default function NewBenchmarkPage() {
  const [step, setStep] = useQueryState(
    "step",
    parseAsStringEnum(STEPS).withDefault("config")
  );

  // completedSteps tracked in state, derived from draft data
  // Free navigation: user can click any completed step

  return (
    <WizardShell currentStep={step} onStepChange={setStep}>
      {step === "config" && <StepConfig onNext={() => setStep("upload")} />}
      {step === "upload" && <StepUpload onNext={() => setStep("schema")} />}
      {step === "schema" && <StepSchema />}
    </WizardShell>
  );
}
```

### Pattern 4: Image Upload via Supabase Storage Signed URLs
**What:** Server generates a signed upload URL per image. Client uploads directly to Supabase Storage (bypassing Vercel's 4.5MB body limit). File metadata stored in draft config.
**When to use:** Step 2 image upload.
**Confidence:** HIGH (official Supabase Storage API)
```typescript
// app/api/upload/signed-url/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType, draftId } = await request.json();
  const ext = filename.split(".").pop();
  const path = `${user.id}/${draftId}/${nanoid()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("benchmark-images")
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
  });
}

// Client-side upload (in image-uploader.tsx)
async function uploadImage(file: File, draftId: string) {
  // 1. Get signed URL from our API
  const res = await fetch("/api/upload/signed-url", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      draftId,
    }),
  });
  const { signedUrl, token, path } = await res.json();

  // 2. Upload directly to Supabase Storage
  const supabase = createClient(); // browser client
  const { error } = await supabase.storage
    .from("benchmark-images")
    .uploadToSignedUrl(path, token, file);

  if (error) throw error;

  // 3. Get public URL for thumbnail preview
  const { data: { publicUrl } } = supabase.storage
    .from("benchmark-images")
    .getPublicUrl(path);

  return { path, publicUrl };
}
```

### Pattern 5: JSON Editor with Inline Validation
**What:** CodeMirror 6 editor with JSON language support, dark theme, and Zod-based validation that shows inline errors (red underlines + error messages).
**When to use:** Step 2 JSON editing for expected output per image.
**Confidence:** HIGH (CodeMirror 6 is the standard, @uiw/react-codemirror is the standard React wrapper)
```typescript
// components/wizard/json-editor.tsx
"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { useCallback, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean, parsed: unknown) => void;
}

export function JsonEditor({ value, onChange, onValidChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((val: string) => {
    onChange(val);
    try {
      const parsed = JSON.parse(val);
      setError(null);
      onValidChange?.(true, parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setError(msg);
      onValidChange?.(false, null);
    }
  }, [onChange, onValidChange]);

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-raised">
        <span className="text-xs font-mono text-text-muted">expected_output.json</span>
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
      <CodeMirror
        value={value}
        onChange={handleChange}
        theme={vscodeDark}
        extensions={[
          json(),
          linter(jsonParseLinter()),
        ]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          bracketMatching: true,
        }}
        height="300px"
      />
    </div>
  );
}
```

### Pattern 6: Schema Inference and Compatibility Check
**What:** When multiple images have expected JSON, infer a unified schema using @jsonhero/schema-infer. Check that all JSON outputs share compatible schemas (same top-level keys and types). Warn users if schemas diverge.
**When to use:** Step 3 schema review, and as validation on Step 2 when multiple images have JSON.
**Confidence:** MEDIUM (library API verified via npm docs; compatibility checking logic is custom)
```typescript
// lib/schema/infer.ts
import { inferSchema } from "@jsonhero/schema-infer";

export function inferSchemaFromExamples(examples: unknown[]) {
  let inference = inferSchema(examples[0]);
  for (let i = 1; i < examples.length; i++) {
    inference = inferSchema(examples[i], { existing: inference });
  }
  return inference.toJSONSchema();
}

// lib/schema/validate.ts
export function checkSchemaCompatibility(
  examples: Array<{ imageIndex: number; json: unknown }>
): { compatible: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Extract top-level keys from each example
  const keySets = examples.map((ex, i) => ({
    index: ex.imageIndex,
    keys: new Set(Object.keys(ex.json as Record<string, unknown>)),
  }));

  // Check for key mismatches
  const allKeys = new Set(keySets.flatMap(ks => [...ks.keys]));
  for (const key of allKeys) {
    const missing = keySets.filter(ks => !ks.keys.has(key));
    if (missing.length > 0 && missing.length < keySets.length) {
      warnings.push(
        `Field "${key}" is missing from image(s) ${missing.map(m => m.index + 1).join(", ")}. ` +
        `A single report uses one schema across all images.`
      );
    }
  }

  // Check for type mismatches on shared keys
  for (const key of allKeys) {
    const types = new Set(
      examples
        .filter(ex => key in (ex.json as Record<string, unknown>))
        .map(ex => typeof (ex.json as Record<string, unknown>)[key])
    );
    if (types.size > 1) {
      warnings.push(
        `Field "${key}" has inconsistent types across images: ${[...types].join(", ")}. ` +
        `This may cause inaccurate benchmarking.`
      );
    }
  }

  return { compatible: warnings.length === 0, warnings };
}
```

### Pattern 7: Drag-to-Rank with @dnd-kit/react
**What:** Three items (Accuracy, Speed, Cost) in a vertical sortable list. User drags to reorder into #1/#2/#3 priority.
**When to use:** Step 1 priority ranking.
**Confidence:** MEDIUM (@dnd-kit/react is v0.2.4, pre-1.0 but actively maintained)
```typescript
// components/wizard/priority-ranker.tsx
"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { useState } from "react";
import { GripVertical, Target, Zap, DollarSign } from "lucide-react";

const PRIORITY_META = {
  accuracy: { label: "Accuracy", icon: Target, description: "Prioritize correct results" },
  speed: { label: "Speed", icon: Zap, description: "Prioritize fast responses" },
  cost: { label: "Cost", icon: DollarSign, description: "Prioritize lowest price" },
} as const;

type PriorityKey = keyof typeof PRIORITY_META;

interface Props {
  value: PriorityKey[];
  onChange: (ranked: PriorityKey[]) => void;
}

function SortableItem({ id, index }: { id: string; index: number }) {
  const { ref } = useSortable({ id, index });
  const meta = PRIORITY_META[id as PriorityKey];
  const Icon = meta.icon;

  return (
    <div ref={ref} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface-raised cursor-grab active:cursor-grabbing">
      <GripVertical className="w-4 h-4 text-text-muted" />
      <span className="w-6 h-6 rounded-full bg-ember text-white text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <Icon className="w-4 h-4 text-ember" />
      <div>
        <p className="text-sm font-medium text-text-primary">{meta.label}</p>
        <p className="text-xs text-text-muted">{meta.description}</p>
      </div>
    </div>
  );
}

export function PriorityRanker({ value, onChange }: Props) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { source, target } = event.operation;
        if (source && target) {
          onChange(move(value, source, target));
        }
      }}
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary mb-2">
          Drag to rank your priorities
        </label>
        {value.map((id, index) => (
          <SortableItem key={id} id={id} index={index} />
        ))}
      </div>
    </DragDropProvider>
  );
}
```

### Anti-Patterns to Avoid
- **Anti-pattern: Storing wizard state only in React state.** If user refreshes or navigates away, all input is lost. Always persist to Supabase on step transitions. Use `onBeforeUnload` as a safety net but not the primary mechanism.
- **Anti-pattern: Using `getSession()` instead of `getUser()` in server code.** Supabase explicitly warns: "Never trust `getSession()` inside server code." It reads from cookies without revalidating. Always use `getUser()` for authorization checks.
- **Anti-pattern: Uploading images through Next.js API routes.** Vercel has a 4.5MB body size limit on serverless functions. Use Supabase Storage signed upload URLs for direct client-to-storage upload.
- **Anti-pattern: Building custom drag-and-drop from scratch.** Even for 3 items, custom implementations miss keyboard accessibility, touch support, and animation. Use @dnd-kit for accessibility compliance.
- **Anti-pattern: Validating JSON only on form submit.** User decision requires inline validation with red underlines. Validate on every keystroke (debounced) using CodeMirror's linter extension, not on submit.
- **Anti-pattern: Blocking step navigation after completion.** User decision explicitly allows "free navigation between completed steps." Do not force a linear-only flow. Track which steps are complete and allow clicking any completed step.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop file upload | Custom HTML5 drag event handlers | react-dropzone | Edge cases with file type detection, click-to-browse fallback, multiple file handling, touch devices |
| JSON syntax editing with validation | Textarea with regex parsing | @uiw/react-codemirror + @codemirror/lang-json | Syntax highlighting, bracket matching, line numbers, code folding, inline diagnostics (linter), undo/redo |
| Drag-to-rank priority ordering | CSS + pointer events | @dnd-kit/react | Keyboard accessibility (required for a11y), touch support, reorder animation, screen reader announcements |
| URL search param state | Manual URLSearchParams + router.push | nuqs | Type-safe parsers, Next.js App Router hydration safety, batched updates, server component compatibility |
| JSON schema inference | Recursive type checker | @jsonhero/schema-infer | Handles nested objects, arrays, optional fields from multiple examples, produces standard JSON Schema |
| Auth session management | Manual JWT parsing + cookie handling | @supabase/ssr middleware | Token refresh, cookie rotation, PKCE flow, cross-tab session sync |
| Image upload to cloud storage | Base64 encoding + API route proxy | Supabase Storage signed URLs | Bypasses Vercel 4.5MB limit, reduces server memory, direct client-to-storage transfer |

**Key insight:** Phase 1 is almost entirely UI and integration work -- auth flows, file uploads, form validation, state persistence. Every "custom" solution here has well-tested library alternatives that handle accessibility, edge cases, and browser quirks. The custom code should focus on business logic (schema compatibility checking, cost estimation, model recommendation) not infrastructure.

## Common Pitfalls

### Pitfall 1: Supabase Auth Cookie Not Refreshing in Middleware
**What goes wrong:** User's session expires silently. Server Components return null user. Client-side actions fail with 401. User thinks they are logged in (UI shows cached state) but server rejects requests.
**Why it happens:** Middleware must call `supabase.auth.getUser()` on every request to trigger token refresh. If middleware is misconfigured (wrong matcher pattern, missing cookie pass-through), tokens expire without refreshing.
**How to avoid:** (1) Copy the middleware pattern exactly from Supabase's official Next.js SSR guide -- do not simplify it. (2) The matcher must exclude static files but include all page and API routes. (3) Both `request.cookies.set` AND `response.cookies.set` must be called -- the first passes the refreshed token to Server Components, the second sends it to the browser.
**Warning signs:** Intermittent 401 errors after ~1 hour. "Session expired" errors that go away on manual page refresh. Server Components see null user but client-side auth state shows logged in.

### Pitfall 2: OAuth Redirect URL Mismatch Between Environments
**What goes wrong:** Social login works in development but fails in production (or vice versa). User clicks "Sign in with Google," gets redirected to Google, logs in, then gets an error on the callback.
**Why it happens:** Supabase Auth requires the redirect URL to be in the allowed list in the Supabase dashboard. Different environments (localhost:3000, staging.modelpick.ai, modelpick.ai) need different callback URLs. If the production URL is not in the allowed list, the PKCE exchange fails.
**How to avoid:** (1) Add ALL environment callback URLs to Supabase dashboard > Auth > URL Configuration > Redirect URLs: `http://localhost:3000/auth/callback`, `https://modelpick.ai/auth/callback`, etc. (2) Use `process.env.NEXT_PUBLIC_SITE_URL` in signInWithOAuth `redirectTo` parameter, not hardcoded URLs. (3) Also configure the Site URL in Supabase dashboard for magic link emails.
**Warning signs:** OAuth works locally but not on Vercel. Magic link emails contain localhost URLs in production.

### Pitfall 3: Wizard Draft State Race Conditions
**What goes wrong:** User edits Step 1, navigates to Step 2, edits there, then goes back to Step 1 and makes another change. The save from Step 2 overwrites the Step 1 changes because both saves update the same draft row with a full object replacement.
**Why it happens:** If the draft is stored as a single JSONB column and each save replaces the entire object, concurrent or out-of-order saves can lose data.
**How to avoid:** (1) Use Supabase's JSONB partial update with `jsonb_set` or (2) save each step's data to a separate column (`config_step JSONB`, `upload_step JSONB`, `schema_step JSONB`) so saves are independent. Option 2 is simpler and eliminates the race condition entirely. (3) Use optimistic UI -- update local state immediately, persist async, show error toast if save fails.
**Warning signs:** Users report losing settings when navigating between steps. Draft data appears "stale" when returning to a previously completed step.

### Pitfall 4: Large Image Upload Fails Silently
**What goes wrong:** User uploads a 15MB DSLR photo. The signed URL upload succeeds (Supabase Storage accepts up to 50MB by default), but the image is too large for efficient vision model API calls later. Or the upload times out on slow connections with no progress feedback.
**Why it happens:** No client-side file size validation before upload. No upload progress indicator. No server-side image normalization in Phase 1 (normalization happens in Phase 2 benchmark engine).
**How to avoid:** (1) Validate file size on client before uploading: max 10MB per image. (2) Validate format: accept only JPEG, PNG, WebP. Reject HEIC, PDF, TIFF at upload time (can add format conversion later). (3) Show upload progress using Supabase Storage's built-in progress callback or XHR progress events. (4) Generate client-side thumbnails using `URL.createObjectURL()` for immediate preview without waiting for upload. (5) Consider client-side image compression (e.g., browser-native Canvas API resize to 2048px max dimension) before upload to reduce file size.
**Warning signs:** Upload spinner hangs for 30+ seconds. Users upload 20MB RAW photos. Storage costs unexpectedly high.

### Pitfall 5: CodeMirror SSR Hydration Failure
**What goes wrong:** Next.js Server Component tries to render CodeMirror on the server. CodeMirror accesses `window` and `document` during initialization. The build fails or produces hydration mismatch errors.
**Why it happens:** CodeMirror is a browser-only library. Server-rendering it is not supported.
**How to avoid:** (1) Mark the JSON editor component with `"use client"` directive. (2) If the parent page is a Server Component, use `dynamic(() => import("./json-editor"), { ssr: false })` to skip server rendering entirely. (3) Alternatively, since the wizard page will be a client component anyway (it uses `useQueryState` from nuqs), this is naturally handled.
**Warning signs:** Build errors mentioning `window is not defined` or `document is not defined`. Hydration mismatch warnings in dev console.

### Pitfall 6: Schema Inference Produces Overly Broad Schema
**What goes wrong:** User uploads 5 images. Expected JSON for image 1 has `{ total: 8.38 }` (number) and image 3 has `{ total: "$8.38" }` (string). Schema inference produces `{ total: { type: ["number", "string"] } }` -- a union type that is technically correct but useless for benchmarking because the prompt will not know whether to extract a number or string.
**Why it happens:** @jsonhero/schema-infer correctly identifies multiple types when examples disagree. But for benchmarking, the user needs ONE consistent schema. Type disagreements mean the user's expected outputs are inconsistent, which will produce misleading accuracy scores.
**How to avoid:** (1) After inference, scan for union types and surface them as warnings: "Field 'total' has different types across your images (number in images 1,2,4; string in image 3). Pick one format." (2) Show the per-image JSON side-by-side so the user can fix the inconsistency. (3) Block progression to payment if there are unresolved schema conflicts (hard stop per user decision).
**Warning signs:** Schema shows `anyOf` or union types. Multiple images show different data types for the same field.

## Code Examples

### Supabase Browser Client
```typescript
// lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Supabase Server Client
```typescript
// lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from Server Components where cookies are read-only.
            // This is handled by the middleware.
          }
        },
      },
    }
  );
}
```

### Social Login (Google/GitHub)
```typescript
// components/auth/social-buttons.tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export function SocialButtons() {
  const supabase = createClient();

  const signInWithProvider = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => signInWithProvider("google")}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised transition-colors"
      >
        {/* Google icon */}
        <span className="text-sm font-medium">Continue with Google</span>
      </button>
      <button
        onClick={() => signInWithProvider("github")}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised transition-colors"
      >
        {/* GitHub icon */}
        <span className="text-sm font-medium">Continue with GitHub</span>
      </button>
    </div>
  );
}
```

### Magic Link Sign-In
```typescript
// In login-form.tsx
const handleMagicLink = async (email: string) => {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  // Show "Check your email" message
};
```

### Draft Persistence to Supabase
```typescript
// lib/supabase/queries.ts
import type { Database } from "@/types/database";

type BenchmarkDraft = Database["public"]["Tables"]["benchmark_drafts"]["Row"];

export async function saveDraftStep(
  supabase: SupabaseClient,
  draftId: string,
  step: "config" | "upload" | "schema",
  data: Record<string, unknown>
) {
  const column = `${step}_data` as const;
  const { error } = await supabase
    .from("benchmark_drafts")
    .update({
      [column]: data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) throw error;
}

export async function loadDraft(
  supabase: SupabaseClient,
  draftId: string
): Promise<BenchmarkDraft | null> {
  const { data, error } = await supabase
    .from("benchmark_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error) return null;
  return data;
}
```

### Phase 1 Database Schema
```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_jsonschema";

-- Benchmark drafts (wizard state)
CREATE TABLE benchmark_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'paid', 'running', 'complete', 'failed')),

  -- Step 1: Configuration
  config_data JSONB DEFAULT '{}',
  -- Expected shape: { priorities: ["accuracy","speed","cost"], strategy: "balanced", sampleCount: 3 }

  -- Step 2: Upload
  upload_data JSONB DEFAULT '{}',
  -- Expected shape: { images: [{ path, publicUrl, expectedJson, jsonValid }] }

  -- Step 3: Schema & Prompt
  schema_data JSONB DEFAULT '{}',
  -- Expected shape: { inferredSchema, userSchema, prompt, schemaSource: "auto"|"manual" }

  -- Model configuration (computed from config, user can override)
  selected_models TEXT[] DEFAULT '{}',
  estimated_cost NUMERIC(10,4),
  estimated_runs INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reports (created from draft after payment, used for dashboard)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES benchmark_drafts(id),
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'running', 'complete', 'failed')),
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Snapshot of config at time of payment
  config_snapshot JSONB NOT NULL,
  image_paths TEXT[] NOT NULL,
  extraction_prompt TEXT NOT NULL,
  json_schema JSONB NOT NULL,

  -- Results (populated after benchmark)
  recommended_model TEXT,
  total_api_cost NUMERIC(10,4),
  model_count INT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_benchmark_drafts_user ON benchmark_drafts(user_id);
CREATE INDEX idx_benchmark_drafts_status ON benchmark_drafts(status) WHERE status = 'draft';
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_share_token ON reports(share_token);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- RLS Policies
ALTER TABLE benchmark_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drafts: owner can CRUD
CREATE POLICY "Users can view own drafts"
  ON benchmark_drafts FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own drafts"
  ON benchmark_drafts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own drafts"
  ON benchmark_drafts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own drafts"
  ON benchmark_drafts FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Reports: owner can read, public can read via share_token
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Anyone can view shared reports"
  ON reports FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Storage bucket for benchmark images
-- Run via Supabase dashboard or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('benchmark-images', 'benchmark-images', false);

-- Storage RLS: authenticated users can upload to their own folder
-- CREATE POLICY "Users can upload own images"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'benchmark-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- CREATE POLICY "Users can view own images"
--   ON storage.objects FOR SELECT
--   TO authenticated
--   USING (bucket_id = 'benchmark-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr (v0.8.x) | 2024 | auth-helpers is deprecated. SSR package uses cookie-based auth with middleware. |
| `getSession()` for server auth | `getUser()` for server auth | 2024 | getSession reads from cookies without revalidation. getUser always validates with Supabase Auth server. |
| @dnd-kit/core + @dnd-kit/sortable | @dnd-kit/react + @dnd-kit/helpers | 2025 | New package consolidates API. DragDropProvider replaces DndContext. useSortable from `@dnd-kit/react/sortable`. Pre-1.0 but active. |
| generateObject (AI SDK) | generateText with output param (AI SDK 6) | 2025 | generateObject deprecated. Not directly Phase 1 but important for Phase 2 awareness. |
| Tailwind CSS config file | CSS-native @theme directive (v4) | 2025 | No tailwind.config.js needed. Use @tailwindcss/postcss for Next.js. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025-2026 | Supabase is transitioning key naming. Both formats work. New projects use "publishable" naming. |

**Deprecated/outdated:**
- @supabase/auth-helpers-nextjs: Deprecated, no new features. Use @supabase/ssr.
- DndContext from @dnd-kit/core: Legacy API. DragDropProvider from @dnd-kit/react is the new API.
- `supabase.auth.getSession()` in server code: Insecure. Always use `supabase.auth.getUser()`.

## Open Questions

1. **@dnd-kit/react stability at v0.2.4**
   - What we know: @dnd-kit/react (v0.2.4) is pre-1.0 but published 3 days ago. The sortable API works for simple vertical lists. The legacy @dnd-kit/core + @dnd-kit/sortable (v10.0.0) are stable but may not receive updates.
   - What's unclear: Whether the v0.2.x API will have breaking changes before 1.0.
   - Recommendation: Use @dnd-kit/react for the 3-item priority ranker. The API surface is tiny (one DragDropProvider, one useSortable, one move helper). If it breaks, the fallback is ~100 lines of custom pointer event code for 3 items, or reverting to the stable v10 packages.

2. **Supabase key naming transition (anon vs publishable)**
   - What we know: Supabase docs now reference `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in some places, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in others. Both work. The `create-next-app -e with-supabase` template uses `PUBLISHABLE_KEY`.
   - What's unclear: Whether `ANON_KEY` naming will be fully deprecated.
   - Recommendation: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for now as it is more widely documented and all existing examples use it. Can rename later with no code changes (just env var rename).

3. **Client-side image compression before upload**
   - What we know: Users may upload large images (10-20MB DSLRs). Supabase Storage handles it fine, but large files slow uploads and increase storage costs.
   - What's unclear: Whether to compress client-side in Phase 1 or defer to Phase 2 (where server-side normalization happens for benchmark execution).
   - Recommendation: In Phase 1, enforce a 10MB file size limit on the client. Do NOT add client-side compression yet -- it adds complexity (Canvas API, quality tuning) and Phase 2 will normalize images server-side anyway. Show a clear error if the file exceeds 10MB.

4. **Cost estimation accuracy without live OpenRouter pricing**
   - What we know: Cost preview in the wizard needs to show estimated API cost based on model selection, strategy, and sample count. OpenRouter pricing can change.
   - What's unclear: Whether to fetch live pricing from OpenRouter API at wizard time or use hardcoded estimates.
   - Recommendation: Use hardcoded pricing data from the curated model list (updated at deploy time). Add a "prices as of [date]" disclaimer. Fetching live pricing adds an API call per wizard session and OpenRouter's pricing API may have rate limits. Hardcoded is accurate enough for estimates and simpler.

## Sources

### Primary (HIGH confidence)
- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - createBrowserClient, createServerClient, middleware pattern
- [Supabase Next.js SSR auth setup](https://supabase.com/docs/guides/auth/server-side/nextjs) - complete middleware, server client, callback route
- [Supabase Auth quickstart for Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs) - project setup, template structure
- [Supabase Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google) - Google provider configuration
- [Supabase GitHub OAuth](https://supabase.com/docs/guides/auth/social-login/auth-github) - GitHub provider configuration
- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) - server-side auth flow details
- [Supabase Storage createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) - signed URL API, 2-hour expiry
- [Supabase Storage uploadToSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl) - client-side upload to signed URL
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policies, auth.uid(), performance tips
- [Supabase pg_jsonschema](https://supabase.com/docs/guides/database/extensions/pg_jsonschema) - JSONB validation with check constraints
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) - CLI workflow, db diff, db push
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) - OAuth callback URL configuration

### Secondary (MEDIUM confidence)
- [@dnd-kit/react npm](https://www.npmjs.com/package/@dnd-kit/react) - v0.2.4, published 3 days ago
- [@dnd-kit migration guide](https://next.dndkit.com/react/guides/migration) - DragDropProvider replaces DndContext, new hook API
- [@dnd-kit sortable docs](https://docs.dndkit.com/presets/sortable) - SortableContext, useSortable, verticalListSortingStrategy
- [react-dropzone docs](https://react-dropzone.js.org/) - useDropzone hook, getInputProps/getRootProps
- [@uiw/react-codemirror](https://uiwjs.github.io/react-codemirror/) - CodeMirror 6 React component
- [@codemirror/lang-json npm](https://www.npmjs.com/package/@codemirror/lang-json) - JSON language support, jsonParseLinter
- [@jsonhero/schema-infer GitHub](https://github.com/triggerdotdev/schema-infer) - inferSchema, toJSONSchema, multiple example support
- [nuqs docs](https://nuqs.dev) - v2.8.8, parseAsStringEnum, Next.js App Router support
- [nuqs npm](https://www.npmjs.com/package/nuqs) - type-safe URL state management

### Tertiary (LOW confidence)
- [Signed URL file uploads with Next.js and Supabase (Medium)](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0) - single source, implementation pattern
- [Multi-step form with Next.js and React Context (Medium)](https://medium.com/@wdswy/how-to-build-a-multi-step-form-using-nextjs-typescript-react-context-and-shadcn-ui-ef1b7dcceec3) - wizard pattern reference
- [Top 5 Drag-and-Drop Libraries for React 2026 (Puck)](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - dnd-kit positioning vs alternatives

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All core libraries verified via official docs with version numbers
- Architecture: HIGH - Supabase Auth, Storage, and middleware patterns are officially documented. Wizard pattern uses well-established libraries (nuqs, react-dropzone, CodeMirror)
- Pitfalls: HIGH - Auth cookie refresh, OAuth redirect URLs, draft race conditions, and file upload limits are well-documented failure modes with clear prevention strategies

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- stable libraries, well-documented patterns)
