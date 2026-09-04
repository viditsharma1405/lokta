// ─────────────────────────────────────────────────────────────────────────────
// Stress Test — Section 8 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { StressResult, StressScenario, StressClassification } from '../types/calculations';
import type { SafeCapacityResult } from '../types/calculations';
import type { FairRateResult } from '../types/calculations';
import type { ConfidenceLevel } from '../types/results';
import { STRESS_INCOME_SHOCK, STRESS_RATE_SHOCK, STRESS_THRESHOLDS } from '../rules/constants';
import { computeEMI } from './emi';
import { determineLoanTypeKey } from './lenderCapacity';
import { TENURE_DEFAULTS } from '../rules/constants';

function classify(ratioPct: number): StressClassification {
  if (ratioPct <= STRESS_THRESHOLDS.comfortable) return 'Comfortable';
  if (ratioPct <= STRESS_THRESHOLDS.tight) return 'Tight';
  if (ratioPct <= STRESS_THRESHOLDS.stressed) return 'Stressed';
  return 'Unsustainable';
}

function classifyLabel(c: StressClassification): string {
  switch (c) {
    case 'Comfortable': return '≤35% of income — your obligations are well within control';
    case 'Tight': return '36–45% of income — manageable but leaves little slack';
    case 'Stressed': return '46–55% of income — concerning; one disruption could cause a miss';
    case 'Unsustainable': return '>55% of income — obligations already exceed safe carrying capacity';
  }
}

export function computeStressTest(
  profile: BorrowerProfile,
  safeCapacity: SafeCapacityResult,
  fairRate: FairRateResult,
  customTenure?: number,
  customPrincipal?: number
): StressResult {
  const loanTypeKey = determineLoanTypeKey(profile);
  const tenure = customTenure ?? TENURE_DEFAULTS[loanTypeKey] ?? 36;
  const newLoanPrincipal = customPrincipal ?? safeCapacity.recommendedAmount;
  const newLoanEMIBase = computeEMI(newLoanPrincipal, fairRate.fairRateMid, tenure);
  const newLoanEMIForBaseline = customPrincipal !== undefined ? newLoanEMIBase : safeCapacity.recommendedEMI;

  // Numerator: (recommendedEMI or simulated EMI) + existingEMI + businessDebtEMI + highCostDebtEMI
  const numerator =
    newLoanEMIForBaseline +
    profile.existingEMI +
    profile.businessDebtEMI +
    profile.highCostDebtEMI;

  const income = profile.eligibleIncomeSafe;

  // Baseline ratio
  const baselineRatio = income > 0 ? (numerator / income) * 100 : 100;
  const baselineClassification = classify(baselineRatio);

  // Income shock: income × 0.80
  const stressedIncome = income * STRESS_INCOME_SHOCK;
  const incomeShockRatio = stressedIncome > 0 ? (numerator / stressedIncome) * 100 : 100;
  const incomeShockClass = classify(incomeShockRatio);

  const incomeShock: StressScenario = {
    type: 'income_shock',
    label: '−20% income shock',
    stressedRatio: incomeShockRatio / 100,
    stressedRatioPct: incomeShockRatio,
    classification: incomeShockClass,
    explanation: `If your income drops 20% (to ₹${Math.round(stressedIncome).toLocaleString('en-IN')}), your total debt-service ratio becomes ${incomeShockRatio.toFixed(1)}% — ${classifyLabel(incomeShockClass)}.`,
  };

  // Rate shock: rate + 2 percentage points, recalculate new-loan EMI
  const stressedRate = fairRate.fairRateMid + STRESS_RATE_SHOCK;
  const newLoanEMIStressed = computeEMI(newLoanPrincipal, stressedRate, tenure);
  const rateShockNumerator = numerator - newLoanEMIForBaseline + newLoanEMIStressed;
  const rateShockRatio = income > 0 ? (rateShockNumerator / income) * 100 : 100;
  const rateShockClass = classify(rateShockRatio);

  const rateShock: StressScenario = {
    type: 'rate_shock',
    label: '+2 percentage point rate shock',
    stressedRatio: rateShockRatio / 100,
    stressedRatioPct: rateShockRatio,
    classification: rateShockClass,
    explanation: `If your interest rate rises by 2 points (to ${stressedRate.toFixed(1)}%), your monthly EMI increases from ₹${Math.round(newLoanEMIBase).toLocaleString('en-IN')} to ₹${Math.round(newLoanEMIStressed).toLocaleString('en-IN')}, making your total debt-service ratio ${rateShockRatio.toFixed(1)}% — ${classifyLabel(rateShockClass)}.`,
  };

  const confidence: ConfidenceLevel =
    profile.essentialExpensesIsDefaulted || profile.highCostDebtEMIIsDefaulted
      ? 'LOW' : 'MEDIUM';

  const explanation = `Baseline debt-service ratio: ${baselineRatio.toFixed(1)}% (${baselineClassification}). Under a 20% income drop: ${incomeShockRatio.toFixed(1)}% (${incomeShockClass}). Under a 2-point rate rise: ${rateShockRatio.toFixed(1)}% (${rateShockClass}).`;

  return {
    numerator,
    baselineRatio,
    baselineClassification,
    incomeShock,
    rateShock,
    confidence,
    explanation,
  };
}
