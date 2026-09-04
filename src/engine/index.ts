// ─────────────────────────────────────────────────────────────────────────────
// Engine Index — master orchestrator. Pure functions, no React/browser deps.
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { CopilotOutput } from '../types/calculations';
import { computeFairRate } from './fairRate';
import { computeLenderCapacity } from './lenderCapacity';
import { computeSafeCapacity } from './safeCapacity';
import { computeEffectiveCostForProfile } from './effectiveCost';
import { computeStressTest } from './stressTest';
import { computeDecision } from './decision';
import { computeProductRoute } from './productRoute';

/**
 * Run the complete copilot calculation pipeline.
 * Input: a fully normalized BorrowerProfile.
 * Output: CopilotOutput containing all calculation results.
 *
 * No UI dependency. No network calls. No LLM.
 *
 * IMPORTANT: productive_return is NOT passed to any calculation function.
 * It is stored in BorrowerProfile for display-only purposes.
 */
export function runCopilot(profile: BorrowerProfile, customTenure?: number): CopilotOutput {
  // Step 1: Fair rate (needed for lender and safe capacity)
  const fairRate = computeFairRate(profile);

  // Step 2: Lender capacity (uses fair rate midpoint for EMI→Principal)
  const lenderCapacity = computeLenderCapacity(profile, fairRate.fairRateMid, customTenure);

  // Step 3: Safe capacity (uses fair rate ceiling for conservative principal)
  const safeCapacity = computeSafeCapacity(profile, fairRate.fairRateHigh, customTenure);

  // Step 4: Stress test
  const stress = computeStressTest(profile, safeCapacity, fairRate, customTenure);

  // Step 5: Decision
  const decision = computeDecision(profile, lenderCapacity, safeCapacity, stress);

  // Step 6: Effective cost (at recommended amount and ceiling rate)
  const principalForCost = Math.max(0, safeCapacity.recommendedAmount);
  const effectiveCost = computeEffectiveCostForProfile(profile, principalForCost, fairRate.fairRateHigh, customTenure);

  // Step 7: Product route
  const productRoute = computeProductRoute(profile);

  return {
    lenderCapacity,
    safeCapacity,
    fairRate,
    effectiveCost,
    stress,
    decision,
    productRoute,
  };
}

export { computeFairRate, computeLenderCapacity, computeSafeCapacity, computeEffectiveCostForProfile, computeStressTest, computeDecision, computeProductRoute };
