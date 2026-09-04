// ─────────────────────────────────────────────────────────────────────────────
// Income Normalization — Section 3 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile, IncomeType } from '../types/profile';
import {
  DOC_RECOGNITION,
  EXPENSE_DEFAULT_PCT,
  EXPENSE_DEFAULT_RANGE_DELTA,
  EXISTING_EMI_UNKNOWN_FLOOR_PCT,
  HIGH_COST_DEBT_EMI_FALLBACK_PCT,
  HIGH_COST_DEBT_EMI_LOW_PCT,
  HIGH_COST_DEBT_EMI_HIGH_PCT,
} from '../rules/constants';

/** Determine if the product being sought is secured (LAP, gold) */
export function isSecuredProduct(loanType: string): boolean {
  return ['lap', 'lap_commercial', 'gold_loan', 'home_loan'].includes(loanType);
}

/**
 * Compute claimedTotalIncome from income range inputs.
 * - Self-employed ≥3yr tenure → midpoint of range
 * - Gig/daily-wage → lower bound
 * - Salaried / point figure → as given
 */
export function computeClaimedIncome(
  incomeType: IncomeType,
  pointIncome: number | null,
  rangeLow: number | null,
  rangeHigh: number | null,
  businessTenure?: number
): number {
  if (pointIncome !== null && pointIncome > 0) return pointIncome;
  if (rangeLow !== null && rangeHigh !== null) {
    if (incomeType === 'self_employed' && (businessTenure ?? 0) >= 3) {
      return (rangeLow + rangeHigh) / 2; // midpoint
    }
    return rangeLow; // lower bound for gig/informal
  }
  return rangeLow ?? 0;
}

/**
 * Compute lender-recognized income:
 * Replaces the blanket 10% haircut with an uncertainty-aware, documentation-based model:
 * 1. Fully documented: 100% recognized (no haircut).
 * 2. Partially documented: documented base recognized 100% + conservative haircut on unverified surplus.
 * 3. Completely undocumented: conservative base surrogate capped at informal benchmark ceiling.
 */
export function computeEligibleIncomeLender(
  documentedIncome: number,
  claimedTotalIncome: number,
  isSecured: boolean,
  coApplicantIncome = 0
): {
  undocumentedPortion: number;
  recognizedUndocumented: number;
  haircut: number;
  eligibleIncomeLender: number;
  method: 'fully_documented' | 'partially_documented' | 'conservative_undocumented';
  explanation: string;
} {
  const undocumentedPortion = Math.max(0, claimedTotalIncome - documentedIncome);

  // 1. Fully documented: no undocumented portion
  if (undocumentedPortion === 0 || documentedIncome >= claimedTotalIncome) {
    const eligibleIncomeLender = documentedIncome + coApplicantIncome;
    return {
      undocumentedPortion: 0,
      recognizedUndocumented: 0,
      haircut: 0,
      eligibleIncomeLender,
      method: 'fully_documented',
      explanation: 'Your reported income is fully documented, so no documentation haircut is applied.',
    };
  }

  // 2. Partially documented: documented base recognized 100%, conservative treatment on unverified surplus
  if (documentedIncome > 0) {
    const rate = isSecured
      ? DOC_RECOGNITION.partialUndocumentedRateSecured
      : DOC_RECOGNITION.partialUndocumentedRateUnsecured;
    const recognizedUndocumented = Math.min(
      DOC_RECOGNITION.partialUndocumentedCap,
      undocumentedPortion * rate
    );
    const eligibleIncomeLender = documentedIncome + recognizedUndocumented + coApplicantIncome;
    return {
      undocumentedPortion,
      recognizedUndocumented,
      haircut: rate,
      eligibleIncomeLender,
      method: 'partially_documented',
      explanation: `₹${Math.round(documentedIncome).toLocaleString('en-IN')} of your ₹${Math.round(claimedTotalIncome).toLocaleString('en-IN')} reported income is documented. The remaining ₹${Math.round(undocumentedPortion).toLocaleString('en-IN')} is treated conservatively for lender-side capacity.`,
    };
  }

  // 3. Completely undocumented (documentedIncome === 0)
  const baseRate = isSecured
    ? DOC_RECOGNITION.undocumentedBaseRateSecured
    : DOC_RECOGNITION.undocumentedBaseRateUnsecured;
  const cap = isSecured
    ? DOC_RECOGNITION.undocumentedCapSecured
    : DOC_RECOGNITION.undocumentedCapUnsecured;

  const rawRecognized = claimedTotalIncome * baseRate;
  const recognizedUndocumented = Math.min(cap, rawRecognized);
  const eligibleIncomeLender = recognizedUndocumented + coApplicantIncome;

  let explanation: string;
  if (claimedTotalIncome * baseRate > cap) {
    explanation = `Your income is not formally documented. For unverified ${isSecured ? 'secured' : 'unsecured'} borrowing, lenders apply a conservative base assessment capped at ₹${cap.toLocaleString('en-IN')}/month. High unverified cash amounts cannot be recognized without formal documents (ITR, bank credits, or GST).`;
  } else {
    explanation = 'Your income is not formally documented, so lender capacity is estimated conservatively and confidence is lower.';
  }

  return {
    undocumentedPortion,
    recognizedUndocumented,
    haircut: baseRate,
    eligibleIncomeLender,
    method: 'conservative_undocumented',
    explanation,
  };
}

