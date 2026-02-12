"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  shareToken: string;
}

export function ShareButton({ shareToken }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/report/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-and-copy not needed for modern browsers
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-surface-raised border border-surface-border text-text-primary hover:bg-surface hover:border-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-border focus-visible:ring-offset-2 focus-visible:ring-offset-void"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share
        </>
      )}
    </button>
  );
}
