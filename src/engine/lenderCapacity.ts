// ─────────────────────────────────────────────────────────────────────────────
// Lender Capacity — Section 4 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { LenderCapacityResult } from '../types/calculations';
import type { ConfidenceLevel } from '../types/results';
import { FOIR, LTV, COLLATERAL_HAIRCUT, TENURE_DEFAULTS } from '../rules/constants';
import { principalFromEMI } from './emi';
import { isSecuredProduct, computeEligibleIncomeLender } from './income';

function getLenderFOIR(profile: BorrowerProfile, isSecured: boolean): number {
  if (isSecured) return FOIR.secured;
  switch (profile.incomeType) {
    case 'salaried':
      return FOIR.salaried;
    case 'self_employed':
      return profile.documentationStatus === 'full' || profile.documentationStatus === 'partial'
        ? FOIR.selfEmployedITR
        : FOIR.selfEmployedUndocumented;
    case 'informal':
    case 'mixed':
    default:
      return FOIR.informal;
  }
}

function getLTV(
  collateralType: string,
  collateralValue: number
): number | null {
  if (collateralType === 'gold') {
    // RBI 2026 tiered LTV
    if (collateralValue <= 200000) return LTV.gold.upTo2L;
    if (collateralValue <= 1000000) return LTV.gold.twoTo10L;
    return LTV.gold.above10L;
  }
  if (collateralType === 'property_residential') return LTV.lapResidential;
  if (collateralType === 'property_commercial') return LTV.lapCommercial;
  return null;
}

export function determineLoanTypeKey(profile: BorrowerProfile): string {
  const { loanPurpose, collateral } = profile;
  if (loanPurpose === 'home_purchase') return 'home_loan';
  if (loanPurpose === 'vehicle') return 'two_wheeler_loan';
  if (loanPurpose === 'business_expansion') {
    const isPledged = collateral.willingToPledge !== 'no' && collateral.willingToPledge !== 'not_sure';
    if (isPledged && collateral.type !== 'none' && collateral.statedValue) {
      if (collateral.type === 'property_commercial') return 'lap_commercial';
      if (collateral.type === 'property_residential') return 'lap';
      if (collateral.type === 'gold') return 'gold_loan';
    }
    return 'business_loan';
  }
  // Non-business purposes preserve primary Personal Loan product
  return 'personal_loan';
}

