---
status: diagnosed
trigger: "Confirmation Screen Issues (UAT Test 1) - 4 sub-problems: flash page, lost prompt on back, blank upload JSON, 0 models"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:01:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: All 4 issues traced to root causes. Core problem: `savedSchemaData` state in page.tsx is never updated by `handleSaveSchema`, plus a render-order race in StepSchema.
test: Code trace complete
expecting: N/A - diagnosis complete
next_action: Return findings

## Symptoms

expected: |
  1. No flash page before confirmation screen
  2. Going back from confirmation preserves prompt text
  3. Going back to upload and editing expected_output.json shows previously entered JSON
  4. Confirmation screen shows correct model count (e.g. 15)
actual: |
  1. Flash "benchmark configured" page appears ~1 second before confirmation
  2. Clicking "back to edit" loses the prompt in Schema and Prompt step
  3. Going back to Upload Phase, editing expected_output.json shows blank data
  4. Confirmation screen shows "0 models"
errors: none reported
reproduction: Follow wizard flow through to confirmation screen
started: Current implementation

## Eliminated

- hypothesis: Upload data gets overwritten by handleComplete
  evidence: handleComplete only PATCHes step="schema", not "upload". upload_data column is untouched.
  timestamp: 2026-02-12T00:01:00Z

- hypothesis: debounceSaveUpload strips expectedJson
  evidence: Line 225 of page.tsx explicitly includes `expectedJson: img.expectedJson` in serializable images
  timestamp: 2026-02-12T00:01:00Z

## Evidence

- timestamp: 2026-02-12T00:00:10Z
  checked: page.tsx handleSaveSchema callback (lines 267-286)
  found: |
    handleSaveSchema calls saveDraftStep("schema", ...) to persist to DB,
    but does NOT call setSavedSchemaData(). The savedSchemaData state variable
    in page.tsx is ONLY populated during loadDraftData() on initial page load.
    For a fresh draft (no ?draft= param), savedSchemaData remains null for the
    entire session.
  implication: |
    Any code reading savedSchemaData during the session gets stale/null data.
    This is the root cause of issues #2, #3 (partially), and #4.

