// ─────────────────────────────────────────────────────────────────────────────
// Fair Rate Engine — Section 6 of frozen rules (deterministic position model)
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { FairRateResult } from '../types/calculations';
import type { ConfidenceLevel } from '../types/results';
import {
  FAIR_RATE_STARTING_POSITION,
  FAIR_RATE_BASE_HALF_WIDTH,
  FAIR_RATE_WIDENING_PER_UNKNOWN,
  FAIR_RATE_MAX_HALF_WIDTH,
  RATE_ADJ,
  RATE_BANDS,
} from '../rules/constants';
import { determineLoanTypeKey } from './lenderCapacity';

/**
 * Implementation interpretation of Stage 2.5:
 * "strong collateral + tenure can offset thin file to qualify for bank tier"
 * Criteria: thin-file borrower with unencumbered property/gold collateral (>0 value)
 * and business tenure >= 3 years (the standard threshold for business stability).
 * Documented as an implementation interpretation rather than external lending rule.
 */
export function qualifiesForBankTierWithCollateral(profile: BorrowerProfile): boolean {
  if (profile.creditScoreStatus !== 'thin_file') return false;
  const hasTangibleCollateral = profile.collateral.type !== 'none' && (profile.collateral.statedValue ?? 0) > 0;
  const hasEstablishedTenure = (profile.businessTenure ?? 0) >= 3;
  return hasTangibleCollateral && hasEstablishedTenure;
}

/** Choose bank-tier vs NBFC-tier strictly per Stage 2.5 frozen rules */
export function chooseTier(profile: BorrowerProfile): 'bankTier' | 'nbfcTier' {
  if (profile.creditScore !== null && profile.creditScore >= 700) {
    return 'bankTier';
  }
  if (qualifiesForBankTierWithCollateral(profile)) {
    return 'bankTier';
  }
  return 'nbfcTier';
}


