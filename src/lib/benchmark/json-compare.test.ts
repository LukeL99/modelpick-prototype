import { describe, it, expect } from "vitest";
import {
  canonicalize,
  compareStrict,
  compareRelaxed,
  calculateFieldAccuracy,
  diffFields,
} from "./json-compare";

describe("canonicalize", () => {
  it("sorts object keys recursively", () => {
    const input = { b: 1, a: 2 };
    const result = canonicalize(input);
    expect(JSON.stringify(result)).toBe(JSON.stringify({ a: 2, b: 1 }));
  });

  it("sorts nested objects", () => {
    const input = { b: { d: 1, c: 2 }, a: 3 };
    const result = canonicalize(input);
    expect(JSON.stringify(result)).toBe(
      JSON.stringify({ a: 3, b: { c: 2, d: 1 } })
    );
  });

  it("preserves string types (does not coerce)", () => {
    expect(canonicalize("8.00")).toBe("8.00");
  });

  it("normalizes number formatting (strips trailing decimal zeros)", () => {
    expect(canonicalize(8.0)).toBe(8);
    expect(canonicalize(3.1)).toBe(3.1);
  });

  it("handles arrays (preserves order, recursively canonicalizes elements)", () => {
    const input = [{ b: 1, a: 2 }, 3, "hello"];
    const result = canonicalize(input);
    expect(result).toEqual([{ a: 2, b: 1 }, 3, "hello"]);
  });

  it("handles null, boolean, empty objects, empty arrays", () => {
    expect(canonicalize(null)).toBe(null);
    expect(canonicalize(true)).toBe(true);
    expect(canonicalize(false)).toBe(false);
    expect(canonicalize({})).toEqual({});
    expect(canonicalize([])).toEqual([]);
  });

  it("trims whitespace from string values", () => {
    expect(canonicalize("  hello  ")).toBe("hello");
  });

  it("produces identical output for semantically identical inputs with different key order", () => {
    const a = { name: "Alice", age: 30 };
    const b = { age: 30, name: "Alice" };
    expect(JSON.stringify(canonicalize(a))).toBe(
      JSON.stringify(canonicalize(b))
    );
  });
});

describe("compareStrict", () => {
  it("returns true for identical canonical JSON", () => {
    expect(compareStrict({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("returns false when a field value differs (number mismatch)", () => {
    expect(compareStrict({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false when null vs missing key", () => {
    expect(compareStrict({ a: null }, {})).toBe(false);
  });

  it("returns false when types differ: string '1' vs number 1", () => {
    expect(compareStrict({ a: "1" }, { a: 1 })).toBe(false);
  });

  it("returns true after canonicalization normalizes whitespace", () => {
    expect(compareStrict({ a: "  hello  " }, { a: "hello" })).toBe(true);
  });

  it("returns true for { a: 1 } vs { a: 1 }", () => {
    expect(compareStrict({ a: 1 }, { a: 1 })).toBe(true);
  });
});

describe("compareRelaxed", () => {
  it("returns true for string '1' vs number 1 (loose coercion)", () => {
    expect(compareRelaxed({ a: "1" }, { a: 1 })).toBe(true);
  });

  it("returns true for number 1 vs number 1.0 (same value)", () => {
    expect(compareRelaxed({ a: 1 }, { a: 1.0 })).toBe(true);
  });

  it('returns true for "8.00" (string) vs 8 (number) (semantic equivalence)', () => {
    expect(compareRelaxed({ a: "8.00" }, { a: 8 })).toBe(true);
  });

  it("returns true for null value vs missing key", () => {
    expect(compareRelaxed({ a: null }, {})).toBe(true);
  });

  it('returns true for "New  York" vs "New York" (whitespace collapsed)', () => {
    expect(compareRelaxed({ a: "New  York" }, { a: "New York" })).toBe(true);
  });

  it('returns false for "New York" vs "new york" (case preserved)', () => {
    expect(compareRelaxed({ a: "New York" }, { a: "new york" })).toBe(false);
  });

  it('returns true for "  hello  " vs "hello" (leading/trailing whitespace normalized)', () => {
    expect(compareRelaxed({ a: "  hello  " }, { a: "hello" })).toBe(true);
  });
});

describe("calculateFieldAccuracy", () => {
  it("returns 100 for identical objects", () => {
    const result = calculateFieldAccuracy(
      { a: 1, b: 2 },
      { a: 1, b: 2 },
      "strict"
    );
    expect(result.accuracy).toBe(100);
    expect(result.totalFields).toBe(2);
    expect(result.correctFields).toBe(2);
  });

  it("returns 50 when 1 of 2 fields match", () => {
    const result = calculateFieldAccuracy(
      { a: 1, b: 2 },
      { a: 1, b: 99 },
      "strict"
    );
    expect(result.accuracy).toBe(50);
    expect(result.totalFields).toBe(2);
    expect(result.correctFields).toBe(1);
  });

  it("returns 0 when no fields match", () => {
    const result = calculateFieldAccuracy(
      { a: 1, b: 2 },
      { a: 99, b: 88 },
      "strict"
    );
    expect(result.accuracy).toBe(0);
  });

  it("handles nested fields (flatten with dot notation paths)", () => {
    const expected = { name: "Alice", address: { city: "NYC", zip: "10001" } };
    const actual = { name: "Alice", address: { city: "NYC", zip: "99999" } };
    const result = calculateFieldAccuracy(expected, actual, "strict");
    // 3 leaf fields: name, address.city, address.zip -- 2 match
    expect(result.totalFields).toBe(3);
    expect(result.correctFields).toBe(2);
  });

  it("returns field-level diff with expected vs actual for each mismatch", () => {
    const result = calculateFieldAccuracy(
      { a: 1, b: 2 },
      { a: 1, b: 99 },
      "strict"
    );
    expect(result.accuracy).toBe(50);
  });
});

describe("diffFields", () => {
  it("returns empty array for identical objects", () => {
    const result = diffFields({ a: 1, b: 2 }, { a: 1, b: 2 }, "strict");
    expect(result).toEqual([]);
  });

  it("returns array of { fieldPath, expected, actual } for each mismatching field", () => {
    const result = diffFields({ a: 1, b: 2 }, { a: 1, b: 99 }, "strict");
    expect(result).toEqual([
      { fieldPath: "b", expected: "2", actual: "99" },
    ]);
  });

  it('handles nested paths: "address.city" format', () => {
    const result = diffFields(
      { address: { city: "NYC" } },
      { address: { city: "LA" } },
      "strict"
    );
    expect(result).toEqual([
      { fieldPath: "address.city", expected: '"NYC"', actual: '"LA"' },
    ]);
  });

  it("handles array paths: items[0].price format", () => {
    const result = diffFields(
      { items: [{ price: 10 }] },
      { items: [{ price: 20 }] },
      "strict"
    );
    expect(result).toEqual([
      { fieldPath: "items[0].price", expected: "10", actual: "20" },
    ]);
  });

  it("handles extra fields in actual (not in expected)", () => {
    const result = diffFields({ a: 1 }, { a: 1, b: 2 }, "strict");
    expect(result).toEqual([
      { fieldPath: "b", expected: "undefined", actual: "2" },
    ]);
  });

  it("handles missing fields in actual (in expected but not actual)", () => {
    const result = diffFields({ a: 1, b: 2 }, { a: 1 }, "strict");
    expect(result).toEqual([
      { fieldPath: "b", expected: "2", actual: "undefined" },
    ]);
  });
});
