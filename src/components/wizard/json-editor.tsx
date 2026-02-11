"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean, parsed: unknown) => void;
}

export function JsonEditor({ value, onChange, onValidChange }: JsonEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      if (!val.trim()) {
        setError(null);
        onValidChange?.(false, null);
        return;
      }
      try {
        const parsed = JSON.parse(val);
        setError(null);
        onValidChange?.(true, parsed);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid JSON";
        setError(msg);
        onValidChange?.(false, null);
      }
    },
    [onChange, onValidChange]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleChange(content);
      };
      reader.readAsText(file);

      // Reset input so the same file can be re-uploaded
      e.target.value = "";
    },
    [handleChange]
  );

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-raised">
        <span className="text-xs font-mono text-text-muted">
          expected_output.json
        </span>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400 truncate max-w-[200px]">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <Upload className="w-3 h-3" />
            Upload .json
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
      <CodeMirror
        value={value}
        onChange={handleChange}
        theme={vscodeDark}
        extensions={[json(), linter(jsonParseLinter())]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          bracketMatching: true,
        }}
        height="300px"
      />
    </div>
  );
}
