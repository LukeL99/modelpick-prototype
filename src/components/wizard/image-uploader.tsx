"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, AlertCircle } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_IMAGES,
} from "@/lib/config/constants";

interface ImageUploaderProps {
  currentCount: number;
  onFilesAccepted: (files: File[]) => void;
  onError: (message: string) => void;
}

export function ImageUploader({
  currentCount,
  onFilesAccepted,
  onError,
}: ImageUploaderProps) {
  const remainingSlots = MAX_IMAGES - currentCount;
  const isFull = remainingSlots <= 0;

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const errors = fileRejections.map((rejection) => {
          const errorMessages = rejection.errors
            .map((e) => {
              if (e.code === "file-too-large")
                return `${rejection.file.name}: exceeds ${MAX_FILE_SIZE_MB}MB limit`;
              if (e.code === "file-invalid-type")
                return `${rejection.file.name}: invalid file type`;
              if (e.code === "too-many-files")
                return `Too many files. ${remainingSlots} slot(s) remaining.`;
              return `${rejection.file.name}: ${e.message}`;
            })
            .join("; ");
          return errorMessages;
        });
        onError(errors.join(" | "));
      }

      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted, onError, remainingSlots]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: remainingSlots,
    disabled: isFull,
    multiple: true,
  });

  if (isFull) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl border border-surface-border bg-surface text-text-muted">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">
          Maximum {MAX_IMAGES} images reached. Remove an image to upload more.
        </span>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-ember bg-ember/5"
          : "border-surface-border hover:border-text-muted bg-surface"
      }`}
    >
      <input {...getInputProps()} />
      <Upload
        className={`w-8 h-8 mx-auto mb-3 ${
          isDragActive ? "text-ember" : "text-text-muted"
        }`}
      />
      <p className="text-sm text-text-primary font-medium">
        {isDragActive
          ? "Drop images here..."
          : "Drag & drop images here or click to browse"}
      </p>
      <p className="text-xs text-text-muted mt-1">
        JPEG, PNG, WebP up to {MAX_FILE_SIZE_MB}MB each &middot;{" "}
        {remainingSlots} of {MAX_IMAGES} slots available
      </p>
    </div>
  );
}
