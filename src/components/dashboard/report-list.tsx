import { ReportCard } from "@/components/dashboard/report-card";
import type { Report } from "@/types/database";

interface ReportListProps {
  reports: Report[];
}

export function ReportList({ reports }: ReportListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">
          Your Reports{" "}
          <span className="text-text-muted font-normal text-base">
            ({reports.length})
          </span>
        </h2>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}
