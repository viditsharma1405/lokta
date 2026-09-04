// ─────────────────────────────────────────────────────────────────────────────
// Income Normalization — Section 3 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile, IncomeType } from '../types/profile';
import {
  DOC_HAIRCUT_LENDER,
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
 * Compute eligible lender income:
 * documentedIncome + haircutLender × undocumentedPortion
 * haircut = 10% (unsecured) / 40% (secured)
 */
export function computeEligibleIncomeLender(
  documentedIncome: number,
  claimedTotalIncome: number,
  isSecured: boolean,
  coApplicantIncome = 0
): {
  undocumentedPortion: number;
  haircut: number;
  eligibleIncomeLender: number;
} {
  const undocumentedPortion = Math.max(0, claimedTotalIncome - documentedIncome);
  const haircut = isSecured ? DOC_HAIRCUT_LENDER.secured : DOC_HAIRCUT_LENDER.unsecured;
  const eligibleIncomeLender = documentedIncome + haircut * undocumentedPortion + coApplicantIncome;
  return { undocumentedPortion, haircut, eligibleIncomeLender };
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
