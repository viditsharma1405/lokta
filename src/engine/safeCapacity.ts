// ─────────────────────────────────────────────────────────────────────────────
// Safe Capacity — Section 5 of frozen rules
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { SafeCapacityResult } from '../types/calculations';
import type { ConfidenceLevel } from '../types/results';
import {
  RETENTION_BASE,
  RETENTION_ADJ,
  RETENTION_FLOOR,
  RETENTION_CAP,
  PRESENTATION_HEADROOM,
  EXPENSE_DEFAULT_RANGE_DELTA,
} from '../rules/constants';
import { principalFromEMI } from './emi';
import { determineLoanTypeKey } from './lenderCapacity';
import { TENURE_DEFAULTS } from '../rules/constants';

function getBaseRetentionFactor(profile: BorrowerProfile): {
  factor: number;
  label: string;
} {
  switch (profile.incomeType) {
    case 'salaried': {
      // Fixed / stable salary without variable component qualifies for 50% base retention
      const isVariable =
        profile.incomeStability === 'moderate' ||
        profile.incomeStability === 'unstable' ||
        (profile.variableIncomeShare !== undefined && profile.variableIncomeShare > 0);

      if (!isVariable) {
        return { factor: RETENTION_BASE.salariedStable, label: 'Salaried, stable income' };
      }
      return { factor: RETENTION_BASE.salariedLessStable, label: 'Salaried, variable income' };
    }
    case 'self_employed':
      if (
        profile.documentationStatus === 'full' ||
        profile.documentationStatus === 'partial'
      ) {
        return {
          factor: RETENTION_BASE.selfEmployedITRSteady,
          label: 'Self-employed with documentation, steady',
        };
      }
      return {
        factor: RETENTION_BASE.selfEmployedSeasonalUndoc,
        label: 'Self-employed, seasonal/undocumented',
      };
    case 'informal':
    case 'mixed':
    default:
      return { factor: RETENTION_BASE.informalGig, label: 'Informal / gig income' };
  }
}

