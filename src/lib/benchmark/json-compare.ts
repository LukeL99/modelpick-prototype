/**
 * JSON canonicalization and comparison utilities for benchmark scoring.
 *
 * Supports two comparison modes:
 * - Strict: exact match after canonicalization (null != missing, "1" != 1)
 * - Relaxed: loose coercion (null == missing, "1" == 1, whitespace collapsed)
 */

/**
 * Recursively canonicalize a JSON value:
 * - Sort object keys alphabetically
 * - Trim whitespace from string values
 * - Normalize number formatting (strip trailing decimal zeros)
 * - Preserve array order
 * - Does NOT do type coercion
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    // Normalize: 8.0 -> 8, but 3.1 stays 3.1
    return Number(value);
  }

  if (typeof value === "string") {
    // Trim leading/trailing whitespace
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

/**
 * Strict comparison: canonicalize both, then deep-equal.
 * Null vs missing key is a mismatch. Type differences are a mismatch.
 */
export function compareStrict(expected: unknown, actual: unknown): boolean {
  const a = canonicalize(expected);
  const b = canonicalize(actual);
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Normalize a value for relaxed comparison:
 * - Coerce numeric strings to numbers
 * - Collapse multiple whitespace to single space
 * - Trim leading/trailing whitespace
 * - Preserve case
 */
function relaxNormalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === "boolean") return value;

  if (typeof value === "number") return Number(value);

  if (typeof value === "string") {
    const trimmed = value.trim().replace(/\s+/g, " ");
    // Try to coerce to number
    const num = Number(trimmed);
    if (trimmed !== "" && !isNaN(num)) {
      return num;
    }
    return trimmed;
  }

  if (Array.isArray(value)) {
    return value.map(relaxNormalize);
  }

  if (typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = relaxNormalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return value;
}

/**
 * Unify null and missing keys: add null for any key in one but not the other.
 */
function unifyNullMissing(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): { a: Record<string, unknown>; b: Record<string, unknown> } {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const unifiedA: Record<string, unknown> = {};
  const unifiedB: Record<string, unknown> = {};
  for (const key of allKeys) {
    unifiedA[key] = key in a ? a[key] : null;
    unifiedB[key] = key in b ? b[key] : null;
  }
  return { a: unifiedA, b: unifiedB };
}

/**
 * Relaxed comparison:
 * - Coerce numeric strings to numbers ("1" == 1, "8.00" == 8)
 * - Collapse whitespace in strings
 * - Treat null and missing key as equivalent
 * - Preserve case sensitivity ("New York" != "new york")
 */
export function compareRelaxed(expected: unknown, actual: unknown): boolean {
  let e = expected;
  let a = actual;

  // Unify null/missing at top level if both are objects
  if (
    e !== null &&
    a !== null &&
    typeof e === "object" &&
    typeof a === "object" &&
    !Array.isArray(e) &&
    !Array.isArray(a)
  ) {
    const unified = unifyNullMissing(
      e as Record<string, unknown>,
      a as Record<string, unknown>
    );
    e = unified.a;
    a = unified.b;
  }

  const normE = relaxNormalize(e);
  const normA = relaxNormalize(a);
  return JSON.stringify(normE) === JSON.stringify(normA);
}

/**
 * Flatten a nested object to dot-notation paths.
 * Arrays use bracket notation: items[0].price
 */
function flattenObject(
  obj: unknown,
  prefix: string = ""
): Map<string, unknown> {
  const result = new Map<string, unknown>();

  if (obj === null || obj === undefined || typeof obj !== "object") {
    result.set(prefix, obj);
    return result;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const key = prefix ? `${prefix}[${i}]` : `[${i}]`;
      const nested = flattenObject(obj[i], key);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    }
    return result;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = record[key];

    if (
      value !== null &&
      value !== undefined &&
      typeof value === "object"
    ) {
      const nested = flattenObject(value, fullKey);
      for (const [k, v] of nested) {
        result.set(k, v);
      }
    } else {
      result.set(fullKey, value);
    }
  }

  return result;
}

/**
 * Compare two individual field values using the specified mode.
 */
function fieldsMatch(
  expected: unknown,
  actual: unknown,
  mode: "strict" | "relaxed"
): boolean {
  if (mode === "relaxed") {
    return compareRelaxedValue(expected, actual);
  }
  // Strict: canonicalize and compare
  return JSON.stringify(canonicalize(expected)) === JSON.stringify(canonicalize(actual));
}

/**
 * Relaxed comparison for individual values (not objects).
 */
function compareRelaxedValue(expected: unknown, actual: unknown): boolean {
  const normE = relaxNormalize(expected);
  const normA = relaxNormalize(actual);
  // Treat null and undefined as equivalent
  if (normE === null && normA === null) return true;
  if (normE === null || normA === null) return false;
  return JSON.stringify(normE) === JSON.stringify(normA);
}

/**
 * Calculate field-level accuracy between two objects.
 * Flattens both to dot-notation paths, compares each field.
 */
export function calculateFieldAccuracy(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  mode: "strict" | "relaxed"
): { accuracy: number; totalFields: number; correctFields: number } {
  const expectedFlat = flattenObject(expected);
  const actualFlat = flattenObject(actual);

  // All unique field paths from both objects
  const allPaths = new Set([...expectedFlat.keys(), ...actualFlat.keys()]);
  const totalFields = allPaths.size;

  let correctFields = 0;
  for (const path of allPaths) {
    const expVal = expectedFlat.has(path) ? expectedFlat.get(path) : undefined;
    const actVal = actualFlat.has(path) ? actualFlat.get(path) : undefined;

    if (fieldsMatch(expVal, actVal, mode)) {
      correctFields++;
    }
  }

  const accuracy = totalFields > 0 ? Math.round((correctFields / totalFields) * 100) : 100;

  return { accuracy, totalFields, correctFields };
}

/**
 * Return a list of field-level mismatches between two objects.
 */
export function diffFields(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  mode: "strict" | "relaxed"
): Array<{ fieldPath: string; expected: string; actual: string }> {
  const expectedFlat = flattenObject(expected);
  const actualFlat = flattenObject(actual);

  const allPaths = new Set([...expectedFlat.keys(), ...actualFlat.keys()]);
  const diffs: Array<{ fieldPath: string; expected: string; actual: string }> = [];

  // Sort paths for deterministic output
  const sortedPaths = [...allPaths].sort();

  for (const path of sortedPaths) {
    const expVal = expectedFlat.has(path) ? expectedFlat.get(path) : undefined;
    const actVal = actualFlat.has(path) ? actualFlat.get(path) : undefined;

    if (!fieldsMatch(expVal, actVal, mode)) {
      diffs.push({
        fieldPath: path,
        expected: formatValue(expVal),
        actual: formatValue(actVal),
      });
    }
  }

  return diffs;
}

/**
 * Format a value for display in diff output.
 */
function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}
