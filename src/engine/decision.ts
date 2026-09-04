// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine — Section 9 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { DecisionResult, Verdict } from '../types/calculations';
import type { LenderCapacityResult, SafeCapacityResult, StressResult } from '../types/calculations';
import type { ConfidenceLevel } from '../types/results';
import {
  HIGH_COST_DEBT_SEVERE_BURDEN,
  HIGH_COST_DEBT_COMPOUND_BURDEN,
  SOFT_SIGNAL_ESCALATION_COUNT,
  REQUEST_SAFE_RATIO_TRIGGER,
} from '../rules/constants';

const verdictOrder: Verdict[] = ['BORROW', 'BORROW_LESS', 'DONT_BORROW'];

function escalate(verdict: Verdict): Verdict {
  const idx = verdictOrder.indexOf(verdict);
  return verdictOrder[Math.min(idx + 1, verdictOrder.length - 1)];
}

export function computeDecision(
  profile: BorrowerProfile,
  lenderCapacity: LenderCapacityResult,
  safeCapacity: SafeCapacityResult,
  stress: StressResult
): DecisionResult {
  const hardStopsTriggered: string[] = [];
  const softSignalsTriggered: string[] = [];

  const highCostBurden = profile.highCostDebtEMI / Math.max(1, profile.eligibleIncomeSafe);

  // ── STEP 1 — Hard Stops ─────────────────────────────────────────────────
  // a) SEVERE: burden ≥ 30% of eligibleIncomeSafe
  if (profile.highCostDebtOutstanding > 0 && highCostBurden >= HIGH_COST_DEBT_SEVERE_BURDEN) {
    hardStopsTriggered.push(
      `SEVERE: High-cost debt monthly burden is ${(highCostBurden * 100).toFixed(1)}% of your income (threshold: 30%). This alone makes new borrowing inadvisable.`
    );
  }

  // b) COMPOUND: burden ≥ 15% AND recent bounce
  if (
    profile.highCostDebtOutstanding > 0 &&
    highCostBurden >= HIGH_COST_DEBT_COMPOUND_BURDEN &&
    profile.recentBounce
  ) {
    hardStopsTriggered.push(
      `COMPOUND: High-cost debt burden ≥15% of income AND a payment bounced recently. Two independent distress signals together.`
    );
  }

  // c) recent bounce AND baseline stress = Unsustainable
  if (profile.recentBounce && stress.baselineClassification === 'Unsustainable') {
    hardStopsTriggered.push(
      `Recent missed payment combined with an already Unsustainable debt-service ratio.`
    );
  }

  if (hardStopsTriggered.length > 0) {
    return {
      verdict: 'DONT_BORROW',
      hardStopsTriggered,
      softSignalsTriggered: [],
      softSignalCount: 0,
      escalated: false,
      reason: hardStopsTriggered[0],
      explanation: hardStopsTriggered[0],
      confidence: 'HIGH', // hard stops driven by directly-disclosed facts
      drivers: hardStopsTriggered,
      actionSuggestion:
        profile.highCostDebtOutstanding > 0
          ? 'Consider consolidating or renegotiating your existing high-cost debt before taking on any new borrowing.'
          : 'Resolve the recent missed payment and stabilize your cash flow before borrowing.',
    };
  }

  // ── STEP 2 — Amount comparison ─────────────────────────────────────────
  const requested = profile.requestedAmount;
  const safeAmt = safeCapacity.safeAmount;
  const lenderAmt = lenderCapacity.lenderLikelyAmount;

  let verdict: Verdict;
  let reason: string;

  if (requested <= safeAmt) {
    verdict = 'BORROW';
    reason = `Your requested amount (₹${Math.round(requested).toLocaleString('en-IN')}) is within your safe carrying capacity (₹${Math.round(safeAmt).toLocaleString('en-IN')}).`;
  } else if (requested <= lenderAmt) {
    verdict = 'BORROW_LESS';
    reason = `Your requested amount exceeds your safe ceiling (₹${Math.round(safeAmt).toLocaleString('en-IN')}). A lender may approve up to ₹${Math.round(lenderAmt).toLocaleString('en-IN')}, but ₹${Math.round(safeAmt).toLocaleString('en-IN')} is what's genuinely safer for your cash flow.`;
  } else {
    verdict = 'BORROW_LESS';
    reason = `Your requested amount exceeds both your safe ceiling (₹${Math.round(safeAmt).toLocaleString('en-IN')}) and likely lender capacity (₹${Math.round(lenderAmt).toLocaleString('en-IN')}). Even the lender-likely amount is above your safe capacity.`;
  }

  // ── STEP 3 — Soft Signals ────────────────────────────────────────────────
  if ((profile.emergencySavingsMonths ?? Infinity) < 1) {
    softSignalsTriggered.push('Emergency savings less than 1 month');
  }

  if (profile.recentBounce) {
    softSignalsTriggered.push('Recent EMI bounce (below hard-stop threshold alone)');
  }

  if (stress.incomeShock.classification === 'Stressed' || stress.incomeShock.classification === 'Unsustainable') {
    softSignalsTriggered.push('Stress test shows Stressed or worse under income shock');
  }

  if (safeAmt > 0 && requested > REQUEST_SAFE_RATIO_TRIGGER * safeAmt) {
    softSignalsTriggered.push(`Requested amount is more than ${REQUEST_SAFE_RATIO_TRIGGER}× your safe capacity`);
  }

  if (profile.highCostDebtOutstanding > 0 && highCostBurden < HIGH_COST_DEBT_COMPOUND_BURDEN) {
    softSignalsTriggered.push('High-cost debt present (below hard-stop threshold)');
  }

  const softSignalCount = softSignalsTriggered.length;
  let escalated = false;

  if (softSignalCount >= SOFT_SIGNAL_ESCALATION_COUNT) {
    const previousVerdict = verdict;
    verdict = escalate(verdict);
    escalated = verdict !== previousVerdict;
    if (escalated) {
      reason += ` Additionally, ${softSignalCount} soft signals together warrant extra caution.`;
    }
  }

  const confidence: ConfidenceLevel =
    lenderCapacity.confidence === 'HIGH' && safeCapacity.confidence === 'HIGH'
      ? 'HIGH'
      : lenderCapacity.confidence === 'LOW' || safeCapacity.confidence === 'LOW'
        ? 'MEDIUM'
        : 'MEDIUM';

  return {
    verdict,
    hardStopsTriggered,
    softSignalsTriggered,
    softSignalCount,
    escalated,
    reason,
    explanation: reason,
    confidence,
    drivers: [
      `Requested: ₹${Math.round(requested).toLocaleString('en-IN')}`,
      `Safe amount: ₹${Math.round(safeAmt).toLocaleString('en-IN')}`,
      `Lender-likely: ₹${Math.round(lenderAmt).toLocaleString('en-IN')}`,
      softSignalCount > 0 ? `Soft signals: ${softSignalCount}` : 'No soft signals',
    ],
    actionSuggestion: verdict === 'BORROW_LESS'
      ? `Consider borrowing ₹${Math.round(safeAmt).toLocaleString('en-IN')} — your safe ceiling — rather than the full requested amount.`
      : undefined,
  };
}
