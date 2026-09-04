// ─────────────────────────────────────────────────────────────────────────────
// FROZEN CONSTANTS — Stage 2.5 Final Rules
// Every value is explicitly tagged with its source.
// DO NOT change these without updating RULES.md.
// ─────────────────────────────────────────────────────────────────────────────

// ── FOIR (Fixed Obligation to Income Ratio) ──────────────────────────────────
// Source: My judgement
export const FOIR = {
  salaried: 0.50,
  selfEmployedITR: 0.45,
  selfEmployedUndocumented: 0.35,
  informal: 0.35,
  secured: 0.60,          // overrides segment FOIR when product is secured
} as const;

// ── LTV (Loan to Value) ───────────────────────────────────────────────────────
// Source: External fact (RBI 2026 / market research)
export const LTV = {
  gold: {
    upTo2L: 0.85,         // RBI tiered 2026
    twoTo10L: 0.80,
    above10L: 0.75,
  },
  lapResidential: 0.70,   // External fact (market research)
  lapCommercial: 0.60,    // External fact (iServeFinancial, conservative end of 60–65%)
} as const;

// ── Collateral Haircut ────────────────────────────────────────────────────────
// Source: My judgement (self-reported values are unverified)
export const COLLATERAL_HAIRCUT = 0.20;

// ── Documentation Haircuts for Lender Income ─────────────────────────────────
// Source: My judgement
export const DOC_HAIRCUT_LENDER = {
  unsecured: 0.10,   // 10% of undocumented portion counted
  secured: 0.40,     // 40% of undocumented portion counted (collateral backs the loan)
} as const;

// ── Retention Factors (Safe Capacity) ────────────────────────────────────────
// Source: My judgement. Base rates, before adjustments.
export const RETENTION_BASE = {
  salariedStable: 0.50,
  salariedLessStable: 0.40,
  selfEmployedITRSteady: 0.40,
  selfEmployedSeasonalUndoc: 0.30,
  informalGig: 0.25,
} as const;

// Retention adjustments (in percentage points, not fractions)
// Source: My judgement
export const RETENTION_ADJ = {
  variableIncomeHigh: -0.05,    // variable income >30% of total
  savingsLt1Month: -0.05,       // emergency savings < 1 month
  savingsGt6Months: +0.05,      // emergency savings > 6 months
  dependentsGt2NoEarner: -0.05, // >2 dependents, no other earner
  recentBounce: -0.10,          // recent EMI bounce
  highCostDebtSoft: -0.10,      // high-cost debt present but below hard-stop
  upcomingLargeExpense: -0.05,  // foreseeable income shock
} as const;

// Retention clamp — prevents absurd extremes
// Source: My judgement
export const RETENTION_FLOOR = 0.10;
export const RETENTION_CAP = 0.55;

// ── Presentation Headroom Factor ──────────────────────────────────────────────
// Source: My judgement. Applied EXACTLY ONCE to derive recommendedEMI.
export const PRESENTATION_HEADROOM = 0.90;

// ── Fair Rate Starting Position ───────────────────────────────────────────────
// Source: My judgement. 0–100 scale; 0 = lowerRate, 100 = upperRate.
export const FAIR_RATE_STARTING_POSITION = 50;

// Base half-width (even with full information)
export const FAIR_RATE_BASE_HALF_WIDTH = 15;

// Additional widening per unknown material factor
export const FAIR_RATE_WIDENING_PER_UNKNOWN = 10;

// Cap so finalPosition ± halfWidth stays within total span ≤ 100
export const FAIR_RATE_MAX_HALF_WIDTH = 50;

// ── Fair Rate Position Adjustments ───────────────────────────────────────────
// Source: My judgement. Each factor scored exactly once.
export const RATE_ADJ = {
  creditScore: {
    gte750: -20,
    range700_749: -10,
    range650_699: 0,
    range550_649: +15,
    lt550: +30,
    thinFile: +5,
    unknown: 0,      // +1 unknown for widening
  },
  repaymentHistory: {
    clean: -5,
    bounce: +20,
    unknown: 0,      // +1 unknown for widening
  },
  stability: {
    stable: -10,
    moderate: -5,
    unstable: +10,
    unknown: 0,      // +1 unknown for widening
  },
  documentation: {
    full: -5,
    partial: 0,
    none: +15,
    unknown: +5,     // +1 unknown for widening
  },
  highCostDebtPresent: +10,
} as const;

// ── Product Rate Bands ────────────────────────────────────────────────────────
// Source: External fact (market research) and Product assumption.
// NOTE: Business and two-wheeler bands are weakest-sourced (per limitations).
// bank-tier chosen when creditScore ≥700 OR strong collateral/tenure offsets thin file.
// NBFC-tier otherwise.
export interface RateBand {
  bankTier: [number, number]; // [low, high] as %
  nbfcTier: [number, number];
  label: string;
}

