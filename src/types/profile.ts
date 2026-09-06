// ─────────────────────────────────────────────────────────────────────────────
// BorrowerProfile — the normalized form of questionnaire answers.
// Unknown values are represented explicitly (null / undefined) — never as 0,
// false, "bad", or minimum credit score unless the frozen rules specify that.
// ─────────────────────────────────────────────────────────────────────────────

export type IncomeType = 'salaried' | 'self_employed' | 'informal' | 'mixed';
export type IncomeStability = 'stable' | 'moderate' | 'unstable' | 'unknown';
export type DocumentationStatus = 'full' | 'partial' | 'none' | 'unknown';
export type RepaymentHistory = 'clean' | 'bounce' | 'unknown';
export type CreditScoreStatus = 'known' | 'thin_file' | 'unknown';
export type VariableIncomeComponent = 'low' | 'moderate' | 'high' | 'unknown';
export type LoanPurpose =
  | 'personal_event'      // wedding, travel
  | 'home_purchase'
  | 'home_renovation'
  | 'business_expansion'
  | 'vehicle'
  | 'medical'
  | 'education'
  | 'other';

export type LoanType =
  | 'personal_loan'
  | 'home_loan'
  | 'lap'               // Loan Against Property
  | 'gold_loan'
  | 'two_wheeler_loan'
  | 'business_loan'
  | 'unknown';

export type CollateralType = 'none' | 'property_residential' | 'property_commercial' | 'gold' | 'other';

// Source metadata: was this number directly entered, assumed, or derived?
export type DataSource = 'FACT' | 'USER_ANSWER' | 'ASSUMPTION' | 'DERIVED';

export interface TaggedValue<T> {
  value: T;
  source: DataSource;
  note?: string;
}

export interface Collateral {
  type: CollateralType;
  statedValue: number | null;  // null = unknown
  willingToPledge?: 'yes' | 'no' | 'not_sure';
}

// ─────────────────────────────────────────────────────────────────────────────
// Core profile — output of the normalization (profile) layer
// ─────────────────────────────────────────────────────────────────────────────
export interface BorrowerProfile {
  // Identity / context
  incomeType: IncomeType;
  loanPurpose: LoanPurpose;
  requestedAmount: number;
  requestedTenureMonths?: number;  // if borrower specifies; otherwise product default used

  // Income (Section 3 frozen rules)
  documentedIncome: number | null;          // ITR / salary / bank statement records (null = genuinely unknown)
  claimedTotalIncome: number;        // what borrower reports (mid-point for SE≥3yr, lower for gig)
  undocumentedPortion: number | null;       // MAX(0, claimed - documented) (null = unknown)
  eligibleIncomeLender: number;      // documented + recognition factor * undocumented
  eligibleIncomeSafe: number;        // claimedTotalIncome (no haircut)

  // Debt
  existingEMI: number;               // total existing monthly EMI (floor 10% of income if unknown)
  existingEMIIsDefaulted: boolean;
  businessDebtEMI: number;           // separate business debt (defaults to 0 if not SE)
  highCostDebtEMI: number;           // EMI on APR≥30% debt
  highCostDebtEMIIsDefaulted: boolean; // true if computed as outstanding × 25%
  highCostDebtEMIRange?: { low: number; high: number }; // shown to borrower when defaulted
  highCostDebtOutstanding: number;   // total outstanding high-cost debt (0 if none)

  // Expenses
  essentialExpenses: number;         // monthly household expenses
  essentialExpensesIsDefaulted: boolean;
  essentialExpensesRange?: { low: number; high: number }; // shown when defaulted

  // Collateral
  collateral: Collateral;

  // Credit & history
  creditScore: number | null;        // null = unknown
  creditScoreStatus: CreditScoreStatus;
  repaymentHistory: RepaymentHistory;
  recentBounce: boolean;

  // Stability & documentation
  incomeStability: IncomeStability;
  documentationStatus: DocumentationStatus;

  // Household
  dependents: number;                // number of dependents
  hasOtherEarner: boolean;           // is there another income earner in the household?
  coApplicantIncome: number;         // 0 if no co-applicant

  // Savings & upcoming
  emergencySavingsMonths: number | null;   // null = genuinely unknown
  upcomingLargeExpense: boolean;

  // Employment context
  employmentTenure?: 'lt_6mo' | '6mo_1yr' | '1_3yr' | '3_5yr' | 'gt_5yr';
  businessTenure?: number;           // years in business

  // Variable income component (self-employed / gig / informal / salaried)
  variableIncomeComponent?: VariableIncomeComponent;

  // Variable income (salaried)
  variableIncomeShare?: number;      // fraction (0–1)

  // Productive return (self-employed / business)
  // NOTE: per frozen rules (Issue 4), this NEVER enters calculation functions.
  // It is stored only for explanation text and Negotiation Card framing.
  isProductiveLoan: boolean;
  productiveReturnEstimate?: number; // ₹/month (display only)
}