- timestamp: 2026-02-12T00:00:20Z
  checked: StepSchema handleComplete (line 228-232) vs page.tsx handleComplete (lines 289-315)
  found: |
    StepSchema.handleComplete() does TWO things synchronously then async:
    1. setIsComplete(true)  -- immediate, renders "Benchmark Configured!" success page
    2. onComplete()         -- async, takes ~1 second for API PATCH

    page.tsx handleComplete (onComplete) then:
    3. PATCHes draft with data: savedSchemaData ?? {} and status: "ready"
    4. On success: setShowConfirmation(true)

    The render sequence is:
    - Frame 1: StepSchema renders "Benchmark Configured!" (isComplete=true)
    - ~1 second later: showConfirmation=true, page.tsx replaces wizard with ConfirmationScreen
  implication: |
    The "Benchmark Configured!" page is visible for the duration of the
    async handleComplete API call (~1 second). This is the flash (issue #1).

- timestamp: 2026-02-12T00:00:30Z
  checked: ConfirmationScreen selectedModels prop (page.tsx line 358)
  found: |
    selectedModels={savedSchemaData?.selectedModelIds ?? []}
    Since savedSchemaData is null for fresh drafts (never updated by
    handleSaveSchema), this always passes [] to ConfirmationScreen.
  implication: |
    ConfirmationScreen.selectedModels.length === 0, hence "0 models" (issue #4).

- timestamp: 2026-02-12T00:00:40Z
  checked: handleComplete PATCH body (page.tsx line 297-299)
  found: |
    body: JSON.stringify({
      step: "schema",
      data: savedSchemaData ?? {},  // savedSchemaData is null -> sends {}
      status: "ready",
    })
    This OVERWRITES the schema_data column in DB with {} (empty object),
    destroying the correctly auto-saved schema data from StepSchema's
    debounced auto-save.
  implication: |
    After handleComplete fires, the DB schema_data column is {}.
    This means: prompt, userSchema, inferredSchema, selectedModelIds are all
    wiped from the DB. If the page is refreshed, loadDraftData finds empty
    schema_data and cannot restore any schema step state.
    This compounds issues #2 and #4 -- even after a page reload the data is gone.

- timestamp: 2026-02-12T00:00:50Z
  checked: StepSchema prompt initialization (line 109)
  found: |
    const [prompt, setPrompt] = useState(savedSchemaData?.prompt ?? "");
    When StepSchema re-mounts after "Back to Edit" cancels confirmation,
    savedSchemaData is still null, so prompt initializes to "".
  implication: |
    The prompt the user typed is lost on re-mount (issue #2). The auto-saved
    data was in the DB but got overwritten with {} by handleComplete. And the
    in-memory savedSchemaData was never updated to begin with.

- timestamp: 2026-02-12T00:00:55Z
  checked: StepSchema selectedModels initialization (lines 131-140)
  found: |
    const [selectedModels, setSelectedModels] = useState<ModelInfo[]>(() => {
      if (savedSchemaData?.selectedModelIds) {
        const ids = new Set(savedSchemaData.selectedModelIds);
        const restored = CURATED_MODELS.filter(m => ids.has(m.id));
        if (restored.length > 0) return restored;
      }
      return recommendation.models;  // Falls back to recommendation
    });
    Since savedSchemaData is null, it falls back to recommendation.models.
    So when StepSchema re-mounts after "Back to Edit", any manual model
    customization is also lost.
  implication: Model selection resets to auto-recommended on re-mount.

- timestamp: 2026-02-12T00:01:00Z
  checked: Upload data persistence for blank JSON issue (issue #3)
  found: |
    In-session: images state is maintained in page.tsx parent component.
    Navigating away from upload and back preserves images in React state.
    The expectedJson field should be present when ImageCard re-mounts.

    HOWEVER: After handleComplete overwrites schema_data with {}, if the
    user refreshes the page, loadDraftData restores images from upload_data
    (which is intact). The upload_data save (debounceSaveUpload) explicitly
    includes expectedJson.

    Possible cause: The issue might be that after handleComplete, the page
    state reflects stale data. Or it could be that the ImageCard's CodeMirror
    instance doesn't properly display the value on re-mount. This needs
    runtime verification.

    Most likely cause: If the user did NOT wait for the debounced upload save
    (500ms) before navigating away from upload step, and then refreshes after
    handleComplete, the upload_data in DB might be stale/incomplete. But within
    the same session, React state should have the data.
  implication: |
    Issue #3 is likely a secondary effect of the overall data flow problem.
    In the most common scenario, it is caused by: (a) the same savedSchemaData
    staleness causing schema_data to be wiped on completion, and then a page
    refresh loading incomplete data, or (b) a CodeMirror re-mount rendering
    issue that needs runtime testing.

## Resolution

root_cause: |
  SHARED ROOT CAUSE for issues #1, #2, and #4:
  The `handleSaveSchema` callback in page.tsx (line 267) saves schema data
  to the DB via saveDraftStep, but NEVER updates the local `savedSchemaData`
  state. This causes three downstream failures:

  1. FLASH PAGE (Issue #1): StepSchema.handleComplete() sets isComplete=true
     synchronously (rendering "Benchmark Configured!") before the parent's
     async handleComplete() can set showConfirmation=true. The success page
     is visible for ~1 second during the API call.
     File: src/components/wizard/step-schema.tsx lines 228-258
     File: src/app/(app)/benchmark/new/page.tsx lines 289-315

  2. LOST PROMPT (Issue #2): When user clicks "Back to Edit" and StepSchema
     re-mounts, it initializes prompt from savedSchemaData?.prompt ?? "".
     Since savedSchemaData was never updated, prompt initializes to "".
     Additionally, handleComplete overwrites schema_data in DB with {} (empty),
     so even a page refresh cannot recover the data.
     File: src/app/(app)/benchmark/new/page.tsx line 297 (data: savedSchemaData ?? {})
     File: src/components/wizard/step-schema.tsx line 109

  3. BLANK UPLOAD JSON (Issue #3): Most likely a secondary effect. The upload_data
     column is NOT overwritten by handleComplete. In-session, React state should
     preserve images. This needs runtime verification to confirm whether it's a
     CodeMirror re-mount issue, a timing issue with the debounced save, or
     user confusion with the save/edit toggle flow.

  4. ZERO MODELS (Issue #4): ConfirmationScreen receives
     selectedModels={savedSchemaData?.selectedModelIds ?? []}. Since
     savedSchemaData is null, it passes [] (empty array), showing "0 models."
     File: src/app/(app)/benchmark/new/page.tsx line 358

fix:
verification:
files_changed: []
