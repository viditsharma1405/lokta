// ─────────────────────────────────────────────────────────────────────────────
// Effective Cost — Section 7 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { EffectiveCostResult } from '../types/calculations';
import { PROCESSING_FEE_RANGE, TENURE_DEFAULTS } from '../rules/constants';
import { computeEMI, solveEffectiveMonthlyRate, effectiveAnnualizedCost } from './emi';
import { determineLoanTypeKey } from './lenderCapacity';
import type { BorrowerProfile } from '../types/profile';

export function computeEffectiveCost(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  loanTypeKey: string
): EffectiveCostResult {
  if (principal <= 0) {
    return {
      principal: 0,
      nominalRate: annualRatePct,
      tenureMonths,
      emi: 0,
      processingFeeAmount: 0,
      processingFeePct: 0,
      netProceeds: 0,
      effectiveMonthlyRate: 0,
      effectiveAnnualizedCost: annualRatePct,
      includedItems: [],
      excludedItems: [],
      confidence: 'LOW',
      explanation: 'No principal — effective cost not applicable.',
    };
  }

  const feeRange = PROCESSING_FEE_RANGE[loanTypeKey] ?? [0.01, 0.025];
  const feeMid = (feeRange[0] + feeRange[1]) / 2;

  const emi = computeEMI(principal, annualRatePct, tenureMonths);
  const processingFeeAmount = principal * feeMid;
  const netProceeds = principal - processingFeeAmount;

  const effectiveMonthlyRate = solveEffectiveMonthlyRate(netProceeds, emi, tenureMonths);
  const effectiveAnnualized = effectiveAnnualizedCost(effectiveMonthlyRate);

  // Range across fee range
  const costLow = effectiveAnnualizedCost(
    solveEffectiveMonthlyRate(principal - principal * feeRange[0], emi, tenureMonths)
  );
  const costHigh = effectiveAnnualizedCost(
    solveEffectiveMonthlyRate(principal - principal * feeRange[1], emi, tenureMonths)
  );

  return {
    principal,
    nominalRate: annualRatePct,
    tenureMonths,
    emi,
    processingFeeAmount,
    processingFeePct: feeMid * 100,
    netProceeds,
    effectiveMonthlyRate,
    effectiveAnnualizedCost: effectiveAnnualized,
    effectiveAnnualizedCostRange: { low: costLow, high: costHigh },
    includedItems: [
      `Processing fee (~${(feeRange[0]*100).toFixed(1)}%–${(feeRange[1]*100).toFixed(1)}% of principal)`,
      'Nominal interest rate over full tenure',
    ],
    excludedItems: [
      'GST on processing fee (18%)',
      'Foreclosure / prepayment charges',
      'Insurance premium (if bundled)',
      'Exact disbursal timing differences',
      'Lender-specific additional fees',
    ],
    confidence: 'MEDIUM',
    explanation: `Your nominal interest rate is ${annualRatePct.toFixed(1)}% per year. After the processing fee (~${(feeMid * 100).toFixed(1)}% = ₹${Math.round(processingFeeAmount).toLocaleString('en-IN')}), the estimated effective annualized borrowing cost rises to approximately ${costLow.toFixed(1)}%–${costHigh.toFixed(1)}%. This is NOT the lender's regulatory APR — GST, insurance, and other charges are excluded.`,
  };
}

export function computeEffectiveCostForProfile(
  profile: BorrowerProfile,
  principal: number,
  annualRatePct: number,
  customTenure?: number
): EffectiveCostResult {
  const loanTypeKey = determineLoanTypeKey(profile);
  const tenure = customTenure ?? TENURE_DEFAULTS[loanTypeKey] ?? 36;
  return computeEffectiveCost(principal, annualRatePct, tenure, loanTypeKey);
}
