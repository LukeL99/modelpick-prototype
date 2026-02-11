"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { GripVertical, Target, Zap, DollarSign, type LucideIcon } from "lucide-react";
import type { Priority } from "@/types/wizard";

const PRIORITY_META: Record<
  Priority,
  { label: string; icon: LucideIcon; description: string }
> = {
  accuracy: {
    label: "Accuracy",
    icon: Target,
    description: "Prioritize correct results",
  },
  speed: {
    label: "Speed",
    icon: Zap,
    description: "Prioritize fast responses",
  },
  cost: {
    label: "Cost",
    icon: DollarSign,
    description: "Prioritize lowest price",
  },
};

interface SortableItemProps {
  id: string;
  index: number;
}

function SortableItem({ id, index }: SortableItemProps) {
  const { ref } = useSortable({ id, index });
  const meta = PRIORITY_META[id as Priority];
  const Icon = meta.icon;

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface-raised cursor-grab active:cursor-grabbing transition-colors hover:border-text-muted"
    >
      <GripVertical className="w-4 h-4 text-text-muted flex-shrink-0" />
      <span className="w-6 h-6 rounded-full bg-ember text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
        {index + 1}
      </span>
      <Icon className="w-4 h-4 text-ember flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{meta.label}</p>
        <p className="text-xs text-text-muted">{meta.description}</p>
      </div>
    </div>
  );
}

interface PriorityRankerProps {
  value: Priority[];
  onChange: (ranked: Priority[]) => void;
}

export function PriorityRanker({ value, onChange }: PriorityRankerProps) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        onChange(move(value, event) as Priority[]);
      }}
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary mb-3">
          Drag to rank your priorities
        </label>
        {value.map((id, index) => (
          <SortableItem key={id} id={id} index={index} />
        ))}
      </div>
    </DragDropProvider>
  );
}
