"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { ImageUploader } from "@/components/wizard/image-uploader";
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
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
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

  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const supabase = createClient();

      // Create placeholder entries with local preview URLs immediately
      const newEntries: ImageEntry[] = files.map((file) => ({
        id: nanoid(),
        path: "",
        publicUrl: URL.createObjectURL(file),
        filename: file.name,
        fileSize: file.size,
        expectedJson: "",
        jsonValid: false,
        parsedJson: null,
      }));

      // Add to state immediately for instant preview
      const updatedImages = [...imagesRef.current, ...newEntries];
      onImagesChange(updatedImages);

      // Track uploading state
      const newUploadingIds = new Set(newEntries.map((e) => e.id));
      setUploadingIds((prev) => new Set([...prev, ...newUploadingIds]));

      // Upload each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const entry = newEntries[i];

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

          // Update the entry with storage path, keep blob URL for in-session preview
          const current = imagesRef.current;
          onImagesChange(
            current.map((img) =>
              img.id === entry.id ? { ...img, path } : img
            )
          );
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Upload failed";
          showError(`Failed to upload ${file.name}: ${message}`);

          // Remove the failed entry using latest ref
          const current = imagesRef.current;
          onImagesChange(current.filter((img) => img.id !== entry.id));
        } finally {
          setUploadingIds((prev) => {
            const next = new Set(prev);
            next.delete(entry.id);
            return next;
          });
        }
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
    async (imageId: string) => {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      // Remove from state immediately
      onImagesChange(images.filter((img) => img.id !== imageId));

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

  const validCount = images.filter((img) => img.jsonValid).length;
  const totalCount = images.length;
  const allValid =
    totalCount >= sampleCount && validCount === totalCount;
  const needsImages = totalCount < sampleCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Upload Sample Images
        </h2>
        <p className="text-sm text-text-secondary">
          Upload images and provide the expected JSON output for each. This is
          the &ldquo;ground truth&rdquo; we will use to score model accuracy.
        </p>
      </div>

      {/* Upload zone */}
      <ImageUploader
        currentCount={totalCount}
        onFilesAccepted={handleFilesAccepted}
        onError={showError}
      />

      {/* Error message */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/50">
          <span className="text-sm text-red-400">{uploadError}</span>
        </div>
      )}

      {/* Image cards */}
      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              uploading={uploadingIds.has(image.id)}
              onJsonChange={(value) => handleJsonChange(image.id, value)}
              onValidChange={(isValid, parsed) =>
                handleValidChange(image.id, isValid, parsed)
              }
              onRemove={() => handleRemove(image.id)}
            />
          ))}
        </div>
      )}

      {/* Validation summary */}
      {totalCount > 0 && (
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
                    totalCount > 0
                      ? `${(validCount / totalCount) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <span
              className={`text-sm font-medium ${
                allValid ? "text-emerald-400" : "text-text-secondary"
              }`}
            >
              {validCount}/{totalCount}
            </span>
          </div>

          {/* Status message */}
          {!allValid && (
            <p className="text-sm text-text-muted">
              {needsImages
                ? `Upload ${sampleCount - totalCount} more image${sampleCount - totalCount === 1 ? "" : "s"} to continue (${sampleCount} required).`
                : `All images must have valid JSON output before continuing. ${
                    totalCount - validCount
                  } image${
                    totalCount - validCount === 1 ? "" : "s"
                  } need${
                    totalCount - validCount === 1 ? "s" : ""
                  } JSON.`}
            </p>
          )}
          {allValid && (
            <p className="text-sm text-emerald-400">
              All images have valid JSON. Ready to continue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