export function computeFairRate(profile: BorrowerProfile): FairRateResult {
  const loanTypeKey = determineLoanTypeKey(profile);
  const tier = chooseTier(profile);
  const band = RATE_BANDS[loanTypeKey] ?? RATE_BANDS['personal_loan'];
  const [lowerRate, upperRate] = band[tier];

  const adjustments: Array<{ factor: string; value: number; reason: string }> = [];
  let unknownCount = 0;

  // ── Credit Score ─────────────────────────────────────────────────────────
  if (profile.creditScoreStatus === 'thin_file') {
    adjustments.push({ factor: 'Credit history (thin file)', value: RATE_ADJ.creditScore.thinFile, reason: 'No prior formal borrowing — not the same as a bad score' });
  } else if (profile.creditScoreStatus === 'unknown') {
    adjustments.push({ factor: 'Credit score unknown', value: RATE_ADJ.creditScore.unknown, reason: 'No adjustment but adds uncertainty to the band' });
    unknownCount++;
  } else if (profile.creditScore !== null) {
    const score = profile.creditScore;
    let adj: number;
    let label: string;
    if (score >= 750) { adj = RATE_ADJ.creditScore.gte750; label = `Credit score ${score} (≥750)` ; }
    else if (score >= 700) { adj = RATE_ADJ.creditScore.range700_749; label = `Credit score ${score} (700–749)`; }
    else if (score >= 650) { adj = RATE_ADJ.creditScore.range650_699; label = `Credit score ${score} (650–699)`; }
    else if (score >= 550) { adj = RATE_ADJ.creditScore.range550_649; label = `Credit score ${score} (550–649)`; }
    else { adj = RATE_ADJ.creditScore.lt550; label = `Credit score ${score} (<550)`; }
    adjustments.push({ factor: label, value: adj, reason: 'Credit score is the primary rate determinant' });
  }

  // ── Repayment History ─────────────────────────────────────────────────────
  switch (profile.repaymentHistory) {
    case 'clean':
      adjustments.push({ factor: 'Clean repayment history', value: RATE_ADJ.repaymentHistory.clean, reason: 'No recent missed payments' });
      break;
    case 'bounce':
      adjustments.push({ factor: 'Recent EMI bounce', value: RATE_ADJ.repaymentHistory.bounce, reason: 'Bounce is a strong, singular distress signal' });
      break;
    case 'unknown':
      adjustments.push({ factor: 'Repayment history unknown', value: RATE_ADJ.repaymentHistory.unknown, reason: 'No adjustment but widens the band' });
      unknownCount++;
      break;
  }

  // ── Income / Business Stability ───────────────────────────────────────────
  switch (profile.incomeStability) {
    case 'stable':
      adjustments.push({ factor: 'Stable income', value: RATE_ADJ.stability.stable, reason: 'Reliable income reduces lender risk' });
      break;
    case 'moderate':
      adjustments.push({ factor: 'Moderate income stability', value: RATE_ADJ.stability.moderate, reason: 'Some variability in earnings' });
      break;
    case 'unstable':
      adjustments.push({ factor: 'Unstable income', value: RATE_ADJ.stability.unstable, reason: 'High variability increases lender risk premium' });
      break;
    case 'unknown':
      adjustments.push({ factor: 'Income stability unknown', value: RATE_ADJ.stability.unknown, reason: 'No adjustment but widens the band' });
      unknownCount++;
      break;
  }

  // ── Documentation ─────────────────────────────────────────────────────────
  switch (profile.documentationStatus) {
    case 'full':
      adjustments.push({ factor: 'Full income documentation', value: RATE_ADJ.documentation.full, reason: 'ITR / salary slips available' });
      break;
    case 'partial':
      adjustments.push({ factor: 'Partial documentation', value: RATE_ADJ.documentation.partial, reason: 'ITR below claimed cash income' });
      break;
    case 'none':
      adjustments.push({ factor: 'No income documentation', value: RATE_ADJ.documentation.none, reason: 'Fully undocumented income increases lender risk' });
      break;
    case 'unknown':
      adjustments.push({ factor: 'Documentation status unknown', value: RATE_ADJ.documentation.unknown, reason: 'Slight upward pressure + widens band' });
      unknownCount++;
      break;
  }

  // ── High-Cost Debt Present ────────────────────────────────────────────────
  // Distinct from repayment-history factor — no double count
  if (profile.highCostDebtOutstanding > 0) {
    adjustments.push({ factor: 'High-cost debt present', value: RATE_ADJ.highCostDebtPresent, reason: 'Existing predatory-adjacent debt raises risk perception' });
  }

  const sumAdj = adjustments.reduce((s, a) => s + a.value, 0);
  const finalPosition = Math.min(100, Math.max(0, FAIR_RATE_STARTING_POSITION + sumAdj));

  const rawHalfWidth = FAIR_RATE_BASE_HALF_WIDTH + FAIR_RATE_WIDENING_PER_UNKNOWN * unknownCount;
  const halfWidth = Math.min(rawHalfWidth, FAIR_RATE_MAX_HALF_WIDTH);

  const bandLowPosition = Math.min(100, Math.max(0, finalPosition - halfWidth));
  const bandHighPosition = Math.min(100, Math.max(0, finalPosition + halfWidth));

  const span = upperRate - lowerRate;
  const fairRateLow = lowerRate + (bandLowPosition / 100) * span;
  const fairRateHigh = lowerRate + (bandHighPosition / 100) * span;
  const fairRateMid = (fairRateLow + fairRateHigh) / 2;

  const confidence: ConfidenceLevel =
    unknownCount === 0 ? 'HIGH' :
    unknownCount <= 2 ? 'MEDIUM' : 'LOW';

  const drivers = [
    `Product: ${band.label} (${tier === 'bankTier' ? 'bank-tier' : 'NBFC-tier'}) → base band ${lowerRate}%–${upperRate}%`,
    `Starting position: ${FAIR_RATE_STARTING_POSITION} (neutral midpoint)`,
    ...adjustments.map(a => `${a.factor}: ${a.value > 0 ? '+' : ''}${a.value} pts`),
    `Final position: ${finalPosition.toFixed(1)} / 100`,
    `Half-width: ${halfWidth} (${unknownCount} unknown factor${unknownCount !== 1 ? 's' : ''})`,
  ];

  const explanation = `For your profile, a fair rate on a ${band.label.toLowerCase()} is approximately ${fairRateLow.toFixed(1)}%–${fairRateHigh.toFixed(1)}% per year. This is a market-level estimate based on your credit score, income type, documentation, and repayment history — not a guaranteed lender quote.`;

  return {
    baseBandLow: lowerRate,
    baseBandHigh: upperRate,
    startingPosition: FAIR_RATE_STARTING_POSITION,
    adjustments,
    finalPosition,
    halfWidth,
    unknownCount,
    bandLowPosition,
    bandHighPosition,
    fairRateLow,
    fairRateHigh,
    fairRateMid,
    confidence,
    explanation,
    drivers,
  };
}
