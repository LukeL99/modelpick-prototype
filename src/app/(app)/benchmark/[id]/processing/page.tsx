import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveProgress } from "@/components/benchmark/live-progress";
import type { Report } from "@/types/database";

export default async function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report || (report as Report).user_id !== user.id) {
    redirect("/dashboard");
  }

  const typedReport = report as Report;

  // Handle already-complete or failed reports
  if (typedReport.status === "complete" && typedReport.share_token) {
    redirect(`/report/${typedReport.share_token}`);
  }

  if (typedReport.status === "failed") {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-400">
              Benchmark failed
            </h1>
            <p className="text-sm text-text-secondary">
              Something went wrong while running your benchmark. Please try
              again.
            </p>
          </div>
          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-surface-raised px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-border transition-colors"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  const configSnapshot = typedReport.config_snapshot as Record<string, unknown>;
  const selectedModels = (configSnapshot?.selected_models as string[]) ?? [];
  const imagePaths = typedReport.image_paths ?? [];
  const sampleCount = (configSnapshot?.sampleCount as number) ?? 1;
  const totalRunsPerModel = sampleCount * imagePaths.length;

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="text-center space-y-6">
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-[3px] border-surface-border" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-ember animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">
            Your benchmark is running...
          </h1>
          <p className="text-sm text-text-secondary">
            We are testing {selectedModels.length} model
            {selectedModels.length !== 1 ? "s" : ""} across{" "}
            {imagePaths.length} image
            {imagePaths.length !== 1 ? "s" : ""}. This typically takes 2-5
            minutes.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {selectedModels.length}
            </p>
            <p className="text-xs text-text-muted">Models</p>
          </div>
          <div className="w-px h-8 bg-surface-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-text-primary">
              {imagePaths.length}
            </p>
            <p className="text-xs text-text-muted">Images</p>
          </div>
        </div>

        {/* Live Progress */}
        <LiveProgress
          reportId={id}
          selectedModelIds={selectedModels}
          totalRunsPerModel={totalRunsPerModel}
          shareToken={typedReport.share_token}
        />

        <div className="pt-4">
          <p className="text-xs text-text-muted">
            You can close this page -- we will email you when your report is
            ready.
          </p>
        </div>
      </div>
    </div>
  );
}
