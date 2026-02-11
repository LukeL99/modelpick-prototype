import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Trophy, DollarSign, Layers, Clock } from "lucide-react";
import type { Report } from "@/types/database";

interface ReportCardProps {
  report: Report;
}

const statusStyles: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Pending", color: "text-text-muted" },
  paid: { label: "Queued", color: "text-blue-400" },
  running: { label: "Running", color: "text-amber-400" },
  complete: { label: "Complete", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCost(cost: number | null): string {
  if (cost === null) return "--";
  return `$${cost.toFixed(2)}`;
}

export function ReportCard({ report }: ReportCardProps) {
  const status = statusStyles[report.status] ?? statusStyles.pending_payment;

  return (
    <Link href={`/report/${report.id}`}>
      <Card className="p-5 hover:border-text-muted transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(report.created_at)}</span>
          </div>
          <span className={`text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {report.recommended_model ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-ember" />
              <span className="font-semibold text-text-primary group-hover:text-ember transition-colors">
                {report.recommended_model}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCost(report.total_api_cost)}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {report.model_count ?? 0} models tested
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            {report.status === "running"
              ? "Benchmark in progress..."
              : "Results pending"}
          </p>
        )}
      </Card>
    </Link>
  );
}
