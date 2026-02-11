"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { ImageCard } from "@/components/wizard/image-card";
import { createClient } from "@/lib/supabase/client";
import type { ImageEntry } from "@/types/wizard";

interface StepUploadProps {
  images: ImageEntry[];
  draftId: string;
  sampleCount: number;
  onImagesChange: (images: ImageEntry[]) => void;
}

export function StepUpload({
  images,
  draftId,
  sampleCount,
  onImagesChange,
}: StepUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to the current images so async callbacks see the latest state
  const imagesRef = useRef<ImageEntry[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const showError = useCallback((message: string) => {
    setUploadError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setUploadError(null), 5000);
  }, []);

  // Upload a single file for a specific slot index
  const handleFileForSlot = useCallback(
    async (slotIndex: number, file: File) => {
      const supabase = createClient();

      // Create placeholder entry with local preview URL
      const entry: ImageEntry = {
        id: nanoid(),
        path: "",
        publicUrl: URL.createObjectURL(file),
        filename: file.name,
        fileSize: file.size,
        expectedJson: "",
        jsonValid: false,
        parsedJson: null,
      };

      // Add to state immediately for instant preview
      const current = imagesRef.current;
      // Replace any existing image at this slot index, or add at position
      const updated = [...current];
      // Find if there's already an entry for this slot (by matching position in array)
      // The slot-to-image mapping: images array indices correspond to slot indices
      // If images[slotIndex] exists, we replace it; otherwise we insert/grow
      if (slotIndex < updated.length) {
        // Revoke old blob URL if present
        if (updated[slotIndex].publicUrl.startsWith("blob:")) {
          URL.revokeObjectURL(updated[slotIndex].publicUrl);
        }
        updated[slotIndex] = entry;
      } else {
        // Fill any gaps with entries up to slotIndex
        // (normally shouldn't happen since slots are filled in order, but just in case)
        while (updated.length < slotIndex) {
          updated.push({
            id: nanoid(),
            path: "",
            publicUrl: "",
            filename: "",
            fileSize: 0,
            expectedJson: "",
            jsonValid: false,
            parsedJson: null,
          });
        }
        updated.push(entry);
      }
      onImagesChange(updated);

      // Track uploading state
      setUploadingSlots((prev) => new Set([...prev, slotIndex]));

      try {
        // Get signed URL
        const signedRes = await fetch("/api/upload/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            draftId,
          }),
        });

        if (!signedRes.ok) {
          const err = await signedRes.json();
          throw new Error(err.error || "Failed to get signed URL");
        }

        const { token, path } = await signedRes.json();

        // Upload directly to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from("benchmark-images")
          .uploadToSignedUrl(path, token, file);

        if (uploadErr) throw uploadErr;

        // Update the entry with storage path
        const latestImages = imagesRef.current;
        onImagesChange(
          latestImages.map((img) =>
            img.id === entry.id ? { ...img, path } : img
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        showError(`Failed to upload ${file.name}: ${message}`);

        // Remove the failed entry using latest ref
        const latestImages = imagesRef.current;
        onImagesChange(latestImages.filter((img) => img.id !== entry.id));
      } finally {
        setUploadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slotIndex);
          return next;
        });
      }
    },
    [draftId, onImagesChange, showError]
  );

  const handleJsonChange = useCallback(
    (imageId: string, value: string) => {
      onImagesChange(
        images.map((img) =>
          img.id === imageId ? { ...img, expectedJson: value } : img
        )
      );
    },
    [images, onImagesChange]
  );

  const handleValidChange = useCallback(
    (imageId: string, isValid: boolean, parsed: unknown) => {
      onImagesChange(
        images.map((img) =>
          img.id === imageId
            ? { ...img, jsonValid: isValid, parsedJson: parsed }
            : img
        )
      );
    },
    [images, onImagesChange]
  );

  const handleRemove = useCallback(
    async (slotIndex: number) => {
      const image = images[slotIndex];
      if (!image) return;

      // Remove from state: remove at slot index, don't just filter
      const updated = images.filter((_, i) => i !== slotIndex);
      onImagesChange(updated);

      // Delete from storage if uploaded
      if (image.path) {
        try {
          const supabase = createClient();
          await supabase.storage.from("benchmark-images").remove([image.path]);
        } catch {
          // Non-critical: file will be orphaned but not blocking
        }
      }

      // Revoke object URL if it's a blob URL
      if (image.publicUrl.startsWith("blob:")) {
        URL.revokeObjectURL(image.publicUrl);
      }
    },
    [images, onImagesChange]
  );

  // Create N slots based on sampleCount
  const slots = Array.from({ length: sampleCount }, (_, i) => i);
  const savedCount = images.filter((img) => img.jsonValid).length;
  const allValid =
    images.length === sampleCount && images.every((img) => img.jsonValid);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Upload Sample Images
        </h2>
        <p className="text-sm text-text-secondary">
          Upload {sampleCount} image{sampleCount !== 1 ? "s" : ""} and provide
          the expected JSON output for each. This is the &ldquo;ground
          truth&rdquo; we will use to score model accuracy.
        </p>
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/50">
          <span className="text-sm text-red-400">{uploadError}</span>
        </div>
      )}

      {/* Slot-based card grid */}
      <div className="space-y-3">
        {slots.map((slotIndex) => {
          const image = images[slotIndex] ?? null;
          const isUploading = uploadingSlots.has(slotIndex);

          return (
            <ImageCard
              key={slotIndex}
              slotIndex={slotIndex}
              image={image}
              uploading={isUploading}
              onFileAccepted={(file: File) => handleFileForSlot(slotIndex, file)}
              onJsonChange={(value) => {
                if (image) handleJsonChange(image.id, value);
              }}
              onValidChange={(isValid, parsed) => {
                if (image) handleValidChange(image.id, isValid, parsed);
              }}
              onRemove={() => handleRemove(slotIndex)}
              onError={showError}
            />
          );
        })}
      </div>

      {/* Validation summary */}
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-surface-raised overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allValid ? "bg-emerald-500" : "bg-ember"
              }`}
              style={{
                width:
                  sampleCount > 0
                    ? `${(savedCount / sampleCount) * 100}%`
                    : "0%",
              }}
            />
          </div>
          <span
            className={`text-sm font-medium ${
              allValid ? "text-emerald-400" : "text-text-secondary"
            }`}
          >
            {savedCount}/{sampleCount}
          </span>
        </div>

        {/* Status message */}
        {!allValid && (
          <p className="text-sm text-text-muted">
            {images.length < sampleCount
              ? `Upload ${sampleCount - images.length} more image${sampleCount - images.length === 1 ? "" : "s"} and add valid JSON to continue.`
              : `All images must have valid JSON output before continuing. ${
                  sampleCount - savedCount
                } image${
                  sampleCount - savedCount === 1 ? "" : "s"
                } need${
                  sampleCount - savedCount === 1 ? "s" : ""
                } valid JSON.`}
          </p>
        )}
        {allValid && (
          <p className="text-sm text-emerald-400">
            All images have valid JSON. Ready to continue.
          </p>
        )}
      </div>
    </div>
  );
}