export function computeSafeCapacity(
  profile: BorrowerProfile,
  fairRateCeiling: number,
  customTenure?: number
): SafeCapacityResult {
  const loanTypeKey = determineLoanTypeKey(profile);
  const tenure = customTenure ?? TENURE_DEFAULTS[loanTypeKey] ?? 36;

  // Disposable cash flow
  const disposableCashFlow = Math.max(
    0,
    profile.eligibleIncomeSafe
    - profile.essentialExpenses
    - profile.existingEMI
    - profile.businessDebtEMI
    - profile.highCostDebtEMI
  );

  // Base retention factor
  const { factor: baseRetentionFactor, label: baseLabel } = getBaseRetentionFactor(profile);

  // Adjustments
  const adjustments: Array<{ name: string; value: number; reason: string }> = [];

  const hasHighVariableIncome =
    profile.variableIncomeComponent === 'high' ||
    (profile.variableIncomeComponent === undefined && (profile.variableIncomeShare ?? 0) > 0.30);

  if (hasHighVariableIncome) {
    adjustments.push({
      name: 'Variable income >30%',
      value: RETENTION_ADJ.variableIncomeHigh,
      reason: 'More than 30% of your income varies month to month, so we use a slightly larger affordability buffer.',
    });
  }

  if (profile.emergencySavingsMonths !== null) {
    if (profile.emergencySavingsMonths < 1) {
      adjustments.push({
        name: 'Emergency savings < 1 month',
        value: RETENTION_ADJ.savingsLt1Month,
        reason: 'No buffer against income disruption',
      });
    } else if (profile.emergencySavingsMonths > 6) {
      adjustments.push({
        name: 'Emergency savings > 6 months',
        value: RETENTION_ADJ.savingsGt6Months,
        reason: 'Demonstrated self-insurance capacity',
      });
    }
  }
  // If emergencySavingsMonths is null → no bonus, no penalty (genuinely unknown)

  if (profile.dependents > 2 && !profile.hasOtherEarner) {
    adjustments.push({
      name: 'More than 2 dependents, no other earner',
      value: RETENTION_ADJ.dependentsGt2NoEarner,
      reason: 'Larger single-income household has less financial slack',
    });
  }

  if (profile.recentBounce) {
    adjustments.push({
      name: 'Recent EMI bounce',
      value: RETENTION_ADJ.recentBounce,
      reason: 'Current obligations already stretched',
    });
  }

  // High-cost debt soft signal (distinct from bounce)
  const highCostDebtBurden = profile.highCostDebtEMI / profile.eligibleIncomeSafe;
  const isHighCostDebtSoftSignal =
    profile.highCostDebtOutstanding > 0 &&
    highCostDebtBurden < 0.15 &&
    !profile.recentBounce;
  if (isHighCostDebtSoftSignal) {
    adjustments.push({
      name: 'High-cost debt present',
      value: RETENTION_ADJ.highCostDebtSoft,
      reason: 'Existing expensive debt, distinct from bounce signal',
    });
  }

  if (profile.upcomingLargeExpense) {
    adjustments.push({
      name: 'Upcoming large expense',
      value: RETENTION_ADJ.upcomingLargeExpense,
      reason: 'Foreseeable shock should be pre-funded',
    });
  }

  const totalAdj = adjustments.reduce((sum, a) => sum + a.value, 0);
  const rawRetention = Math.min(
    RETENTION_CAP,
    Math.max(RETENTION_FLOOR, baseRetentionFactor + totalAdj)
  );
  const adjustedRetentionFactor = Math.round(rawRetention * 10000) / 10000;

  // Safe EMI (hard ceiling — never discounted further)
  const safeEMI = disposableCashFlow * adjustedRetentionFactor;

  // Recommended EMI — PRESENTATION_HEADROOM applied exactly once
  const recommendedEMI = safeEMI * PRESENTATION_HEADROOM;

  // Safe amount and recommended amount using fairRateCeiling
  const safeAmount = principalFromEMI(safeEMI, fairRateCeiling, tenure);
  const recommendedAmount = principalFromEMI(recommendedEMI, fairRateCeiling, tenure);

  // If expenses were defaulted, compute range
  let safeAmountRange: { low: number; high: number } | undefined;
  if (profile.essentialExpensesIsDefaulted) {
    const income = profile.eligibleIncomeSafe;
    const incomeType = profile.incomeType;
    const basePct = incomeType === 'salaried' ? 0.55 : 0.65;
    const expLow = income * (basePct - EXPENSE_DEFAULT_RANGE_DELTA);
    const expHigh = income * (basePct + EXPENSE_DEFAULT_RANGE_DELTA);

    const disposableLow = Math.max(0, income - expHigh - profile.existingEMI - profile.businessDebtEMI - profile.highCostDebtEMI);
    const disposableHigh = Math.max(0, income - expLow - profile.existingEMI - profile.businessDebtEMI - profile.highCostDebtEMI);
    const safeAmtLow = principalFromEMI(disposableLow * adjustedRetentionFactor, fairRateCeiling, tenure);
    const safeAmtHigh = principalFromEMI(disposableHigh * adjustedRetentionFactor, fairRateCeiling, tenure);
    safeAmountRange = { low: safeAmtLow, high: safeAmtHigh };
  }

  // Confidence
  const missingInputs: string[] = [];
  if (profile.essentialExpensesIsDefaulted) missingInputs.push('householdExpenses');
  if (profile.highCostDebtEMIIsDefaulted) missingInputs.push('highCostDebtMonthlyPayment');
  if (profile.existingEMIIsDefaulted) missingInputs.push('existingEMI');
  if (profile.variableIncomeComponent === 'unknown') missingInputs.push('variableIncomeComponent');

  const confidence: ConfidenceLevel =
    missingInputs.length === 0 ? 'HIGH' :
    missingInputs.length <= 2 ? 'MEDIUM' : 'LOW';

  // Override to LOW if any heavily-weighted input is defaulted
  const lowConfidence = profile.highCostDebtEMIIsDefaulted || profile.essentialExpensesIsDefaulted;
  const finalConfidence: ConfidenceLevel = lowConfidence
    ? (missingInputs.length >= 2 ? 'LOW' : 'MEDIUM')
    : confidence;

  const drivers: string[] = [
    `Safe income: ₹${Math.round(profile.eligibleIncomeSafe).toLocaleString('en-IN')}`,
    `Essential expenses: ₹${Math.round(profile.essentialExpenses).toLocaleString('en-IN')}${profile.essentialExpensesIsDefaulted ? ' (estimated)' : ''}`,
    `Existing obligations: ₹${Math.round(profile.existingEMI + profile.businessDebtEMI + profile.highCostDebtEMI).toLocaleString('en-IN')}`,
    `Disposable cash flow: ₹${Math.round(disposableCashFlow).toLocaleString('en-IN')}`,
    `${baseLabel} — base retention ${(baseRetentionFactor * 100).toFixed(0)}%`,
    `Adjusted retention: ${(adjustedRetentionFactor * 100).toFixed(0)}%`,
  ];

  if (profile.variableIncomeComponent === 'unknown') {
    drivers.push('Variable income component: Not sure (unknown volatility — buffer preserved without penalty)');
  }

  const explanation =
    disposableCashFlow <= 0
      ? 'Your income after essential expenses and existing obligations leaves nothing available for a new loan payment. This is a pre-existing affordability concern.'
      : `After expenses and existing debt payments, you have ₹${Math.round(disposableCashFlow).toLocaleString('en-IN')}/month available. Applying a ${(adjustedRetentionFactor * 100).toFixed(0)}% retention factor (leaving a buffer for unexpected costs), your safe monthly payment ceiling is ₹${Math.round(safeEMI).toLocaleString('en-IN')}.`;

  return {
    disposableCashFlow,
    baseRetentionFactor,
    adjustments,
    adjustedRetentionFactor,
    safeEMI,
    recommendedEMI,
    safeAmount,
    recommendedAmount,
    safeAmountRange,
    confidence: finalConfidence,
    explanation,
    drivers,
  };
}
