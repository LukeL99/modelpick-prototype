import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withBackoff } from "./backoff";

describe("withBackoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the function once on success (no retry)", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const promise = withBackoff(fn);
    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 status up to maxRetries", async () => {
    const error429 = Object.assign(new Error("Rate limited"), {
      status: 429,
      headers: new Map(),
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValue("ok");

    const promise = withBackoff(fn, { maxRetries: 5, baseDelayMs: 100 });

    // Advance generously to cover base delay + jitter for each retry
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(2000);
    }

    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects Retry-After header (in seconds)", async () => {
    const headers = new Map([["retry-after", "2"]]);
    const error429 = Object.assign(new Error("Rate limited"), {
      status: 429,
      headers,
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValue("ok");

    const promise = withBackoff(fn, { maxRetries: 3, baseDelayMs: 100 });

    // Should wait 2 seconds as specified by Retry-After
    await vi.advanceTimersByTimeAsync(2100);

    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff when no Retry-After header", async () => {
    const error429 = Object.assign(new Error("Rate limited"), {
      status: 429,
      headers: new Map(),
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValue("ok");

    const promise = withBackoff(fn, { maxRetries: 5, baseDelayMs: 1000 });

    // First retry: base * 2^0 = 1000ms + jitter (up to 1000ms)
    await vi.advanceTimersByTimeAsync(2100);
    // Second retry: base * 2^1 = 2000ms + jitter (up to 1000ms)
    await vi.advanceTimersByTimeAsync(3100);

    const result = await promise;
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after maxRetries exhausted", async () => {
    const fn = vi.fn().mockImplementation(() => {
      const error = Object.assign(new Error("Rate limited"), {
        status: 429,
        headers: new Map(),
      });
      return Promise.reject(error);
    });

    const promise = withBackoff(fn, { maxRetries: 2, baseDelayMs: 100 });

    // Catch early to prevent unhandled rejection warning
    const caught = promise.catch((e: Error) => e);

    // Advance past all retries
    await vi.advanceTimersByTimeAsync(10000);

    const result = await caught;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("Rate limited");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("does NOT retry on non-429 errors (e.g., 500, 400)", async () => {
    const error500 = Object.assign(new Error("Server error"), { status: 500 });
    const fn = vi.fn().mockRejectedValue(error500);

    await expect(withBackoff(fn)).rejects.toThrow("Server error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("backoff delay is capped at maxDelayMs", async () => {
    const error429 = Object.assign(new Error("Rate limited"), {
      status: 429,
      headers: new Map(),
    });
    // After many retries, delay should not exceed maxDelayMs
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return Promise.reject(error429);
      return Promise.resolve("ok");
    });

    const promise = withBackoff(fn, {
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
    });

    // Advance through all retries generously
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(6000);
    }

    const result = await promise;
    expect(result).toBe("ok");
  });
});
