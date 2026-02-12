import type { Priority, Strategy } from "@/types/wizard";

/** Maximum number of images per benchmark */
export const MAX_IMAGES = 10;

/** Minimum number of images per benchmark */
export const MIN_IMAGES = 1;

/** Maximum file size per image in MB */
export const MAX_FILE_SIZE_MB = 10;

/** Maximum file size per image in bytes */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Accepted image MIME types for upload */
export const ACCEPTED_IMAGE_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

/** Accepted image extensions (flat list) */
export const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_IMAGE_TYPES).flat();

/** Maximum API budget per benchmark run in USD */
export const API_BUDGET_CEILING = 7.0;

/** Price per benchmark report in USD */
export const REPORT_PRICE = 14.99;

/** Default priority ranking (index 0 = highest priority) */
export const DEFAULT_PRIORITIES: Priority[] = [
  "accuracy",
  "speed",
  "cost",
];

/** Default strategy preset */
export const DEFAULT_STRATEGY: Strategy = "balanced";

/** Default number of samples per model */
export const DEFAULT_SAMPLE_COUNT = 3;

/** Minimum samples per model */
export const MIN_SAMPLE_COUNT = 1;

/** Maximum samples per model */
export const MAX_SAMPLE_COUNT = 10;

/** Date when model prices were last verified */
export const PRICES_AS_OF_DATE = "2026-02-11";

/** Application name */
export const APP_NAME = "ModelBlitz";

/** Application description */
export const APP_DESCRIPTION =
  "Find the best vision model for your structured data extraction";

/** Minimum JSON output length to consider valid (bytes) */
export const MIN_JSON_LENGTH = 2;

/** Maximum JSON output length per image (bytes) */
export const MAX_JSON_LENGTH = 100_000;

/** Hard cost ceiling -- abort benchmark if total API cost reaches this (USD) */
export const HARD_COST_CEILING = 15.0;

/** Internal cost buffer reserved for in-flight calls (USD) */
export const INTERNAL_COST_BUFFER = 6.5;

/** Maximum concurrent API calls per model */
export const PER_MODEL_CONCURRENCY = 3;

/** Maximum global concurrent API calls across all models */
export const GLOBAL_CONCURRENCY = 10;
