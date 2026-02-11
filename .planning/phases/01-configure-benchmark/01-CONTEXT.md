# Phase 1: Configure Benchmark - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth, image upload with expected JSON, and benchmark configuration wizard — everything a user does before payment. User can sign up, upload sample images with expected JSON output, provide an extraction prompt, review inferred schema, and configure a testing plan ready for payment.

</domain>

<decisions>
## Implementation Decisions

### Configuration flow
- Multi-step wizard, not single page
- Flow order is reversed from typical: **configuration questions first**, then upload, then schema/prompt
  - Step 1: Configuration questions (rank priorities, choose strategy preset, set sample count)
  - Step 2: Image upload loop (1-10 images, each with expected JSON output)
  - Step 3: Schema & prompt (auto-generate for review, or user provides their own). Warn if schemas across images are incompatible — a report is for 1 prompt/schema with multiple datapoints
- Free navigation between completed steps (click any step to go back and edit)
- Draft state persisted to database — users can leave and resume later

### Image-to-JSON pairing
- List view showing all uploaded images as cards — click into any to add/edit JSON
- Both paste (code editor) and file upload (.json) supported for expected output
- Image preview is expandable: starts as thumbnail, click to expand full preview
- Inline validation errors in the JSON editor (red underlines + error message)
- Progression blocked until all JSON is valid — hard stop with clear messaging
- Schema mismatch between images surfaced as validation error

### Model selection & cost preview
- Priority ranking via drag-to-rank: speed, accuracy, cost — user drags into #1/#2/#3 order
- Strategy selection via named presets (e.g., "Quick Survey" = many models few runs, "Deep Dive" = fewer models more runs, "Balanced")
- System suggests a model set based on priorities and strategy; user can add/remove models to override
- Cost preview shown as a summary card: estimated models tested, total runs, estimated time, confidence level

### Landing & dashboard
- Dashboard is the primary logged-in experience — list of past reports
- Empty state: big CTA "Run your first benchmark" with a link to an example report showcasing the output data users will receive
- Report cards show summary stats: date, top model, accuracy %, cost, number of models tested
- Simple chronological list (newest first), no search/filter/tags for v1

### Claude's Discretion
- Auth provider UI and flow (email/password, Google, GitHub, magic link — all supported per requirements)
- Loading states, transitions, and animations between wizard steps
- Exact layout and visual design of wizard steps
- Error state handling throughout the flow
- Mobile responsiveness approach

</decisions>

<specifics>
## Specific Ideas

- Configuration questions come first so users express intent before doing work (uploading images)
- Example report link on empty state is key — users should see exactly what data they'll get before starting
- Schema compatibility validation is important: warn users if their per-image JSON outputs have incompatible schemas, since a single report covers 1 prompt/schema across multiple datapoints

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-configure-benchmark*
*Context gathered: 2026-02-11*
