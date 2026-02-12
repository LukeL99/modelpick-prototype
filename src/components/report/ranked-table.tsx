"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { ModelSummary } from "@/types/report";

type SortKey =
  | "accuracy"
  | "costPerRun"
  | "medianLatency"
  | "p95Latency"
  | "spread"
  | "exactMatchRate";

/** Keys where higher is better -- sort descending by default */
const DESC_DEFAULT: Set<SortKey> = new Set(["accuracy", "exactMatchRate"]);

interface RankedTableProps {
  models: ModelSummary[];
}

export function RankedTable({ models }: RankedTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("accuracy");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...models];
    copy.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDesc ? -diff : diff;
    });
    return copy;
  }, [models, sortKey, sortDesc]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortDesc(DESC_DEFAULT.has(key));
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border text-text-muted font-medium">
            <th className="px-3 py-3 text-center w-14">Rank</th>
            <th className="px-3 py-3 text-left">Model</th>
            <SortableHeader
              label="Accuracy"
              sortKey="accuracy"
              activeKey={sortKey}
              desc={sortDesc}
              onSort={handleSort}
            />
            <SortableHeader
              label="Exact Match"
              sortKey="exactMatchRate"
              activeKey={sortKey}
              desc={sortDesc}
              onSort={handleSort}
            />
            <SortableHeader
              label="Cost/Run"
              sortKey="costPerRun"
              activeKey={sortKey}
              desc={sortDesc}
              onSort={handleSort}
            />
            <SortableHeader
              label="Median RT"
              sortKey="medianLatency"
              activeKey={sortKey}
              desc={sortDesc}
              onSort={handleSort}
            />
            <SortableHeader
              label="P95 RT"
              sortKey="p95Latency"
              activeKey={sortKey}
              desc={sortDesc}
              onSort={handleSort}
            />
            <SortableHeader
              label="Spread"
              sortKey="spread"
              activeKey={sortKey}
              desc={sortDesc}
              onSort={handleSort}
            />
            <th className="px-3 py-3 text-center">Runs</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((model, index) => {
            const isFirst = index === 0;
            return (
              <tr
                key={model.modelId}
                className={`border-b border-surface-border/50 hover:bg-surface-raised/50 ${
                  isFirst ? "bg-ember/5" : ""
                }`}
              >
                <td
                  className={`px-3 py-3 text-center tabular-nums font-mono ${
                    isFirst
                      ? "font-bold text-ember"
                      : "font-medium text-text-secondary"
                  }`}
                >
                  #{index + 1}
                </td>
                <td className="px-3 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {model.modelName}
                    </span>
                    <span className="text-xs text-text-muted">
                      {model.provider}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-mono text-text-primary">
                  {model.accuracy}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-mono text-text-primary">
                  {model.exactMatchRate}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-mono text-text-primary">
                  ${model.costPerRun.toFixed(4)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-mono text-text-primary">
                  {model.medianLatency.toLocaleString()}ms
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-mono text-text-primary">
                  {model.p95Latency.toLocaleString()}ms
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-mono text-text-primary">
                  {"\u00b1"}{model.spread}%
                </td>
                <td className="px-3 py-3 text-center tabular-nums font-mono text-text-secondary">
                  {model.runsCompleted}/{model.runsAttempted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  desc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  desc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === activeKey;

  return (
    <th
      className={`px-3 py-3 text-right cursor-pointer select-none transition-colors hover:text-text-primary ${
        isActive ? "text-ember" : ""
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          desc ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </span>
    </th>
  );
}
