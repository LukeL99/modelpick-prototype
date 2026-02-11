import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ember/10 text-ember mb-6">
        <BarChart3 className="h-8 w-8" />
      </div>

      <h2 className="text-2xl font-bold text-text-primary mb-3">
        Run your first benchmark
      </h2>

      <p className="text-text-secondary max-w-md mb-8 leading-relaxed">
        Upload sample images, tell us what to extract, and we&apos;ll test 20+
        vision models to find the best one for your use case.
      </p>

      <Link href="/benchmark/new">
        <Button variant="primary" size="lg">
          Start Benchmark
        </Button>
      </Link>

      <a
        href="#"
        className="mt-4 text-sm text-text-muted hover:text-text-secondary transition-colors"
      >
        See an example report
      </a>
    </div>
  );
}
