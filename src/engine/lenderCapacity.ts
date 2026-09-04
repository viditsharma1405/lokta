// ─────────────────────────────────────────────────────────────────────────────
// Lender Capacity — Section 4 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { LenderCapacityResult } from '../types/calculations';
import type { ConfidenceLevel } from '../types/results';
import { FOIR, LTV, COLLATERAL_HAIRCUT, TENURE_DEFAULTS, DOC_RECOGNITION } from '../rules/constants';
import { principalFromEMI } from './emi';
import { isSecuredProduct } from './income';

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

function determineLoanTypeKey(profile: BorrowerProfile): string {
  const { loanPurpose, collateral } = profile;
  if (loanPurpose === 'home_purchase') return 'home_loan';
  if (loanPurpose === 'vehicle') return 'two_wheeler_loan';
  if (loanPurpose === 'business_expansion') {
    return collateral.type !== 'none' && collateral.statedValue
      ? collateral.type === 'property_commercial' ? 'lap_commercial' : 'lap'
      : 'business_loan';
  }
  if (collateral.type === 'gold' && collateral.statedValue) return 'gold_loan';
  if (collateral.type !== 'none' && collateral.statedValue) return 'lap';
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

  // Confidence
  const missingInputs: string[] = [];
  if (profile.existingEMIIsDefaulted) missingInputs.push('existingEMI');
  if (profile.essentialExpensesIsDefaulted) missingInputs.push('expenses (affects context)');
  if (secured && profile.collateral.statedValue === null) {
    missingInputs.push('collateralValue (no LTV computation possible)');
  }
  if (profile.documentationStatus === 'unknown' || profile.documentationStatus === 'none' || profile.documentedIncome === 0) {
    missingInputs.push('documentationStatus');
  }

  let confidence: ConfidenceLevel =
    missingInputs.length === 0 ? 'HIGH' :
    missingInputs.length <= 2 ? 'MEDIUM' : 'LOW';

  // Completely undocumented income or large unverified income produces LOW confidence
  if (profile.documentedIncome === 0 && (profile.documentationStatus === 'none' || profile.claimedTotalIncome > DOC_RECOGNITION.undocumentedCapUnsecured)) {
    confidence = 'LOW';
  }

  let docExplanation = '';
  if (profile.undocumentedPortion === 0 || profile.documentationStatus === 'full' || profile.incomeType === 'salaried') {
    docExplanation = 'Your reported income is fully documented, so no documentation haircut is applied.';
  } else if (profile.documentedIncome > 0 && profile.undocumentedPortion > 0) {
    const ratePct = ((secured ? DOC_RECOGNITION.partialUndocumentedRateSecured : DOC_RECOGNITION.partialUndocumentedRateUnsecured) * 100).toFixed(0);
    docExplanation = `₹${Math.round(profile.documentedIncome).toLocaleString('en-IN')} of your ₹${Math.round(profile.claimedTotalIncome).toLocaleString('en-IN')} reported income is documented. The remaining ₹${Math.round(profile.undocumentedPortion).toLocaleString('en-IN')} is treated conservatively (${ratePct}% recognized) for lender-side capacity.`;
  } else {
    const capVal = secured ? DOC_RECOGNITION.undocumentedCapSecured : DOC_RECOGNITION.undocumentedCapUnsecured;
    const isCapped = profile.claimedTotalIncome > capVal;
    docExplanation = isCapped
      ? `Your income is not formally documented, so lender capacity is estimated conservatively (capped at ₹${capVal.toLocaleString('en-IN')}/month) and confidence is lower.`
      : 'Your income is not formally documented, so lender capacity is estimated conservatively and confidence is lower.';
  }

  const drivers: string[] = [
    `Lender-recognized income: ₹${Math.round(profile.eligibleIncomeLender).toLocaleString('en-IN')}`,
    `Documentation: ${docExplanation}`,
    `FOIR applied: ${(foir * 100).toFixed(0)}% (${profile.incomeType}${secured ? ', secured' : ''})`,
    `Max total debt service: ₹${Math.round(maxTotalDebtService).toLocaleString('en-IN')}`,
    `Existing obligations: ₹${Math.round(totalExistingDebt).toLocaleString('en-IN')}`,
    `Available new EMI: ₹${Math.round(availableNewEMI).toLocaleString('en-IN')}`,
  ];

  if (ltvSupportedAmount !== null) {
    drivers.push(
      `Collateral (after 20% haircut) × LTV: ₹${Math.round(ltvSupportedAmount).toLocaleString('en-IN')} — ${bindingConstraint === 'ltv' ? 'binding' : 'not binding'}`
    );
  }

  const explanation = availableNewEMI <= 0
    ? 'Your existing obligations already consume the full amount a lender would allocate. No new lending headroom remains.'
    : `A lender would allow up to ${(foir * 100).toFixed(0)}% of your lender-recognized income for all debt payments. After your existing obligations, there is ₹${Math.round(availableNewEMI).toLocaleString('en-IN')}/month available for a new loan — supporting a principal of approximately ₹${Math.round(lenderLikelyAmount / 100000 * 10) / 10}L.`;

  return {
    foir,
    foirSupportedAmount,
    ltvSupportedAmount,
    bindingConstraint,
    availableNewEMI,
    maxTotalDebtService,
    lenderLikelyAmount,
    confidence,
    explanation,
    drivers,
  };
}

export { determineLoanTypeKey };
