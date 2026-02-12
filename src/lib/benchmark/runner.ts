/**
 * Single model benchmark runner that calls OpenRouter and captures metrics.
 *
 * Supports two modes:
 * - Mock mode: returns realistic varied data for development/testing
 * - Real mode: calls OpenRouter chat completions API with vision content
 */

import { withBackoff } from "./backoff";
import { CostTracker } from "./cost-tracker";
import { getModelById } from "@/lib/config/models";

/**
 * Result of a single model benchmark run.
 */
export interface RunResult {
  /** Parsed JSON output from the model */
  outputJson: unknown;
  /** Whether the model output was valid JSON */
  isValidJson: boolean;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Number of input/prompt tokens used */
  inputTokens: number;
  /** Number of output/completion tokens used */
  outputTokens: number;
  /** Actual cost in USD for this API call */
  actualCost: number;
  /** Error message if the call failed */
  error?: string;
}

/**
 * Parameters for running a model benchmark.
 */
export interface RunParams {
  /** OpenRouter model ID */
  modelId: string;
  /** URL of the image to analyze */
  imageUrl: string;
  /** Prompt instructing the model to extract structured data */
  extractionPrompt: string;
  /** JSON schema describing the expected output */
  jsonSchema: Record<string, unknown>;
  /** Cost tracker for budget enforcement */
  costTracker: CostTracker;
}

/**
 * Check if mock mode is enabled for OpenRouter calls.
 * Uses NEXT_PUBLIC_MOCK_OPENROUTER env var.
 */
export function isMockOpenRouter(): boolean {
  return (
    process.env.NEXT_PUBLIC_MOCK_OPENROUTER === "true" ||
    process.env.NEXT_PUBLIC_MOCK_OPENROUTER === "1"
  );
}

/**
 * Generate a deterministic seed from a string (for consistent mock data per model).
 */
function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Simple seeded pseudo-random number generator.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Generate realistic mock data for a model benchmark run.
 */
async function runMockBenchmark(params: RunParams): Promise<RunResult> {
  const seed = hashSeed(params.modelId + params.imageUrl);
  const rand = seededRandom(seed);

  // Add realistic network delay (500-2000ms)
  const delay = 500 + rand() * 1500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // ~10% chance of error
  if (rand() < 0.1) {
    return {
      outputJson: null,
      isValidJson: false,
      responseTimeMs: delay,
      inputTokens: 0,
      outputTokens: 0,
      actualCost: 0,
      error: "Mock API error: model temporarily unavailable",
    };
  }

  // Simulate response time variation (200-5000ms)
  const responseTimeMs = 200 + rand() * 4800;

  // Simulate token counts
  const inputTokens = 800 + Math.floor(rand() * 1200);
  const outputTokens = 100 + Math.floor(rand() * 800);

  // Look up model pricing for realistic cost
  const model = getModelById(params.modelId);
  const inputCost = model
    ? (inputTokens / 1_000_000) * model.inputCostPer1M
    : 0.001;
  const outputCost = model
    ? (outputTokens / 1_000_000) * model.outputCostPer1M
    : 0.002;
  const actualCost = inputCost + outputCost;

  // Generate mock JSON output (partially accurate based on model "quality")
  // Higher-tier models produce better results in mock mode
  const tierQuality: Record<string, number> = {
    free: 0.5,
    budget: 0.65,
    mid: 0.8,
    premium: 0.9,
    ultra: 0.95,
  };
  const quality = model ? tierQuality[model.tier] ?? 0.7 : 0.7;

  // ~5% chance of invalid JSON output
  const producesInvalidJson = rand() < 0.05;

  let outputJson: unknown = null;
  let isValidJson = true;

  if (producesInvalidJson) {
    isValidJson = false;
    outputJson = null;
  } else {
    // Generate a mock output that roughly matches the schema shape
    outputJson = generateMockOutput(params.jsonSchema, rand, quality);
  }

  return {
    outputJson,
    isValidJson,
    responseTimeMs,
    inputTokens,
    outputTokens,
    actualCost,
  };
}

/**
 * Generate a mock output roughly matching a JSON schema shape.
 */