export const RATE_BANDS: Record<string, RateBand> = {
  personal_loan: {
    bankTier: [10, 16],
    nbfcTier: [16, 30],
    label: 'Personal Loan',
  },
  home_loan: {
    bankTier: [8.5, 10.5],
    nbfcTier: [10.5, 14],
    label: 'Home Loan',
  },
  lap: {
    bankTier: [9.5, 15],
    nbfcTier: [15, 20],
    label: 'Loan Against Property (LAP)',
  },
  lap_commercial: {
    bankTier: [9.5, 15],
    nbfcTier: [15, 20],
    label: 'LAP (Commercial Property)',
  },
  gold_loan: {
    bankTier: [7, 12],
    nbfcTier: [12, 26],
    label: 'Gold Loan',
  },
  two_wheeler_loan: {
    bankTier: [9, 14],
    nbfcTier: [14, 22],
    label: 'Two-Wheeler Loan',
  },
  business_loan: {
    bankTier: [11, 17],
    nbfcTier: [17, 28],
    label: 'Business Loan',
  },
} as const;

// ── Tenure Defaults (months) ──────────────────────────────────────────────────
// Source: My judgement (aggregator/market norms)
export const TENURE_DEFAULTS: Record<string, number> = {
  personal_loan: 36,
  home_loan: 180,
  lap: 84,
  lap_commercial: 84,
  gold_loan: 12,
  two_wheeler_loan: 36,
  business_loan: 36,
} as const;

// Reasonable tenure options for comparison display & interactive simulation
export const TENURE_OPTIONS: Record<string, number[]> = {
  personal_loan: [12, 24, 36, 48, 60],
  home_loan: [60, 120, 180, 240],
  lap: [36, 48, 60, 72, 84, 120],
  lap_commercial: [36, 48, 60, 72, 84, 120],
  gold_loan: [6, 12, 18, 24],
  two_wheeler_loan: [12, 24, 36, 48],
  business_loan: [12, 24, 36, 48, 60],
} as const;

// ── Stress Test Parameters ────────────────────────────────────────────────────
// Source: Assignment-derived (Lokta brief's own suggested examples)
export const STRESS_INCOME_SHOCK = 0.80;  // income × 0.80
export const STRESS_RATE_SHOCK = 2.0;     // rate + 2 percentage points

// Stress classification thresholds (as %)
// Source: My judgement
export const STRESS_THRESHOLDS = {
  comfortable: 35,     // ≤35%
  tight: 45,           // 36–45%
  stressed: 55,        // 46–55%
  // >55% = Unsustainable
} as const;

// ── Hard-Stop Thresholds ──────────────────────────────────────────────────────
// Source: My judgement
export const HIGH_COST_DEBT_APR_THRESHOLD = 30;  // APR ≥ 30% = high-cost
export const HIGH_COST_DEBT_SEVERE_BURDEN = 0.30; // ≥30% of eligibleIncomeSafe
export const HIGH_COST_DEBT_COMPOUND_BURDEN = 0.15; // ≥15% + bounce

// ── Soft Signal Threshold for Escalation ─────────────────────────────────────
// Source: My judgement
export const SOFT_SIGNAL_ESCALATION_COUNT = 2;

// Request / safe ratio soft-signal trigger
// Source: My judgement
export const REQUEST_SAFE_RATIO_TRIGGER = 1.5;

// ── Household Expense Defaults ────────────────────────────────────────────────
// Source: My judgement. Shown as a range when fully defaulted.
export const EXPENSE_DEFAULT_PCT = {
  salaried: 0.55,
  selfEmployed: 0.65,
  informal: 0.65,
} as const;
export const EXPENSE_DEFAULT_RANGE_DELTA = 0.15; // ±15 percentage points

// ── Existing EMI Unknown Floor ────────────────────────────────────────────────
// Source: My judgement. Never ₹0 if unknown.
export const EXISTING_EMI_UNKNOWN_FLOOR_PCT = 0.10; // 10% of income

// ── High-Cost Debt EMI Fallback ───────────────────────────────────────────────
// Source: My judgement. Outstanding × 25%, shown as range 15–30%.
export const HIGH_COST_DEBT_EMI_FALLBACK_PCT = 0.25;
export const HIGH_COST_DEBT_EMI_LOW_PCT = 0.15;
export const HIGH_COST_DEBT_EMI_HIGH_PCT = 0.30;

// ── Processing Fee Range ──────────────────────────────────────────────────────
// Source: External fact (approximate, aggregator-observed)
export const PROCESSING_FEE_RANGE: Record<string, [number, number]> = {
  personal_loan: [0.01, 0.025],
  home_loan: [0.005, 0.01],
  lap: [0.01, 0.02],
  lap_commercial: [0.01, 0.02],
  gold_loan: [0.005, 0.01],
  two_wheeler_loan: [0.01, 0.02],
  business_loan: [0.01, 0.025],
} as const;

// Mid-point of processing fee range for point estimates
export const PROCESSING_FEE_MID = (product: string): number => {
  const range = PROCESSING_FEE_RANGE[product] ?? [0.01, 0.025];
  return (range[0] + range[1]) / 2;
};

// ── Confidence Rules ──────────────────────────────────────────────────────────
// Source: My judgement. Per-output, never a single blended score.
export const CONFIDENCE_THRESHOLDS = {
  high: 0,    // 0 missing material inputs
  medium: 2,  // 1–2 missing material inputs
  low: 3,     // 3+ missing OR any heavily-weighted input missing
} as const;
