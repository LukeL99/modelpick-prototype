import { createClient } from "@/lib/supabase/server";
import { loadDraft, saveDraftStep } from "@/lib/supabase/queries";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/drafts/[id]
 * Load a draft by ID. RLS ensures user owns the draft.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await loadDraft(supabase, id);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  return NextResponse.json(draft);
}

/**
 * PATCH /api/drafts/[id]
 * Update a draft's step data and optionally its status.
 * Body: { step: 'config' | 'upload' | 'schema', data: object, status?: 'ready' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify draft exists and user owns it
  const draft = await loadDraft(supabase, id);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { step, data, status, selectedModels, estimatedCost, estimatedRuns } =
      body as {
        step: "config" | "upload" | "schema";
        data: Record<string, unknown>;
        status?: string;
        selectedModels?: string[];
        estimatedCost?: number;
        estimatedRuns?: number;
      };

    // Step save (optional -- status-only updates skip this)
    if (step) {
      if (!data || !["config", "upload", "schema"].includes(step)) {
        return NextResponse.json(
          {
            error:
              "Invalid request. Step requires valid name ('config'|'upload'|'schema') and data.",
          },
          { status: 400 }
        );
      }
      await saveDraftStep(supabase, id, step, data);
    } else if (!status) {
      // Neither step nor status provided -- nothing to do
      return NextResponse.json(
        { error: "Invalid request. Requires step and data, or status." },
        { status: 400 }
      );
    }

    // If status update requested (e.g., setting to 'ready' on completion)
    if (
      status &&
      ["draft", "ready"].includes(status)
    ) {
      const updateFields: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (selectedModels) updateFields.selected_models = selectedModels;
      if (estimatedCost !== undefined)
        updateFields.estimated_cost = estimatedCost;
      if (estimatedRuns !== undefined)
        updateFields.estimated_runs = estimatedRuns;

      const { error: statusError } = await supabase
        .from("benchmark_drafts")
        .update(updateFields)
        .eq("id", id);

      if (statusError) throw statusError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
