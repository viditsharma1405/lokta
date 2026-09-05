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
  if (profile.collateral.willingToPledge === 'no' || profile.collateral.willingToPledge === 'not_sure') return false;
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

  // ── 1. Credit Score ───────────────────────────────────────────────────────
  if (profile.creditScoreStatus === 'thin_file') {
    adjustments.push({
      factor: 'Credit history (thin file)',
      value: RATE_ADJ.creditScore.thinFile,
      reason: 'No formal bureau history — minor positioning adjustment; not treated as bad credit',
    });
  } else if (profile.creditScoreStatus === 'unknown' || profile.creditScore === null) {
    adjustments.push({
      factor: 'Credit score unknown',
      value: RATE_ADJ.creditScore.unknown,
      reason: 'No rate penalty (0 pts); widens uncertainty range instead',
    });
    unknownCount++;
  } else {
    const score = profile.creditScore;
    let adj: number;
    let label: string;
    let reasonText: string;
    if (score >= 750) {
      adj = RATE_ADJ.creditScore.gte750;
      label = 'Strong credit score (≥750)';
      reasonText = 'Excellent bureau repayment track record';
    } else if (score >= 700) {
      adj = RATE_ADJ.creditScore.range700_749;
      label = 'Good credit score (700–749)';
      reasonText = 'Reliable credit repayment track record';
    } else if (score >= 650) {
      adj = RATE_ADJ.creditScore.range650_699;
      label = 'Fair credit score (650–699)';
      reasonText = 'Average credit standing — neutral positioning';
    } else if (score >= 550) {
      adj = RATE_ADJ.creditScore.range550_649;
      label = 'Below-average credit score (550–649)';
      reasonText = 'Elevated bureau credit risk premium';
    } else {
      adj = RATE_ADJ.creditScore.lt550;
      label = 'Poor credit score (<550)';
      reasonText = 'Substantial credit risk premium';
    }
    adjustments.push({ factor: label, value: adj, reason: reasonText });
  }

  // ── 2. Repayment History ──────────────────────────────────────────────────
  switch (profile.repaymentHistory) {
    case 'clean':
      adjustments.push({
        factor: 'Clean repayment history',
        value: RATE_ADJ.repaymentHistory.clean,
        reason: 'No missed EMIs or bounces in recent records',
      });
      break;
    case 'bounce':
      adjustments.push({
        factor: 'Recent EMI bounce',
        value: RATE_ADJ.repaymentHistory.bounce,
        reason: 'Past payment distress increases lender risk perception',
      });
      break;
    case 'unknown':
    default:
      adjustments.push({
        factor: 'Repayment history unknown',
        value: RATE_ADJ.repaymentHistory.unknown,
        reason: 'No rate penalty (0 pts); widens uncertainty range instead',
      });
      unknownCount++;
      break;
  }

  // ── 3. Income / Business Stability ────────────────────────────────────────
  switch (profile.incomeStability) {
    case 'stable':
      adjustments.push({
        factor: 'Stable income',
        value: RATE_ADJ.stability.stable,
        reason: 'Consistent, predictable earnings reduce cash flow risk',
      });
      break;
    case 'moderate':
      adjustments.push({
        factor: 'Moderate income stability',
        value: RATE_ADJ.stability.moderate,
        reason: 'Minor seasonality or variance in earnings',
      });
      break;
    case 'unstable':
      adjustments.push({
        factor: 'Unstable income',
        value: RATE_ADJ.stability.unstable,
        reason: 'Irregular cash flows increase default risk premium',
      });
      break;
    case 'unknown':
    default:
      adjustments.push({
        factor: 'Income stability unknown',
        value: RATE_ADJ.stability.unknown,
        reason: 'No rate penalty (0 pts); widens uncertainty range instead',
      });
      unknownCount++;
      break;
  }

  // ── 4. Documentation ──────────────────────────────────────────────────────
  switch (profile.documentationStatus) {
    case 'full':
      adjustments.push({
        factor: 'Good documentation',
        value: RATE_ADJ.documentation.full,
        reason: 'Salary slips, Form 16, or ITR available for verification',
      });
      break;
    case 'partial':
      adjustments.push({
        factor: 'Partial documentation',
        value: RATE_ADJ.documentation.partial,
        reason: 'Bank statements or informal ledgers available without full ITR',
      });
      break;
    case 'none':
      adjustments.push({
        factor: 'No income documentation',
        value: RATE_ADJ.documentation.none,
        reason: 'Completely unverified cash earnings',
      });
      break;
    case 'unknown':
    default:
      adjustments.push({
        factor: 'Documentation status unknown',
        value: RATE_ADJ.documentation.unknown,
        reason: 'No rate penalty (0 pts); widens uncertainty range instead',
      });
      unknownCount++;
      break;
  }

  // ── 5. High-Cost Debt Present ─────────────────────────────────────────────
  // Applied at most once; distinct from repayment history
  if (profile.highCostDebtOutstanding > 0) {
    adjustments.push({
      factor: 'High-cost debt present',
      value: RATE_ADJ.highCostDebtPresent,
      reason: 'Outstanding debt at APR ≥ 30% indicates reliance on high-cost borrowing',
    });
  }

  // Sum position adjustments starting from neutral midpoint (50)
  const sumAdj = adjustments.reduce((s, a) => s + a.value, 0);
  const finalPosition = Math.min(100, Math.max(0, FAIR_RATE_STARTING_POSITION + sumAdj));

  // Uncertainty half-width: 15 + (5 × unknownCount), capped at 25
  const rawHalfWidth = FAIR_RATE_BASE_HALF_WIDTH + FAIR_RATE_WIDENING_PER_UNKNOWN * unknownCount;
  const halfWidth = Math.min(rawHalfWidth, FAIR_RATE_MAX_HALF_WIDTH);

  const span = upperRate - lowerRate;

  // Rate position maps linearly into product band
  const rate = lowerRate + (finalPosition / 100) * span;
  const fairRateMid = rate;

  // Symmetrical widening in percentage points around fairRateMid, clamped to product band
  const halfWidthRate = (halfWidth / 100) * span;
  const fairRateLow = Math.max(lowerRate, fairRateMid - halfWidthRate);
  const fairRateHigh = Math.min(upperRate, fairRateMid + halfWidthRate);

  const bandLowPosition = Math.min(100, Math.max(0, finalPosition - halfWidth));
  const bandHighPosition = Math.min(100, Math.max(0, finalPosition + halfWidth));

  const confidence: ConfidenceLevel =
    unknownCount === 0 ? 'HIGH' :
    unknownCount <= 2 ? 'MEDIUM' : 'LOW';

  const drivers = [
    `Product: ${band.label} (${tier === 'bankTier' ? 'bank-tier' : 'NBFC-tier'}) → base band ${lowerRate}%–${upperRate}%`,
    `Starting position: ${FAIR_RATE_STARTING_POSITION} (neutral midpoint)`,
    ...adjustments
      .filter(a => a.value !== 0)
      .map(a => `${a.factor}: ${a.value > 0 ? '+' : ''}${a.value} pts`),
    `Final position: ${finalPosition.toFixed(1)} / 100`,
  ];

  if (unknownCount > 0) {
    drivers.push(
      `Your rate range is wider because some lender-relevant information is unknown (${unknownCount} unknown factor${unknownCount !== 1 ? 's' : ''}, ±${halfWidth} pts)`
    );
  }

  let explanation = `For your profile, an estimated fair rate range on a ${band.label.toLowerCase()} is approximately ${fairRateLow.toFixed(1)}%–${fairRateHigh.toFixed(1)}% per year. This is a market-level estimate based on your reported inputs — not a guaranteed lender quote.`;
  if (unknownCount > 0) {
    explanation += ' Your rate range is wider because some lender-relevant information is unknown.';
  }

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
