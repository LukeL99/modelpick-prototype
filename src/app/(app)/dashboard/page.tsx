import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ReportList } from "@/components/dashboard/report-list";
import type { Report } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let reports: Report[] = [];

  if (user) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      reports = data as Report[];
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <ReportList reports={reports} />
      )}
    </div>
  );
}