export function computeLenderCapacity(
  profile: BorrowerProfile,
  fairRateMid: number,
  customTenure?: number
): LenderCapacityResult {
  const loanTypeKey = determineLoanTypeKey(profile);
  const secured = isSecuredProduct(loanTypeKey);
  const tenure = customTenure ?? TENURE_DEFAULTS[loanTypeKey] ?? 36;

  const foir = getLenderFOIR(profile, secured);
  const maxTotalDebtService = profile.eligibleIncomeLender * foir;

  const totalExistingDebt =
    profile.existingEMI +
    profile.businessDebtEMI +
    profile.highCostDebtEMI;

  const availableNewEMI = Math.max(0, maxTotalDebtService - totalExistingDebt);

  // FOIR-supported principal
  const foirSupportedAmount = principalFromEMI(availableNewEMI, fairRateMid, tenure);

  // LTV-supported principal (secured products only)
  let ltvSupportedAmount: number | null = null;
  let bindingConstraint: 'foir' | 'ltv' | 'both' = 'foir';

  if (secured && profile.collateral.statedValue !== null) {
    const ltv = getLTV(profile.collateral.type, profile.collateral.statedValue);
    if (ltv !== null) {
      const adjustedCollateralValue = profile.collateral.statedValue * (1 - COLLATERAL_HAIRCUT);
      ltvSupportedAmount = adjustedCollateralValue * ltv;

      if (foirSupportedAmount <= ltvSupportedAmount) {
        bindingConstraint = 'foir';
      } else {
        bindingConstraint = 'ltv';
      }
    }
  }

  const lenderLikelyAmount = secured && ltvSupportedAmount !== null
    ? Math.min(foirSupportedAmount, ltvSupportedAmount)
    : foirSupportedAmount;

  const calcResult = computeEligibleIncomeLender(
    profile.documentedIncome,
    profile.claimedTotalIncome,
    secured,
    profile.coApplicantIncome,
    {
      documentationStatus: profile.documentationStatus,
      incomeStability: profile.incomeStability,
      businessTenure: profile.businessTenure,
      employmentTenure: profile.employmentTenure,
      isSecured: secured,
    }
  );

  // Confidence assessment
  const missingInputs: string[] = [];
  if (profile.existingEMIIsDefaulted) missingInputs.push('existingEMI');
  if (profile.essentialExpensesIsDefaulted) missingInputs.push('expenses (affects context)');
  if (secured && profile.collateral.statedValue === null) {
    missingInputs.push('collateralValue (no LTV computation possible)');
  }
  if (profile.documentationStatus === 'unknown' || profile.documentedIncome === null) {
    missingInputs.push('documentationStatus');
  }

  let confidence: ConfidenceLevel =
    missingInputs.length === 0 ? 'HIGH' :
    missingInputs.length <= 2 ? 'MEDIUM' : 'LOW';

  // Completely undocumented, unknown documentation, or large unverified income produces LOW confidence
  if (
    profile.documentedIncome === null ||
    profile.documentationStatus === 'unknown' ||
    profile.documentationStatus === 'none' ||
    profile.documentedIncome === 0
  ) {
    if (profile.documentationStatus === 'full' || profile.incomeType === 'salaried') {
      // salaried/full stays high/medium
    } else {
      confidence = 'LOW';
    }
  }

  // Calculate range if documentation uncertainty exists
  let lenderLikelyAmountRange: { low: number; high: number } | undefined;
  let lenderRecognizedIncomeRange = calcResult.eligibleIncomeRange;

  if (calcResult.eligibleIncomeRange && calcResult.method !== 'fully_documented') {
    const availableNewEMI_low = Math.max(0, calcResult.eligibleIncomeRange.low * foir - totalExistingDebt);
    const availableNewEMI_high = Math.max(0, calcResult.eligibleIncomeRange.high * foir - totalExistingDebt);
    let lowAmount = principalFromEMI(availableNewEMI_low, fairRateMid, tenure);
    let highAmount = principalFromEMI(availableNewEMI_high, fairRateMid, tenure);

    if (secured && ltvSupportedAmount !== null) {
      lowAmount = Math.min(lowAmount, ltvSupportedAmount);
      highAmount = Math.min(highAmount, ltvSupportedAmount);
    }
    lenderLikelyAmountRange = { low: lowAmount, high: highAmount };
  }

  const docExplanation = calcResult.explanation;

  const drivers: string[] = [
    `Lender-recognized income: ₹${Math.round(profile.eligibleIncomeLender).toLocaleString('en-IN')}`,
    `Reported income: ₹${Math.round(profile.claimedTotalIncome).toLocaleString('en-IN')}`,
    `Documented income: ${profile.documentedIncome === null ? 'Unknown ("I don\'t know")' : profile.documentedIncome === 0 ? 'None (₹0)' : `₹${Math.round(profile.documentedIncome).toLocaleString('en-IN')}`}`,
    `Undocumented portion: ${profile.undocumentedPortion === null ? 'Unknown' : `₹${Math.round(profile.undocumentedPortion).toLocaleString('en-IN')}`}`,
    `Conservative recognition of undocumented portion: ${Math.round(calcResult.recognitionRate * 100)}% (${calcResult.recognitionTierLabel})`,
    `Documentation: ${docExplanation}`,
    `FOIR applied: ${(foir * 100).toFixed(0)}% (${profile.incomeType}${secured ? ', secured' : ''})`,
    `Max total debt service: ₹${Math.round(maxTotalDebtService).toLocaleString('en-IN')}`,
    `Existing obligations: ₹${Math.round(totalExistingDebt).toLocaleString('en-IN')}`,
    `Available new EMI: ₹${Math.round(availableNewEMI).toLocaleString('en-IN')}`,
    `Product judgement — not an RBI-mandated haircut.`,
  ];

  if (ltvSupportedAmount !== null) {
    drivers.push(
      `Collateral (after 20% haircut) × LTV: ₹${Math.round(ltvSupportedAmount).toLocaleString('en-IN')} — ${bindingConstraint === 'ltv' ? 'binding' : 'not binding'}`
    );
  }

  const explanation = availableNewEMI <= 0
    ? 'Your existing obligations already consume the full amount a lender would allocate. No new lending headroom remains.'
    : `A lender would allow up to ${(foir * 100).toFixed(0)}% of your lender-recognized income for all debt payments. After your existing obligations, there is ₹${Math.round(availableNewEMI).toLocaleString('en-IN')}/month available for a new loan — supporting a principal of approximately ₹${Math.round(lenderLikelyAmount / 100000 * 10) / 10}L.`;

  const docBreakdown = {
    claimedTotalIncome: profile.claimedTotalIncome,
    documentedIncome: profile.documentedIncome,
    undocumentedPortion: profile.undocumentedPortion,
    recognitionRate: calcResult.recognitionRate,
    recognitionTierLabel: calcResult.recognitionTierLabel,
    recognitionRange: calcResult.eligibleIncomeRange,
    recognizedUndocumented: calcResult.recognizedUndocumented,
    eligibleIncomeLender: profile.eligibleIncomeLender,
    isProductJudgement: true,
  };

  return {
    foir,
    foirSupportedAmount,
    ltvSupportedAmount,
    bindingConstraint,
    availableNewEMI,
    maxTotalDebtService,
    lenderLikelyAmount,
    lenderLikelyAmountRange,
    lenderRecognizedIncomeRange,
    docBreakdown,
    confidence,
    explanation,
    drivers,
  };
}
