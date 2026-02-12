import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { transformRunsToReport } from "@/lib/report/aggregate";
import { generateRationale } from "@/lib/report/recommendation";
import { ReportHeader } from "@/components/report/report-header";
import { RecommendationCard } from "@/components/report/recommendation-card";
import { RankedTable } from "@/components/report/ranked-table";
import type { Report, BenchmarkRun } from "@/types/database";

interface ReportPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Benchmark Report | ModelBlitz",
    description:
      "Vision model benchmark results comparing accuracy, cost, and latency across models.",
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { token } = await params;

  const supabase = await createClient();

  // Load report by share_token
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("share_token", token)
    .single();

  if (reportError || !report) {
    notFound();
  }

  const typedReport = report as unknown as Report;

  // Only show complete reports
  if (typedReport.status !== "complete") {
    notFound();
  }

  // Load all benchmark runs for this report
  const { data: runs, error: runsError } = await supabase
    .from("benchmark_runs")
    .select("*")
    .eq("report_id", typedReport.id)
    .order("model_id");

  if (runsError || !runs) {
    notFound();
  }

  const typedRuns = runs as unknown as BenchmarkRun[];

  // Transform raw data into report view model
  const reportData = transformRunsToReport(typedRuns, typedReport);

  // Generate recommendation rationale
  const recommended = reportData.models.find(
    (m) => m.modelId === reportData.recommendedModelId
  );

  let rationale = "";
  if (recommended) {
    rationale = generateRationale(
      recommended,
      reportData.models,
      reportData.priorities
    );
  }

  return (
    <div
      id="report-content"
      className="max-w-6xl mx-auto px-6 py-8 space-y-8"
    >
      <ReportHeader reportData={reportData} shareToken={token} />

      <section className="space-y-6">
        <RecommendationCard
          recommended={recommended}
          rationale={rationale}
          models={reportData.models}
        />
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">
          Model Rankings
        </h2>
        <RankedTable models={reportData.models} />
      </section>

      {/* Charts section - Plan 04 will add components here */}
      {/* Error analysis section - Plan 04 will add components here */}
      {/* Cost calculator section - Plan 04 will add components here */}
    </div>
  );
}
