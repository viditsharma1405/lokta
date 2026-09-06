// ─────────────────────────────────────────────────────────────────────────────
// Demo Personas — Priya, Ravi, Anita
// These are pre-normalized BorrowerProfiles fed through the real engine.
// Every value is tagged with its data source per Stage 2.5 Section 13–15.
//
// IMPORTANT: These must match Stage 2.5's corrected walkthrough figures.
// Anita's high-cost-debt EMI = ₹8,750 (₹35,000 × 25%), NOT ₹6,000.
// Anita's disposable = ₹26,000 − ₹16,900 − ₹8,750 = ₹350 (Stage 3 correction).
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';

/** Priya Sharma — Salaried IT, 5yr tenure, credit score 780, requesting ₹8L */
export const PERSONA_PRIYA: BorrowerProfile = {
  incomeType: 'salaried',
  loanPurpose: 'personal_event',
  requestedAmount: 800000,

  // Income — FACT (Lokta)
  documentedIncome: 110000,       // salary ₹1,10,000/month
  claimedTotalIncome: 110000,     // same (fully documented)
  undocumentedPortion: 0,
  eligibleIncomeLender: 110000,   // DERIVED
  eligibleIncomeSafe: 110000,     // DERIVED

  // Debt — FACT (Lokta)
  existingEMI: 14000,             // car EMI ₹14,000
  existingEMIIsDefaulted: false,
  businessDebtEMI: 0,
  highCostDebtEMI: 0,
  highCostDebtEMIIsDefaulted: false,
  highCostDebtOutstanding: 0,

  // Expenses — ASSUMPTION (Lokta doesn't itemize beyond rent ₹28,000; ₹20k other assumed)
  essentialExpenses: 48000,       // rent ₹28,000 + other ₹20,000
  essentialExpensesIsDefaulted: false,

  // Collateral — FACT (none offered)
  collateral: { type: 'none', statedValue: null },

  // Credit — FACT (Lokta: 780)
  creditScore: 780,
  creditScoreStatus: 'known',
  repaymentHistory: 'clean',      // USER ANSWER (implied by salaried 5yr)
  recentBounce: false,

  // Stability — USER ANSWER (implied)
  incomeStability: 'stable',
  documentationStatus: 'full',

  // Household
  dependents: 0,
  hasOtherEarner: false,
  coApplicantIncome: 0,
  emergencySavingsMonths: null,   // genuinely unknown
  upcomingLargeExpense: false,

  // Employment
  employmentTenure: 'gt_5yr',
  variableIncomeComponent: 'low',        // DEMO FACT: Salaried steady take-home (0–10% variable)
  variableIncomeShare: 0,

  isProductiveLoan: false,
};

/** Ravi Kumar — Self-employed kirana, 14yr business, ITR ₹4.2L/yr, shop ₹45L */
export const PERSONA_RAVI: BorrowerProfile = {
  incomeType: 'self_employed',
  loanPurpose: 'business_expansion',
  requestedAmount: 1500000,

  // Income — FACT (Lokta): ITR ₹4.2L/yr → ₹35k/month documented
  documentedIncome: 35000,               // ITR monthly = 420000/12
  claimedTotalIncome: 60000,             // midpoint of ₹40–80k range (SE tenure ≥3yr) — DERIVED
  undocumentedPortion: 25000,            // 60000 − 35000 — DERIVED

  // Lender: secured (LAP), haircut 40%: 35000 + 0.40×25000 + wife ₹18000
  eligibleIncomeLender: 63000,           // 35000 + 10000 + 18000 — DERIVED
  eligibleIncomeSafe: 78000,             // 60000 + 18000 — DERIVED

  // Debt — FACT (none disclosed)
  existingEMI: 0,
  existingEMIIsDefaulted: false,
  businessDebtEMI: 0,
  highCostDebtEMI: 0,
  highCostDebtEMIIsDefaulted: false,
  highCostDebtOutstanding: 0,

  // Expenses — ASSUMPTION (not provided; 65% of ₹78,000 = ₹50,700)
  essentialExpenses: 50700,              // 0.65 × 78000 = 50700 — DERIVED
  essentialExpensesIsDefaulted: true,
  essentialExpensesRange: {
    low: 78000 * 0.50,                   // 65% − 15pp
    high: 78000 * 0.80,                  // 65% + 15pp
  },

  // Collateral — FACT (Lokta: shop ₹45L unencumbered, commercial)
  collateral: { type: 'property_commercial', statedValue: 4500000, willingToPledge: 'yes' },

  // Credit — thin file (no credit history) — FACT (Lokta)
  creditScore: null,
  creditScoreStatus: 'thin_file',
  repaymentHistory: 'clean',             // ASSUMPTION: Clean repayment is assumed for Ravi's baseline demo walkthrough; if unknown, it would widen the rate band without a -5pt discount.
  recentBounce: false,

  // Stability — ASSUMPTION (14-yr tenure implies steady, not explicitly stated)
  incomeStability: 'stable',
  documentationStatus: 'partial',        // ITR exists but below claimed cash

  // Household — Demo assumption: spouse is treated as a co-applicant.
  dependents: 0,
  hasOtherEarner: true,                  // wife earns ₹18,000
  coApplicantIncome: 18000,              // Demo assumption: spouse is treated as a co-applicant.
  emergencySavingsMonths: null,          // genuinely unknown
  upcomingLargeExpense: false,

  // Business
  businessTenure: 14,
  variableIncomeComponent: 'moderate',   // DEMO ASSUMPTION: 10–30% seasonal variation in kirana business takings

  isProductiveLoan: true,
  productiveReturnEstimate: undefined,   // not stated — display only
};