function generateMockOutput(
  schema: Record<string, unknown>,
  rand: () => number,
  _quality: number
): unknown {
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties) {
    return { result: "mock_data", confidence: rand() };
  }

  const output: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    const type = prop.type as string | undefined;
    switch (type) {
      case "string":
        output[key] = `mock_${key}_value`;
        break;
      case "number":
      case "integer":
        output[key] = Math.round(rand() * 1000) / 10;
        break;
      case "boolean":
        output[key] = rand() > 0.5;
        break;
      case "array":
        output[key] = [];
        break;
      case "object":
        output[key] = {};
        break;
      default:
        output[key] = null;
    }
  }
  return output;
}

/**
 * Calculate cost from token counts and model pricing.
 */
function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  return inputCost + outputCost;
}

/**
 * Run a benchmark against a single model using the OpenRouter API.
 *
 * In mock mode, returns realistic varied data without making API calls.
 * In real mode, calls OpenRouter with the image and extraction prompt.
 */
export async function runModelBenchmark(params: RunParams): Promise<RunResult> {
  // Mock mode for development/testing
  if (isMockOpenRouter()) {
    return runMockBenchmark(params);
  }

  // Real mode: call OpenRouter API
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      outputJson: null,
      isValidJson: false,
      responseTimeMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      actualCost: 0,
      error: "OPENROUTER_API_KEY not set",
    };
  }

  // Estimate cost for reservation
  const model = getModelById(params.modelId);
  const estimatedInputTokens = 1500;
  const estimatedOutputTokens = 500;
  const estimatedCost = model
    ? (estimatedInputTokens / 1_000_000) * model.inputCostPer1M +
      (estimatedOutputTokens / 1_000_000) * model.outputCostPer1M
    : 0.01;

  // Reserve budget
  let reservationId: string;
  try {
    reservationId = params.costTracker.reserve(estimatedCost);
  } catch {
    return {
      outputJson: null,
      isValidJson: false,
      responseTimeMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      actualCost: 0,
      error: "Budget exceeded - cannot afford API call",
    };
  }

  const startTime = performance.now();

  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://modelblitz.com";

    // Build request body
    const body = {
      model: params.modelId,
      messages: [
        {
          role: "system" as const,
          content: `You are a structured data extraction assistant. Extract data from the provided image according to the user's instructions. Always respond with valid JSON matching the specified schema. Do not include any text outside the JSON object.`,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "image_url" as const,
              image_url: { url: params.imageUrl },
            },
            {
              type: "text" as const,
              text: `${params.extractionPrompt}\n\nRespond with a JSON object matching this schema:\n${JSON.stringify(params.jsonSchema, null, 2)}`,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    // Call OpenRouter with backoff for rate limits
    const response = await withBackoff(
      async () => {
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": siteUrl,
              "X-Title": "ModelBlitz",
            },
            body: JSON.stringify(body),
          }
        );

        if (res.status === 429) {
          const error = Object.assign(new Error("Rate limited"), {
            status: 429,
            headers: res.headers,
          });
          throw error;
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `OpenRouter API error ${res.status}: ${errorText}`
          );
        }

        return res.json();
      },
      { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000 }
    );

    const endTime = performance.now();
    const responseTimeMs = endTime - startTime;

    // Extract response data
    const content = response?.choices?.[0]?.message?.content ?? "";
    const inputTokens = response?.usage?.prompt_tokens ?? 0;
    const outputTokens = response?.usage?.completion_tokens ?? 0;

    // Calculate actual cost
    const actualCost = calculateCost(
      params.modelId,
      inputTokens,
      outputTokens
    );

    // Record actual cost (replace reservation)
    params.costTracker.record(reservationId, actualCost);

    // Try to parse JSON output
    let outputJson: unknown = null;
    let isValidJson = false;

    try {
      outputJson = JSON.parse(content);
      isValidJson = true;
    } catch {
      outputJson = content;
      isValidJson = false;
    }

    return {
      outputJson,
      isValidJson,
      responseTimeMs,
      inputTokens,
      outputTokens,
      actualCost,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTimeMs = endTime - startTime;

    // Release reservation on failure
    try {
      params.costTracker.release(reservationId);
    } catch {
      // Reservation may already have been recorded
    }

    return {
      outputJson: null,
      isValidJson: false,
      responseTimeMs,
      inputTokens: 0,
      outputTokens: 0,
      actualCost: 0,
      error:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
