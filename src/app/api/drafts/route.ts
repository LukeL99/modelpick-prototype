import { createClient } from "@/lib/supabase/server";
import { createDraft } from "@/lib/supabase/queries";
import { NextResponse } from "next/server";

/**
 * POST /api/drafts
 * Create a new benchmark draft for the authenticated user.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const draft = await createDraft(supabase, user.id);
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
