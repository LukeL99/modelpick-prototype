"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "@/lib/config/constants";

interface SlotDropzoneProps {
  slotLabel: string;
  onFileAccepted: (file: File) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function SlotDropzone({
  slotLabel,
  onFileAccepted,
  onError,
  disabled = false,
}: SlotDropzoneProps) {
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
              return `${rejection.file.name}: ${e.message}`;
            })
            .join("; ");
          return errorMessages;
        });
        onError(errors.join(" | "));
      }

      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: 1,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-ember bg-ember/5"
          : disabled
            ? "border-surface-border bg-surface opacity-50 cursor-not-allowed"
            : "border-surface-border hover:border-text-muted bg-surface"
      }`}
    >
      <input {...getInputProps()} />
      <Upload
        className={`w-6 h-6 mx-auto mb-2 ${
          isDragActive ? "text-ember" : "text-text-muted"
        }`}
      />
      <p className="text-sm text-text-primary font-medium">
        {isDragActive ? "Drop image here..." : slotLabel}
      </p>
      <p className="text-xs text-text-muted mt-1">
        Drag &amp; drop or click to upload
      </p>
      <p className="text-xs text-text-muted mt-0.5">
        JPEG, PNG, WebP up to {MAX_FILE_SIZE_MB}MB
      </p>
    </div>
  );
}
