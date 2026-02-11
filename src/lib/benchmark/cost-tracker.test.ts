import { describe, it, expect } from "vitest";
import { CostTracker } from "./cost-tracker";

describe("CostTracker", () => {
  it("initializes with zero spent and given ceiling", () => {
    const tracker = new CostTracker(10);
    expect(tracker.getSpent()).toBe(0);
    expect(tracker.getRemaining()).toBe(10);
  });

  it("reserve(amount) reduces available budget and returns a reservation token", () => {
    const tracker = new CostTracker(10);
    const token = tracker.reserve(3);
    expect(typeof token).toBe("string");
    expect(tracker.getReserved()).toBe(3);
    expect(tracker.getRemaining()).toBe(7);
  });

  it("record(token, actualCost) adjusts the reservation to actual cost", () => {
    const tracker = new CostTracker(10);
    const token = tracker.reserve(5);
    tracker.record(token, 3);
    // Reserved should be 0 (reservation fulfilled), spent should be 3
    expect(tracker.getReserved()).toBe(0);
    expect(tracker.getSpent()).toBe(3);
    expect(tracker.getRemaining()).toBe(7);
  });

  it("release(token) releases an unused reservation", () => {
    const tracker = new CostTracker(10);
    const token = tracker.reserve(5);
    tracker.release(token);
    expect(tracker.getReserved()).toBe(0);
    expect(tracker.getRemaining()).toBe(10);
    expect(tracker.getSpent()).toBe(0);
  });

  it("canAfford(estimatedCost) returns false when remaining budget < estimatedCost", () => {
    const tracker = new CostTracker(5);
    tracker.reserve(4);
    expect(tracker.canAfford(2)).toBe(false);
    expect(tracker.canAfford(1)).toBe(true);
  });

  it("shouldAbort() returns true when spent >= ceiling", () => {
    const tracker = new CostTracker(5);
    const token = tracker.reserve(5);
    tracker.record(token, 5);
    expect(tracker.shouldAbort()).toBe(true);
  });

  it("throws when reservation would exceed ceiling", () => {
    const tracker = new CostTracker(5);
    tracker.reserve(4);
    expect(() => tracker.reserve(2)).toThrow();
  });

  it("concurrent reservations are tracked independently", () => {
    const tracker = new CostTracker(10);
    const token1 = tracker.reserve(3);
    const token2 = tracker.reserve(4);
    expect(tracker.getReserved()).toBe(7);
    expect(tracker.getRemaining()).toBe(3);

    tracker.record(token1, 2);
    expect(tracker.getReserved()).toBe(4);
    expect(tracker.getSpent()).toBe(2);
    expect(tracker.getRemaining()).toBe(4);

    tracker.record(token2, 3);
    expect(tracker.getReserved()).toBe(0);
    expect(tracker.getSpent()).toBe(5);
    expect(tracker.getRemaining()).toBe(5);
  });

  it("getRemaining() returns ceiling minus (spent + reserved)", () => {
    const tracker = new CostTracker(10);
    const token = tracker.reserve(3);
    tracker.record(token, 2);
    tracker.reserve(1);
    // spent=2, reserved=1, remaining = 10 - 2 - 1 = 7
    expect(tracker.getRemaining()).toBe(7);
  });

  it("getSummary() returns complete state", () => {
    const tracker = new CostTracker(10);
    const token = tracker.reserve(3);
    tracker.record(token, 2);
    const summary = tracker.getSummary();
    expect(summary).toEqual({
      spent: 2,
      reserved: 0,
      remaining: 8,
      ceiling: 10,
    });
  });

  it("uses soft ceiling for canAfford and hard ceiling for shouldAbort", () => {
    const tracker = new CostTracker(6.5, 15);
    // Can reserve up to soft ceiling
    const t1 = tracker.reserve(6);
    tracker.record(t1, 6);
    // Can't afford more (past soft ceiling)
    expect(tracker.canAfford(1)).toBe(false);
    // But hasn't hit hard ceiling so shouldn't abort yet
    expect(tracker.shouldAbort()).toBe(false);
  });
});
