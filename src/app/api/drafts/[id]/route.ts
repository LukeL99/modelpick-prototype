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
 * Update a draft's step data.
 * Body: { step: 'config' | 'upload' | 'schema', data: object }
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
    const { step, data } = body as {
      step: "config" | "upload" | "schema";
      data: Record<string, unknown>;
    };

    if (!step || !data || !["config", "upload", "schema"].includes(step)) {
      return NextResponse.json(
        { error: "Invalid request. Requires step ('config'|'upload'|'schema') and data." },
        { status: 400 }
      );
    }

    await saveDraftStep(supabase, id, step, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