/**
 * Safe income: claimed total income (no haircut) + co-applicant.
 */
export function computeEligibleIncomeSafe(
  claimedTotalIncome: number,
  coApplicantIncome = 0
): number {
  return claimedTotalIncome + coApplicantIncome;
}

/**
 * Compute essential expenses — with fallback logic per frozen rules.
 * Returns: { value, isDefaulted, range? }
 */
export function computeEssentialExpenses(
  statedExpenses: number | null,
  incomeType: IncomeType,
  income: number
): {
  value: number;
  isDefaulted: boolean;
  range?: { low: number; high: number };
} {
  if (statedExpenses !== null && statedExpenses >= 0) {
    return { value: statedExpenses, isDefaulted: false };
  }

  const pct = incomeType === 'salaried'
    ? EXPENSE_DEFAULT_PCT.salaried
    : EXPENSE_DEFAULT_PCT.selfEmployed; // 65% for SE and informal

  const defaultValue = income * pct;
  const rangeLow = income * (pct - EXPENSE_DEFAULT_RANGE_DELTA);
  const rangeHigh = income * (pct + EXPENSE_DEFAULT_RANGE_DELTA);

  return {
    value: defaultValue,
    isDefaulted: true,
    range: { low: Math.max(0, rangeLow), high: rangeHigh },
  };
}

/**
 * Compute existing EMI with unknown floor.
 * Unknown → 10% of income (never ₹0 if unknown)
 */
export function computeExistingEMI(
  statedEMI: number | null | undefined,
  income: number
): { value: number; isDefaulted: boolean } {
  if (statedEMI !== null && statedEMI !== undefined && statedEMI >= 0) {
    return { value: statedEMI, isDefaulted: false };
  }
  return {
    value: income * EXISTING_EMI_UNKNOWN_FLOOR_PCT,
    isDefaulted: true,
  };
}

/**
 * Compute high-cost debt EMI.
 * If unknown: outstanding × 25%, range 15–30%.
 */
export function computeHighCostDebtEMI(
  statedMonthlyPayment: number | null | undefined,
  outstandingBalance: number
): {
  value: number;
  isDefaulted: boolean;
  range?: { low: number; high: number };
} {
  if (statedMonthlyPayment !== null && statedMonthlyPayment !== undefined && statedMonthlyPayment > 0) {
    return { value: statedMonthlyPayment, isDefaulted: false };
  }
  return {
    value: outstandingBalance * HIGH_COST_DEBT_EMI_FALLBACK_PCT,
    isDefaulted: true,
    range: {
      low: outstandingBalance * HIGH_COST_DEBT_EMI_LOW_PCT,
      high: outstandingBalance * HIGH_COST_DEBT_EMI_HIGH_PCT,
    },
  };
}

/** Build a BorrowerProfile from normalized inputs — used by questionnaire */
export function buildProfile(p: BorrowerProfile): BorrowerProfile {
  return p; // normalization happens in the questionnaire layer; profile is already typed
}