/** Anita Devi — Gig/informal, ₹26–30k/month, ₹35k high-cost debt, 2 kids */
export const PERSONA_ANITA: BorrowerProfile = {
  incomeType: 'informal',
  loanPurpose: 'vehicle',
  requestedAmount: 150000,               // ₹1,50,000 scooter

  // Income — FACT (Lokta: ₹26,000–₹30,000; gig → lower bound)
  documentedIncome: 0,                   // no ITR, no payslip — FACT
  claimedTotalIncome: 26000,             // lower bound of range (gig, high volatility) — DERIVED
  undocumentedPortion: 26000,            // 26000 − 0 — DERIVED

  // Lender: completely undocumented unsecured (conservative Tier 3 recognition 25% of ₹26,000 = ₹6,500)
  // Not a blanket 10% haircut and no arbitrary cap. Note: Anita reaches DONT_BORROW due to severe high-cost debt burden (33.65% > 30%).
  eligibleIncomeLender: 6500,            // DERIVED via conservative undocumented weak tier (25%)
  eligibleIncomeSafe: 26000,             // DERIVED

  // High-cost debt — FACT: ₹35,000 outstanding at 30%+ APR
  // Monthly payment — ASSUMPTION: 35000 × 25% = ₹8,750 (app fallback rule)
  highCostDebtOutstanding: 35000,
  highCostDebtEMI: 8750,                 // 35000 × 0.25 — DERIVED via fallback
  highCostDebtEMIIsDefaulted: true,
  highCostDebtEMIRange: { low: 35000 * 0.15, high: 35000 * 0.30 },

  existingEMI: 0,
  existingEMIIsDefaulted: false,
  businessDebtEMI: 0,

  // Expenses — ASSUMPTION: 65% of ₹26,000 = ₹16,900
  essentialExpenses: 16900,              // 0.65 × 26000 — DERIVED
  essentialExpensesIsDefaulted: true,
  essentialExpensesRange: {
    low: 26000 * 0.50,                   // 65% − 15pp → 50%
    high: 26000 * 0.80,                  // 65% + 15pp → 80%
  },

  // Collateral — none (vehicle loan for a new scooter has no prior collateral)
  collateral: { type: 'none', statedValue: null },

  // Credit — FACT (Lokta: no credit history stated → unknown)
  creditScore: null,
  creditScoreStatus: 'unknown',          // not stated — genuinely unknown
  repaymentHistory: 'bounce',            // FACT: one bounce last month
  recentBounce: true,

  // Stability — FACT (gig/informal = unstable)
  incomeStability: 'unstable',
  documentationStatus: 'none',           // no payslip, no ITR

  // Household — FACT: 2 children, husband unemployed 8 months
  dependents: 2,
  hasOtherEarner: false,                 // husband unemployed
  coApplicantIncome: 0,
  emergencySavingsMonths: null,          // genuinely unknown

  upcomingLargeExpense: false,
  variableIncomeComponent: 'high',       // DEMO ASSUMPTION: Gig delivery & tailoring has >30% variable income
  variableIncomeShare: 0.8,              // gig income is highly variable

  isProductiveLoan: false,
};

export const PERSONAS = {
  priya: PERSONA_PRIYA,
  ravi: PERSONA_RAVI,
  anita: PERSONA_ANITA,
} as const;
