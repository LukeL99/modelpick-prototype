---
status: diagnosed
trigger: "Mock Payment 400 'No valid models selected' (UAT Test 2)"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - handleComplete overwrites schema_data with stale savedSchemaData state
test: traced full data flow from wizard selection to checkout API
expecting: n/a - root cause found
next_action: return diagnosis

## Symptoms

expected: Clicking Pay $14.99 with DEBUG_MOCK_STRIPE=true should complete checkout successfully
actual: Returns 400 Bad Request with {"error":"No valid models selected"}
errors: 400 Bad Request - {"error":"No valid models selected"}
reproduction: Select 15 models in wizard, reach confirmation screen, click Pay $14.99 with DEBUG_MOCK_STRIPE=true
started: Always broken for fresh wizard sessions; may work when resuming a saved draft

## Eliminated

- hypothesis: checkout API reads models from wrong field
  evidence: checkout API reads from schema_data.selectedModelIds (line 67 of route.ts), which is exactly where StepSchema saves them via auto-save. The read path is correct.
  timestamp: 2026-02-12

- hypothesis: models are never saved to the draft at all
  evidence: StepSchema auto-save (step-schema.tsx line 172-208) calls onSaveSchema with selectedModelIds every 500ms on change. handleSaveSchema (page.tsx line 267-286) persists this to schema_data via saveDraftStep. The initial save works correctly.
  timestamp: 2026-02-12

- hypothesis: getModelById fails to resolve the model IDs
  evidence: This is downstream of the real problem. The selectedModelIds array is empty ([]) by the time checkout reads it because the schema_data was overwritten. But getModelById itself works fine with valid IDs.
  timestamp: 2026-02-12

## Evidence

- timestamp: 2026-02-12
  checked: BenchmarkDraft type (src/types/database.ts line 28)
  found: Draft has a top-level `selected_models: string[]` field AND schema_data JSONB column. Checkout API only reads from schema_data.selectedModelIds, ignoring the top-level field.
  implication: Two places models could be stored, but checkout only checks one

- timestamp: 2026-02-12
  checked: StepSchema auto-save effect (src/components/wizard/step-schema.tsx lines 172-208)
  found: Every 500ms when dependencies change, calls onSaveSchema with { selectedModelIds: selectedModels.map(m => m.id), ... }. This correctly saves model IDs to schema_data.
  implication: Model IDs ARE saved to schema_data during wizard interaction

- timestamp: 2026-02-12
  checked: handleSaveSchema in page.tsx (lines 267-286)
  found: Calls saveDraftStep("schema", { ...data, selectedModelIds }) which writes to schema_data JSONB column. But does NOT call setSavedSchemaData() to update React state.
  implication: React state savedSchemaData is stale - never updated after initial load

- timestamp: 2026-02-12
  checked: setSavedSchemaData usage (grep across entire src/)
  found: setSavedSchemaData is called in exactly ONE place: loadDraftData() at page.tsx line 152, during initial draft loading. Never called during the wizard session.
  implication: For a fresh wizard session, savedSchemaData remains null throughout

- timestamp: 2026-02-12
  checked: handleComplete in page.tsx (lines 289-315)
  found: Sends PATCH request with body { step: "schema", data: savedSchemaData ?? {}, status: "ready" }. Since savedSchemaData is null (fresh session) or stale (never updated by handleSaveSchema), this sends {} or stale data as the schema step data.
  implication: THIS IS THE BUG - handleComplete OVERWRITES schema_data with empty/stale data, destroying the selectedModelIds that were previously saved by auto-save

- timestamp: 2026-02-12
  checked: saveDraftStep in queries.ts (lines 46-69)
  found: Uses supabase .update({ [column]: data }) which REPLACES the entire JSONB column value, not a merge/patch
  implication: The overwrite is destructive - the entire schema_data column is replaced with {} or stale data

- timestamp: 2026-02-12
  checked: ConfirmationScreen rendering in page.tsx (line 358)
  found: Passes selectedModels={savedSchemaData?.selectedModelIds ?? []}. Since savedSchemaData is null/stale, this passes [] to the confirmation screen.
  implication: This is the SAME root cause as "confirmation screen showing 0 models" - both symptoms share one bug

## Resolution

root_cause: |
  handleComplete() in src/app/(app)/benchmark/new/page.tsx (line 289) sends `savedSchemaData ?? {}` as the schema data when setting draft status to "ready". But `savedSchemaData` is a React state that is ONLY populated during initial draft loading (loadDraftData, line 152) and is NEVER updated when the user interacts with the schema step.

  The auto-save in StepSchema correctly persists selectedModelIds to the schema_data JSONB column every 500ms. But when handleComplete fires, it overwrites that column with the stale savedSchemaData state (which is null for fresh sessions, yielding {}). This destroys the selectedModelIds.

  The data flow:
  1. User selects models in StepSchema
  2. Auto-save correctly writes { selectedModelIds: [...15 ids...], prompt, ... } to schema_data
  3. User clicks "Ready for Payment" -> handleComplete fires
  4. handleComplete sends PATCH with { step: "schema", data: savedSchemaData ?? {} } = { data: {} }
  5. saveDraftStep REPLACES schema_data with {} (destructive overwrite, not merge)
  6. schema_data now has NO selectedModelIds
  7. User clicks Pay -> checkout API reads schema_data.selectedModelIds -> gets [] -> returns 400

  Two symptoms, one cause:
  - Confirmation screen shows "0 models" because it reads from savedSchemaData?.selectedModelIds (stale/null)
  - Checkout returns 400 because schema_data was overwritten with {} by handleComplete

fix:
verification:
files_changed: []
