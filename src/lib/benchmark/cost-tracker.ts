/**
 * Real-time cost accumulation with reservation pattern and hard ceiling enforcement.
 *
 * Uses a reservation pattern to prevent overspending with concurrent API calls:
 * 1. Before API call: reserve(estimatedCost) locks budget
 * 2. After API call: record(token, actualCost) adjusts to real cost
 * 3. On failure: release(token) frees the reserved budget
 *
 * Two ceilings:
 * - Soft ceiling: used for canAfford() checks (default $6.50)
 * - Hard ceiling: used for shouldAbort() (default $15)
 */

import { nanoid } from "nanoid";

interface Reservation {
  amount: number;
}

export class CostTracker {
  private spent: number = 0;
  private reservations: Map<string, Reservation> = new Map();
  private readonly softCeiling: number;
  private readonly hardCeiling: number;

  /**
   * @param softCeiling Budget ceiling for canAfford() checks (default 6.50)
   * @param hardCeiling Hard abort ceiling for shouldAbort() (default 15)
   */
  constructor(softCeiling: number = 6.5, hardCeiling?: number) {
    this.softCeiling = softCeiling;
    // If only soft ceiling provided, use it as hard ceiling too
    this.hardCeiling = hardCeiling ?? softCeiling;
  }

  /**
   * Reserve estimated cost before making an API call.
   * Throws if reservation would exceed soft ceiling.
   * @returns Reservation ID token
   */
  reserve(estimatedCost: number): string {
    const remaining = this.getRemaining();
    if (estimatedCost > remaining) {
      throw new Error(
        `Cannot reserve $${estimatedCost.toFixed(4)}: only $${remaining.toFixed(4)} remaining`
      );
    }

    const token = nanoid(12);
    this.reservations.set(token, { amount: estimatedCost });
    return token;
  }

  /**
   * Record actual cost after API call completes.
   * Replaces the reservation with the actual spend.
   */
  record(reservationId: string, actualCost: number): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Unknown reservation: ${reservationId}`);
    }

    this.reservations.delete(reservationId);
    this.spent += actualCost;
  }

  /**
   * Release an unused reservation (e.g., on API call failure).
   */
  release(reservationId: string): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Unknown reservation: ${reservationId}`);
    }

    this.reservations.delete(reservationId);
  }

  /**
   * Check if we can afford an estimated cost.
   * Uses soft ceiling minus (spent + reserved).
   */
  canAfford(estimatedCost: number): boolean {
    return estimatedCost <= this.getRemaining();
  }

  /**
   * Check if we should abort the benchmark.
   * Returns true when total spent reaches or exceeds the hard ceiling.
   */
  shouldAbort(): boolean {
    return this.spent >= this.hardCeiling;
  }

  /**
   * Get total confirmed spend.
   */
  getSpent(): number {
    return this.spent;
  }

  /**
   * Get total currently reserved (not yet confirmed).
   */
  getReserved(): number {
    let total = 0;
    for (const r of this.reservations.values()) {
      total += r.amount;
    }
    return total;
  }

  /**
   * Get remaining budget (soft ceiling minus spent and reserved).
   */
  getRemaining(): number {
    return this.softCeiling - this.spent - this.getReserved();
  }

  /**
   * Get a summary of the tracker state.
   */
  getSummary(): {
    spent: number;
    reserved: number;
    remaining: number;
    ceiling: number;
  } {
    return {
      spent: this.spent,
      reserved: this.getReserved(),
      remaining: this.getRemaining(),
      ceiling: this.softCeiling,
    };
  }
}
