// ─────────────────────────────────────────────────────────────────────────────
// Income Normalization — Section 3 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile, IncomeType, IncomeStability, DocumentationStatus } from '../types/profile';
import type { RecognitionTierKey } from '../rules/constants';
import {
  DOC_RECOGNITION_TIERS,
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

export interface RecognitionContext {
  documentationStatus?: DocumentationStatus;
  incomeStability?: IncomeStability;
  businessTenure?: number;
  employmentTenure?: string;
  isSecured?: boolean;
  hasRecords?: boolean;
}

export interface LenderIncomeCalculationResult {
  undocumentedPortion: number | null;
  recognizedUndocumented: number;
  recognitionRate: number;
  recognitionTier: RecognitionTierKey;
  recognitionTierLabel: string;
  haircut: number; // backward-compatibility alias for recognitionRate
  eligibleIncomeLender: number;
  eligibleIncomeRange?: { low: number; high: number };
  method: 'fully_documented' | 'partially_documented' | 'conservative_undocumented' | 'unknown_documentation';
  explanation: string;
  isProductJudgement: true;
}

/**
 * Determine the recognition tier for the undocumented portion based on available evidence.
 * Tiers (Product Judgements):
 * - strong: 75% recognition (60%–80% range)
 * - moderate: 50% recognition (40%–60% range)
 * - weak: 25% recognition (15%–35% range)
 * - uncertain: 15% recognition (0%–25% range, low confidence)
 */
export function determineRecognitionTier(context?: RecognitionContext): RecognitionTierKey {
  if (!context) return 'moderate';

  const { documentationStatus, incomeStability, businessTenure, isSecured, hasRecords } = context;

  // Unknown documentation -> widest uncertainty
  if (documentationStatus === 'unknown') {
    return 'uncertain';
  }

  const isStable = incomeStability === 'stable';
  const isEstablished = (businessTenure ?? 0) >= 3;
  const hasCorroboration = documentationStatus === 'partial' || hasRecords === true;

  // Strong: partial records with BOTH stable earnings AND >=3yr established operations, or secured with >=3yr stable operations
  if ((hasCorroboration && isStable && isEstablished) || (isSecured && isStable && isEstablished)) {
    return 'strong';
  }

  // Moderate: established business, steady earnings, partial records, or secured loan
  if (hasCorroboration || isEstablished || isStable || isSecured) {
    return 'moderate';
  }

  // Weak: irregular, gig, or unstable informal earnings without formal documentation
  if (incomeStability === 'unstable' || incomeStability === 'moderate' || documentationStatus === 'none') {
    return 'weak';
  }

  return 'uncertain';
}

/**
 * Compute lender-recognized income:
 * Distinguishes claimed income from documented income.
 * 1. Fully documented: 100% recognized (no haircut).
 * 2. Partially documented: documented base recognized 100% + conservative tier recognition on undocumented surplus.
 * 3. Completely undocumented: conservative tier recognition based on stability/tenure/corroboration.
 * 4. Unknown documentation: wide uncertainty range with LOW confidence.
 */
export function computeEligibleIncomeLender(
  documentedIncome: number | null,
  claimedTotalIncome: number,
  isSecured = false,
  coApplicantIncome = 0,
  context?: RecognitionContext
): LenderIncomeCalculationResult {
  const mergedContext: RecognitionContext = {
    ...context,
    isSecured: isSecured || context?.isSecured,
  };

  // Case 1: Unknown documentation ("I don't know")
  if (documentedIncome === null || mergedContext.documentationStatus === 'unknown') {
    const tier = DOC_RECOGNITION_TIERS.uncertain;
    const recognizedUndocumented = claimedTotalIncome * tier.rate;
    const eligibleIncomeLender = recognizedUndocumented + coApplicantIncome;
    const eligibleIncomeRange = {
      low: claimedTotalIncome * tier.range.low + coApplicantIncome,
      high: claimedTotalIncome * tier.range.high + coApplicantIncome,
    };
    return {
      undocumentedPortion: null,
      recognizedUndocumented,
      recognitionRate: tier.rate,
      recognitionTier: 'uncertain',
      recognitionTierLabel: tier.label,
      haircut: tier.rate,
      eligibleIncomeLender,
      eligibleIncomeRange,
      method: 'unknown_documentation',
      explanation: 'Your income documentation is unknown, so lender capacity is estimated across a wide conservative band with lower confidence.',
      isProductJudgement: true,
    };
  }

  const undocumentedPortion = Math.max(0, claimedTotalIncome - documentedIncome);

  // Case 2: Fully documented (undocumentedPortion === 0 or documented >= claimed)
  if (undocumentedPortion === 0 || documentedIncome >= claimedTotalIncome) {
    const eligibleIncomeLender = documentedIncome + coApplicantIncome;
    return {
      undocumentedPortion: 0,
      recognizedUndocumented: 0,
      recognitionRate: 1.0,
      recognitionTier: 'strong',
      recognitionTierLabel: 'Fully Documented (100% recognized)',
      haircut: 0,
      eligibleIncomeLender,
      method: 'fully_documented',
      explanation: 'Your reported income is fully documented, so no documentation haircut is applied.',
      isProductJudgement: true,
    };
  }

  // Case 3: Partially documented (documentedIncome > 0 && undocumentedPortion > 0)
  if (documentedIncome > 0) {
    const tierKey = determineRecognitionTier({
      ...mergedContext,
      documentationStatus: mergedContext.documentationStatus ?? 'partial',
    });
    const tier = DOC_RECOGNITION_TIERS[tierKey];
    const recognizedUndocumented = undocumentedPortion * tier.rate;
    const eligibleIncomeLender = documentedIncome + recognizedUndocumented + coApplicantIncome;
    const eligibleIncomeRange = {
      low: documentedIncome + (undocumentedPortion * tier.range.low) + coApplicantIncome,
      high: documentedIncome + (undocumentedPortion * tier.range.high) + coApplicantIncome,
    };
    return {
      undocumentedPortion,
      recognizedUndocumented,
      recognitionRate: tier.rate,
      recognitionTier: tierKey,
      recognitionTierLabel: tier.label,
      haircut: tier.rate,
      eligibleIncomeLender,
      eligibleIncomeRange,
      method: 'partially_documented',
      explanation: `₹${Math.round(documentedIncome).toLocaleString('en-IN')} of your ₹${Math.round(claimedTotalIncome).toLocaleString('en-IN')} reported income is documented. The remaining ₹${Math.round(undocumentedPortion).toLocaleString('en-IN')} is treated conservatively (${Math.round(tier.rate * 100)}% recognized) for lender-side capacity.`,
      isProductJudgement: true,
    };
  }

  // Case 4: Completely undocumented (documentedIncome === 0)
  const tierKey = determineRecognitionTier({
    ...mergedContext,
    documentationStatus: 'none',
  });
  const tier = DOC_RECOGNITION_TIERS[tierKey];
  const recognizedUndocumented = claimedTotalIncome * tier.rate;
  const eligibleIncomeLender = recognizedUndocumented + coApplicantIncome;
  const eligibleIncomeRange = {
    low: (claimedTotalIncome * tier.range.low) + coApplicantIncome,
    high: (claimedTotalIncome * tier.range.high) + coApplicantIncome,
  };

  return {
    undocumentedPortion,
    recognizedUndocumented,
    recognitionRate: tier.rate,
    recognitionTier: tierKey,
    recognitionTierLabel: tier.label,
    haircut: tier.rate,
    eligibleIncomeLender,
    eligibleIncomeRange,
    method: 'conservative_undocumented',
    explanation: `Your income is not formally documented, so lender capacity is estimated conservatively (${Math.round(tier.rate * 100)}% recognized) and confidence is lower.`,
    isProductJudgement: true,
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
