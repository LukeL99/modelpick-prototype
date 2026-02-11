import type { SupabaseClient } from "@supabase/supabase-js";
import type { BenchmarkDraft } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Create a new draft for the current user.
 */
export async function createDraft(
  supabase: AnyClient,
  userId: string
): Promise<BenchmarkDraft> {
  const { data, error } = await supabase
    .from("benchmark_drafts")
    .insert({ user_id: userId, status: "draft" })
    .select()
    .single();

  if (error) throw error;
  return data as BenchmarkDraft;
}

/**
 * Load a draft by ID. Returns null if not found.
 * RLS ensures user can only see their own drafts.
 */
export async function loadDraft(
  supabase: AnyClient,
  draftId: string
): Promise<BenchmarkDraft | null> {
  const { data, error } = await supabase
    .from("benchmark_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (error) return null;
  return data as BenchmarkDraft;
}

/**
 * Update a specific step's data in a draft.
 * Uses separate JSONB columns per step to prevent race conditions.
 */
export async function saveDraftStep(
  supabase: AnyClient,
  draftId: string,
  step: "config" | "upload" | "schema",
  data: Record<string, unknown>
): Promise<void> {
  const columnMap = {
    config: "config_data",
    upload: "upload_data",
    schema: "schema_data",
  } as const;

  const column = columnMap[step];

  const { error } = await supabase
    .from("benchmark_drafts")
    .update({
      [column]: data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  if (error) throw error;
}

/**
 * Get all drafts for the current user, ordered by most recently updated.
 * RLS ensures only the user's own drafts are returned.
 */
export async function getUserDrafts(
  supabase: AnyClient
): Promise<BenchmarkDraft[]> {
  const { data, error } = await supabase
    .from("benchmark_drafts")
    .select("*")
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as BenchmarkDraft[]) ?? [];
}
