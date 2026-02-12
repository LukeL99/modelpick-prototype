import type { ReportData } from "@/types/report";
import { ShareButton } from "@/components/report/share-button";

interface ReportHeaderProps {
  reportData: ReportData;
  shareToken: string;
}

function formatCompletedDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportHeader({ reportData, shareToken }: ReportHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-text-primary">
            Benchmark Report
          </h1>
          <p className="text-text-secondary">
            {reportData.modelCount} models tested across{" "}
            {reportData.imageCount} images
          </p>
          {reportData.completedAt && (
            <p className="text-text-muted text-sm">
              Completed {formatCompletedDate(reportData.completedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ShareButton shareToken={shareToken} />
          <div id="pdf-export-slot" />
        </div>
      </div>
    </div>
  );
}
