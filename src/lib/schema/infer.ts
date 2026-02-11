/**
 * JSON Schema inference from example JSON objects.
 * Uses @jsonhero/schema-infer to merge multiple examples into a unified JSON Schema.
 */
import { inferSchema } from "@jsonhero/schema-infer";

/**
 * Infer a JSON Schema from one or more example JSON objects.
 *
 * @param examples - Array of parsed JSON objects
 * @returns A JSON Schema object describing the structure
 */
export function inferSchemaFromExamples(
  examples: unknown[]
): Record<string, unknown> {
  if (examples.length === 0) {
    // Empty array: return a permissive object schema
    return {
      type: "object",
      properties: {},
    };
  }

  // Infer from the first example
  let inference = inferSchema(examples[0]);

  // Merge subsequent examples into the inference
  for (let i = 1; i < examples.length; i++) {
    inference = inferSchema(examples[i], inference);
  }

  // Convert to standard JSON Schema
  const jsonSchema = inference.toJSONSchema() as Record<string, unknown>;

  // If top-level is not an object (e.g., an array or primitive), wrap in description
  if (jsonSchema.type !== "object" && !jsonSchema.properties) {
    return {
      type: "object",
      description: `Top-level value is ${jsonSchema.type ?? "unknown"}`,
      properties: {
        value: jsonSchema,
      },
    };
  }

  return jsonSchema;
}
