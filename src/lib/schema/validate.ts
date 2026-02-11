/**
 * Schema compatibility checking across multiple image examples.
 * Detects field mismatches, type inconsistencies, and warns the user.
 */

export interface CompatibilityResult {
  /** Whether all examples are compatible (no warnings) */
  compatible: boolean;
  /** List of human-readable warning messages */
  warnings: string[];
}

export interface ExampleEntry {
  /** 0-based index of the image */
  imageIndex: number;
  /** Parsed JSON output for that image */
  json: unknown;
}

/**
 * Check if multiple JSON examples have compatible schemas.
 * Warns about missing fields and type mismatches across images.
 *
 * @param examples - Array of image index + parsed JSON pairs
 * @returns Compatibility result with warnings
 */
export function checkSchemaCompatibility(
  examples: ExampleEntry[]
): CompatibilityResult {
  const warnings: string[] = [];

  // Need at least 2 examples to compare
  if (examples.length < 2) {
    return { compatible: true, warnings: [] };
  }

  // Only check top-level keys for objects
  const objectExamples = examples.filter(
    (ex) => ex.json !== null && typeof ex.json === "object" && !Array.isArray(ex.json)
  );

  if (objectExamples.length < 2) {
    // If not enough object examples, check if types differ at top level
    const topTypes = new Set(
      examples.map((ex) => {
        if (ex.json === null) return "null";
        if (Array.isArray(ex.json)) return "array";
        return typeof ex.json;
      })
    );
    if (topTypes.size > 1) {
      warnings.push(
        `Top-level JSON types differ across images: ${[...topTypes].join(", ")}. All images should use the same structure.`
      );
    }
    return { compatible: warnings.length === 0, warnings };
  }

  // Extract top-level key sets from each object example
  const keySets = objectExamples.map((ex) => ({
    index: ex.imageIndex,
    keys: new Set(Object.keys(ex.json as Record<string, unknown>)),
  }));

  // Collect all unique keys
  const allKeys = new Set(keySets.flatMap((ks) => [...ks.keys]));

  // Check for key mismatches: field present in some but not all
  for (const key of allKeys) {
    const missing = keySets.filter((ks) => !ks.keys.has(key));
    if (missing.length > 0 && missing.length < keySets.length) {
      const missingImageNumbers = missing.map((m) => m.index + 1).join(", ");
      warnings.push(
        `Field "${key}" is missing from image(s) ${missingImageNumbers}. A single report uses one schema across all images.`
      );
    }
  }

  // Check for type mismatches on shared keys
  for (const key of allKeys) {
    const typesForKey = new Set(
      objectExamples
        .filter((ex) => key in (ex.json as Record<string, unknown>))
        .map((ex) => {
          const val = (ex.json as Record<string, unknown>)[key];
          if (val === null) return "null";
          if (Array.isArray(val)) return "array";
          return typeof val;
        })
    );
    if (typesForKey.size > 1) {
      warnings.push(
        `Field "${key}" has inconsistent types across images: ${[...typesForKey].join(", ")}. This may cause inaccurate benchmarking.`
      );
    }
  }

  return { compatible: warnings.length === 0, warnings };
}

/**
 * Scan a JSON Schema for union types (anyOf) that indicate inconsistent examples.
 * Returns warnings for fields with multiple possible types.
 */
export function checkSchemaForUnionTypes(
  schema: Record<string, unknown>
): string[] {
  const warnings: string[] = [];

  function scanProperties(
    properties: Record<string, unknown>,
    path: string = ""
  ): void {
    for (const [key, value] of Object.entries(properties)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const prop = value as Record<string, unknown>;

      // Check for anyOf (union type)
      if (prop.anyOf && Array.isArray(prop.anyOf)) {
        const types = (prop.anyOf as Record<string, unknown>[])
          .map((s) => s.type as string)
          .filter(Boolean);
        if (types.length > 1) {
          warnings.push(
            `Field "${fieldPath}" has different types across your images (${types.join(", ")}). Pick one format.`
          );
        }
      }

      // Check for type arrays (another form of union)
      if (Array.isArray(prop.type)) {
        const types = (prop.type as string[]).filter((t) => t !== "null");
        if (types.length > 1) {
          warnings.push(
            `Field "${fieldPath}" has different types across your images (${types.join(", ")}). Pick one format.`
          );
        }
      }

      // Recurse into nested object properties
      if (
        prop.type === "object" &&
        prop.properties &&
        typeof prop.properties === "object"
      ) {
        scanProperties(prop.properties as Record<string, unknown>, fieldPath);
      }
    }
  }

  if (schema.properties && typeof schema.properties === "object") {
    scanProperties(schema.properties as Record<string, unknown>);
  }

  return warnings;
}
