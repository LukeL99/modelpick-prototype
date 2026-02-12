import type { ModelSummary } from "@/types/report";

interface RecommendationCardProps {
  recommended: ModelSummary | undefined;
  rationale: string;
  models: ModelSummary[];
}

export function RecommendationCard({
  recommended,
}: RecommendationCardProps) {
  if (!recommended) return null;

  // Stub -- fully implemented in Task 2
  return <div />;
}
