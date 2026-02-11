"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp, Trash2, Minus, Loader2 } from "lucide-react";
import { JsonEditor } from "@/components/wizard/json-editor";
import type { ImageEntry } from "@/types/wizard";

interface ImageCardProps {
  image: ImageEntry;
  uploading?: boolean;
  onJsonChange: (value: string) => void;
  onValidChange: (isValid: boolean, parsed: unknown) => void;
  onRemove: () => void;
}

function JsonStatusBadge({
  jsonValid,
  expectedJson,
}: {
  jsonValid: boolean;
  expectedJson: string;
}) {
  if (!expectedJson.trim()) {
    return (
      <span className="flex items-center gap-1 text-xs text-text-muted">
        <Minus className="w-3 h-3" />
        No JSON
      </span>
    );
  }
  if (jsonValid) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <Check className="w-3 h-3" />
        Valid
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <X className="w-3 h-3" />
      Invalid
    </span>
  );
}

export function ImageCard({
  image,
  uploading = false,
  onJsonChange,
  onValidChange,
  onRemove,
}: ImageCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-surface-border rounded-xl bg-surface overflow-hidden">
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface-raised relative"
        >
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.publicUrl}
              alt={image.filename}
              className="w-full h-full object-cover"
            />
          )}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {image.filename}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {uploading ? (
              <span className="text-xs text-text-muted">Uploading...</span>
            ) : (
              <span className="text-xs text-text-muted">
                {(image.fileSize / 1024).toFixed(0)} KB
              </span>
            )}
            <JsonStatusBadge
              jsonValid={image.jsonValid}
              expectedJson={image.expectedJson}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            title={expanded ? "Collapse" : "Edit JSON"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-surface-raised transition-colors"
            title="Remove image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-surface-border p-4 space-y-4">
          {/* Full image preview */}
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.publicUrl}
              alt={image.filename}
              className="max-w-md max-h-64 rounded-lg object-contain"
            />
          </div>

          {/* JSON editor */}
          <JsonEditor
            value={image.expectedJson}
            onChange={onJsonChange}
            onValidChange={onValidChange}
          />
        </div>
      )}
    </div>
  );
}
