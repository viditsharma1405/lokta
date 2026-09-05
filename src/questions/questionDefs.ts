// ─────────────────────────────────────────────────────────────────────────────
// Question Definitions — Core Questions + Truthful Adaptive Branching Engine
// Every question has condition(answers), affects[], whyWeAsk, and reason per RULES.md.
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'select'
  | 'number'
  | 'currency'
  | 'range'
  | 'boolean'
  | 'select_or_unknown';

export interface QuestionOption {
  value: string;
  label: string;
  helpText?: string;
}

export type AnswersMap = Record<string, string | number | null | undefined>;

export interface QuestionDef {
  id: string;
  label: string;
  helpText?: string;
  whyWeAsk: string;
  type: QuestionType;
  options?: QuestionOption[];
  placeholder?: string;
  required?: boolean;
  affects: string[];
  reason: string;
  group: 'income' | 'loan' | 'debt' | 'expenses' | 'credit' | 'employment' | 'household';
  allowUnknown?: boolean;
  unknownLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  condition?: (answers: AnswersMap) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 CORE QUESTIONS (Compact Foundation)
// ─────────────────────────────────────────────────────────────────────────────

// Q1: Income Type
export const Q_INCOME_TYPE: QuestionDef = {
  id: 'income_type',
  label: 'What best describes your income?',
  helpText: 'This determines which follow-up questions we ask and which underwriting standard applies.',
  whyWeAsk: 'Salaried, self-employed, and informal borrowers face different lender FOIR limits (50% vs 45% vs 35%) and retention bases.',
  type: 'select',
  options: [
    { value: 'salaried', label: 'Salaried' },
    { value: 'self_employed', label: 'Self-employed / Business owner' },
    { value: 'informal', label: 'Informal / Gig / Variable' },
  ],
  required: true,
  affects: ['lenderCapacity', 'safeCapacity', 'fairRate', 'productRoute'],
  reason: 'Determines the FOIR applied (50% salaried vs 45%/35% SE vs 35% informal), base retention, and documentation expectations.',
  group: 'income',
};

// Q2: Monthly Income
export const Q_MONTHLY_INCOME: QuestionDef = {
  id: 'monthly_income',
  label: 'What is your monthly take-home / typical monthly income?',
  helpText: 'Enter your average net monthly earnings after taxes and business operating costs.',
  whyWeAsk: 'Income forms the mathematical foundation for both lender FOIR and your safe disposable surplus.',
  type: 'currency',
  placeholder: '50,000',
  prefix: '₹',
  required: true,
  affects: ['lenderCapacity', 'safeCapacity', 'stressTest'],
  reason: 'Income is the primary denominator for FOIR debt-service limits and the numerator for safe cash flow.',
  group: 'income',
};

// Q3: Income Stability (NEVER automatically defaulted to stable)
export const Q_INCOME_STABILITY: QuestionDef = {
  id: 'income_stability',
  label: 'How stable is this income?',
  helpText: 'Never infer stability merely from employment type. An informal worker can have steady routes, and a business can fluctuate.',
  whyWeAsk: 'Stable income allows a 50% safe retention base, while variable or seasonal income uses 40% or 35% base retention.',
  type: 'select_or_unknown',
  options: [
    { value: 'stable', label: 'Stable — predictable and consistent month to month' },
    { value: 'moderate', label: 'Somewhat variable — fluctuates with seasons or incentives' },
    { value: 'unstable', label: 'Highly variable / unpredictable earnings' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know / Hard to predict",
  required: false,
  affects: ['safeCapacity', 'fairRate'],
  reason: 'Controls safe retention base (50% stable vs 40% variable / 35% informal) and ±10 rate positioning.',
  group: 'income',
};

// Q4: Purpose
export const Q_LOAN_PURPOSE: QuestionDef = {
  id: 'loan_purpose',
  label: 'What are you borrowing for?',
  helpText: 'Purpose determines the appropriate loan category, tenure limits, and competitive market rate bands.',
  whyWeAsk: 'Home loans or LAP offer lower rates (8.5%–14%) with collateral; personal loans run at 10%–26% unsecured.',
  type: 'select',
  options: [
    { value: 'personal_event', label: 'Personal event / Family need (wedding, emergency)' },
    { value: 'home_purchase', label: 'Home purchase' },
    { value: 'home_renovation', label: 'Home renovation' },
    { value: 'business_expansion', label: 'Business expansion / Working capital / Equipment' },
    { value: 'vehicle', label: 'Vehicle (Scooter / Car / Commercial delivery vehicle)' },
    { value: 'medical', label: 'Medical expenses' },
    { value: 'education', label: 'Education' },
    { value: 'other', label: 'Other personal purpose' },
  ],
  required: true,
  affects: ['productRoute', 'fairRate'],
  reason: 'Routes profile to specific product benchmarks (Home, LAP, Personal, Vehicle, Business, Gold).',
  group: 'loan',
};

// Q5: Requested Amount
export const Q_REQUESTED_AMOUNT: QuestionDef = {
  id: 'requested_amount',
  label: 'How much are you considering borrowing?',
  helpText: 'Enter the principal loan amount you would like to request.',
  whyWeAsk: 'We compare your requested amount against what lenders will offer and what is mathematically safe for your family.',
  type: 'currency',
  placeholder: '5,00,000',
  prefix: '₹',
  required: true,
  affects: ['decision', 'stressTest'],
  reason: 'Comparing requested amount against safe capacity and lender capacity determines the final verdict.',
  group: 'loan',
};

// Q6: Existing EMIs (Allows ₹0 and "I don't know")
export const Q_EXISTING_EMI: QuestionDef = {
  id: 'existing_emi',
  label: 'What existing EMIs do you currently pay each month?',
  helpText: 'Include all running vehicle, personal, or consumer loans. Enter ₹0 if you currently have no loans.',
  whyWeAsk: 'Existing loan payments directly reduce the debt-service room available for a new loan.',
  type: 'currency',
  placeholder: '0',
  prefix: '₹',
  allowUnknown: true,
  unknownLabel: "I'm not sure / I don't know",
  affects: ['lenderCapacity', 'safeCapacity', 'stressTest'],
  reason: 'Directly subtracted from max debt service. If unknown, conservative default is applied with documented assumption.',
  group: 'debt',
};

// Q7: Essential Household Expenses (Allows exact amount or "I don't know")
export const Q_ESSENTIAL_EXPENSES: QuestionDef = {
  id: 'essential_expenses',
  label: 'Approximately how much do you spend each month on essential household expenses?',
  helpText: 'Rent, groceries, utilities, school fees, transport, medicine — living costs you cannot skip.',
  whyWeAsk: 'This tells us what remains as genuine disposable surplus before any debt is taken on.',
  type: 'currency',
  placeholder: '25,000',
  prefix: '₹',
  allowUnknown: true,
  unknownLabel: "I don't know exact amount",
  affects: ['safeCapacity', 'stressTest'],
  reason: 'Essential expenses establish disposable cash flow (income − expenses − debt). If unknown, triggers coarse bucket fallback.',
  group: 'expenses',
};

// Q8: High-Cost Debt Presence
export const Q_HIGH_COST_DEBT: QuestionDef = {
  id: 'high_cost_debt',
  label: 'Do you currently have high-cost debt (around 30% APR or higher)?',
  helpText: 'Credit card balances carried month-to-month, instant loan apps, or local moneylenders at 2.5%+ monthly interest.',
  whyWeAsk: 'High-cost debt carries aggressive compounding. A burden ≥30% of income is a mandatory hard stop (DON’T BORROW).',
  type: 'select_or_unknown',
  options: [
    { value: 'none', label: 'No — I have no high-cost debt' },
    { value: 'has_debt', label: 'Yes — I have running high-cost loans or card debt' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know / Not sure",
  required: true,
  affects: ['decision', 'safeCapacity', 'fairRate'],
  reason: 'Triggers hard-stop rules (≥30% burden or ≥15% + bounce) or soft-signal risk penalties.',
  group: 'debt',
};

// Q9: Payment Bounce Recently? (NEVER infer clean history from silence)
export const Q_RECENT_BOUNCE: QuestionDef = {
  id: 'recent_bounce',
  label: 'Have you had an EMI/payment bounce or missed payment recently?',
  helpText: 'In the last 3–6 months. We do NOT infer a clean repayment record from silence.',
  whyWeAsk: 'A recent bounce signals acute cash flow distress. Combined with high-cost debt, it triggers an immediate DON’T BORROW verdict.',
  type: 'select_or_unknown',
  options: [
    { value: 'no', label: 'No — all payments have been on time' },
    { value: 'yes', label: 'Yes — missed or bounced a payment recently' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know / Never had a loan before",
  required: true,
  affects: ['decision', 'safeCapacity', 'fairRate'],
  reason: 'A bounce adds +20 rate points, −10 retention factor points, and can trigger mandatory hard stops.',
  group: 'credit',
};

// Q10: Credit Score (Optional, does not block)
export const Q_CREDIT_SCORE: QuestionDef = {
  id: 'credit_score',
  label: 'What is your credit score, if known?',
  helpText: 'CIBIL / Experian score from your banking app. This is optional and will not block your assessment.',
  whyWeAsk: 'Score ≥700 qualifies for prime bank-tier rates (10%–16%); lower scores or unknown route to NBFC tiers.',
  type: 'select_or_unknown',
  options: [
    { value: '800', label: '750 or above (Prime / Excellent)' },
    { value: '725', label: '700–749 (Good — Bank tier eligible)' },
    { value: '675', label: '650–699 (Fair — NBFC tier)' },
    { value: '600', label: '550–649 (Below average)' },
    { value: '500', label: 'Below 550 (Poor)' },
    { value: 'thin_file', label: 'I have never borrowed before (Thin file / No credit history)' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know my score",
  required: false,
  affects: ['fairRate', 'confidence'],
  reason: 'Scores ≥700 qualify for bank pricing. Unknown score adds zero penalty but widens the rate band and lowers confidence.',
  group: 'credit',
};

// ── Array of core questions ──────────────────────────────────────────────────
export const MUST_QUESTIONS: QuestionDef[] = [
  Q_INCOME_TYPE,
  Q_MONTHLY_INCOME,
  Q_INCOME_STABILITY,
  Q_LOAN_PURPOSE,
  Q_REQUESTED_AMOUNT,
  Q_EXISTING_EMI,
  Q_ESSENTIAL_EXPENSES,
  Q_HIGH_COST_DEBT,
  Q_RECENT_BOUNCE,
  Q_CREDIT_SCORE,
];

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTIVE FOLLOW-UP QUESTIONS (Triggered strictly when conditions match)
// ─────────────────────────────────────────────────────────────────────────────

// Follow-up 7A: Coarse Expense Bucket (Triggered only when Q7 essential_expenses is unknown)
export const EXPENSE_BUCKET_QUESTION: QuestionDef = {
  id: 'expense_bucket',
  label: 'Roughly, are your monthly essential household expenses closer to:',
  helpText: 'Pick the closest range — even an approximate range gives you a much safer borrowing ceiling than a blind default.',
  whyWeAsk: 'Allows us to replace a blanket 55%/65% assumption with your actual living bracket.',
  type: 'select',
  options: [
    { value: '15000', label: 'Under ₹20,000/month (Around ₹15,000)' },
    { value: '25000', label: '₹20,000 to ₹35,000/month (Around ₹25,000)' },
    { value: '45000', label: '₹35,000 to ₹55,000/month (Around ₹45,000)' },
    { value: '70000', label: 'More than ₹55,000/month (Around ₹70,000+)' },
  ],
  allowUnknown: true,
  unknownLabel: "I really can't estimate (use conservative regional baseline)",
  condition: answers => answers.essential_expenses === 'unknown',
  affects: ['safeCapacity'],
  reason: 'Provides a borrower-informed coarse bucket, avoiding a manufactured precision error.',
  group: 'expenses',
};

// Follow-up 8A: High-Cost Debt Outstanding (Triggered when Q8 is has_debt)
export const Q_HIGH_COST_DEBT_AMOUNT: QuestionDef = {
  id: 'high_cost_debt_amount',
  label: 'What is the total outstanding balance on your high-cost debt?',
  helpText: 'Total principal you currently owe across all credit cards, instant apps, and high-interest moneylenders.',
  whyWeAsk: 'The total balance determines your debt-to-income severity ratio.',
  type: 'currency',
  placeholder: '35,000',
  prefix: '₹',
  required: true,
  condition: answers => answers.high_cost_debt === 'has_debt',
  affects: ['decision', 'safeCapacity'],
  reason: 'Used to calculate high-cost debt burden as a percentage of income and fallback monthly payment.',
  group: 'debt',
};

// Follow-up 8B: High-Cost Debt Monthly Payment (Triggered when Q8 is has_debt)
export const Q_HIGH_COST_DEBT_MONTHLY: QuestionDef = {
  id: 'high_cost_debt_monthly',
  label: 'How much do you pay each month toward this high-cost debt?',
  helpText: 'If unknown, we use the conservative market fallback: outstanding balance × 25%, showing a 15%–30% uncertainty range.',
  whyWeAsk: 'Monthly debt service directly reduces cash flow available for living and new loans.',
  type: 'currency',
  placeholder: '8,750',
  prefix: '₹',
  allowUnknown: true,
  unknownLabel: "I don't know my exact monthly payment (use 25% fallback rule)",
  condition: answers => answers.high_cost_debt === 'has_debt',
  affects: ['safeCapacity', 'decision', 'stressTest'],
  reason: 'Monthly cash drain. Unknown triggers the frozen 25% fallback with 15%–30% range and LOW confidence.',
  group: 'debt',
};

export const HIGH_COST_DEBT_QUESTIONS: QuestionDef[] = [
  Q_HIGH_COST_DEBT_AMOUNT,
  Q_HIGH_COST_DEBT_MONTHLY,
];

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH A: SALARIED ADAPTIVE FOLLOW-UPS
// ─────────────────────────────────────────────────────────────────────────────

export const Q_EMPLOYMENT_TENURE: QuestionDef = {
  id: 'employment_tenure',
  label: 'How long have you been with your current employer?',
  helpText: 'Stability with an employer improves lender comfort and can narrow your rate band.',
  whyWeAsk: 'Lenders view >3 years at an employer as prime stability, reducing risk premiums.',
  type: 'select',
  options: [
    { value: 'lt_6mo', label: 'Less than 1 year (<1 yr)' },
    { value: '1_3yr', label: '1 to 3 years' },
    { value: '3_5yr', label: '3 to 5 years' },
    { value: 'gt_5yr', label: 'More than 5 years (5+ yrs)' },
  ],
  allowUnknown: true,
  unknownLabel: 'Prefer not to say',
  condition: answers => answers.income_type === 'salaried',
  affects: ['confidence'],
  reason: 'Provides context on job continuity and helps gauge underwriting readiness for lenders.',
  group: 'employment',
};

export const Q_VARIABLE_INCOME_SHARE: QuestionDef = {
  id: 'variable_income_share',
  label: 'What percentage of your salary is variable (bonuses, commissions, incentives)?',
  helpText: 'If more than 30% of your earnings is variable, a safety buffer is applied to your safe capacity.',
  whyWeAsk: 'Volatile bonuses cannot be relied upon to service fixed monthly loan commitments.',
  type: 'select',
  options: [
    { value: '0', label: 'None — 100% fixed salary (0%)' },
    { value: '15', label: 'About 10%–20% variable' },
    { value: '30', label: 'About 20%–30% variable' },
    { value: '50', label: 'More than 30% variable (Commission / Incentive heavy)' },
  ],
  condition: answers =>
    answers.income_type === 'salaried' &&
    (answers.income_stability === 'moderate' || answers.income_stability === 'unstable'),
  affects: ['safeCapacity'],
  reason: 'Variable pay >30% applies a −5pp retention adjustment so bonuses are not over-committed to EMIs.',
  group: 'employment',
};

export const SALARIED_QUESTIONS: QuestionDef[] = [
  Q_EMPLOYMENT_TENURE,
  Q_VARIABLE_INCOME_SHARE,
];

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH B & C: SELF-EMPLOYED / BUSINESS ADAPTIVE FOLLOW-UPS
// ─────────────────────────────────────────────────────────────────────────────

export const Q_BUSINESS_TENURE: QuestionDef = {
  id: 'business_tenure',
  label: 'How long have you been running this business?',
  helpText: 'Years in continuous commercial operation.',
  whyWeAsk: 'Business vintage ≥3 years proves economic viability, unlocking higher income recognition tiers.',
  type: 'select',
  options: [
    { value: '0.5', label: 'Less than 1 year (<1 yr)' },
    { value: '2', label: '1 to 3 years' },
    { value: '4', label: '3 to 5 years' },
    { value: '8', label: 'More than 5 years (5+ yrs)' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know / Not sure",
  condition: answers => answers.income_type === 'self_employed',
  affects: ['income', 'lenderCapacity', 'fairRate'],
  reason: 'Business tenure ≥3 years qualifies for midpoint income recognition and Tier 1/2 documentation tiers.',
  group: 'employment',
};

export const Q_SE_DOC_TYPE: QuestionDef = {
  id: 'se_doc_type',
  label: 'How do you document your business income?',
  helpText: 'Select the primary records you have available to present to lenders.',
  whyWeAsk: 'Determines whether we evaluate your income via annual ITR, monthly business records, or cash assessment.',
  type: 'select',
  options: [
    { value: 'itr', label: 'ITR (Income Tax Returns)' },
    { value: 'records', label: 'Bank statements / business records' },
    { value: 'both', label: 'Both ITR and bank statements / business records' },
    { value: 'none', label: 'Not documented / Cash only' },
  ],
  condition: answers => answers.income_type === 'self_employed',
  affects: ['lenderCapacity', 'fairRate'],
  reason: 'Routes to the specific documentation question needed without redundant asking.',
  group: 'income',
};

export const Q_DOCUMENTED_INCOME_SE: QuestionDef = {
  id: 'documented_monthly_income',
  label: 'How much of this monthly income can you support with records?',
  helpText: 'Examples: current account bank statements, GST returns, or commercial invoices / bills.',
  whyWeAsk: 'Documented income receives 100% lender recognition. Undocumented cash surplus receives conservative tiered recognition.',
  type: 'currency',
  placeholder: '35,000',
  prefix: '₹',
  suffix: '/month',
  allowUnknown: true,
  unknownLabel: "I don't have formal records / All cash (₹0 documented)",
  condition: answers =>
    answers.income_type === 'self_employed' &&
    (answers.se_doc_type === 'records' || answers.se_doc_type === 'both' || !answers.se_doc_type),
  affects: ['lenderCapacity', 'confidence'],
  reason: 'Documented portion is recognized at 100%; undocumented portion receives 75%/50%/25% tiered recognition.',
  group: 'income',
};

export const Q_DOCUMENTED_INCOME_ITR: QuestionDef = {
  id: 'documented_income_itr',
  label: 'What is your annual income declared in your latest ITR (if filed)?',
  helpText: 'Annual ITR taxable profit is normalized to a monthly figure (Annual ITR / 12).',
  whyWeAsk: 'ITR is the gold standard for prime lender underwriting.',
  type: 'currency',
  placeholder: '4,20,000',
  prefix: '₹',
  suffix: '/year',
  allowUnknown: true,
  unknownLabel: "I don't file ITR",
  condition: answers =>
    answers.income_type === 'self_employed' &&
    (answers.se_doc_type === 'itr' || answers.se_doc_type === 'both' || !answers.se_doc_type),
  affects: ['lenderCapacity', 'fairRate'],
  reason: 'Annual ITR / 12 establishes formal documented income baseline.',
  group: 'income',
};

export const SELF_EMPLOYED_QUESTIONS: QuestionDef[] = [
  Q_BUSINESS_TENURE,
  Q_SE_DOC_TYPE,
  Q_DOCUMENTED_INCOME_SE,
  Q_DOCUMENTED_INCOME_ITR,
];

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH D: INFORMAL / GIG ADAPTIVE FOLLOW-UPS
// ─────────────────────────────────────────────────────────────────────────────

export const Q_INFORMAL_RECORDS: QuestionDef = {
  id: 'documentation_status',
  label: 'Do you have records that show your earnings?',
  helpText: 'Bank account deposits, platform payout statements (Swiggy/Zomato/Uber), customer invoices, or diary receipts. We will NOT ask an informal worker for an ITR by default.',
  whyWeAsk: 'Informal workers with corroborating digital records receive 50%–75% lender recognition instead of 25% weak recognition.',
  type: 'select',
  options: [
    { value: 'partial', label: 'Yes — I have bank deposits or app platform statements' },
    { value: 'none', label: 'No formal records — cash wages / unrecorded income' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know / Not sure what counts",
  condition: answers => answers.income_type === 'informal',
  affects: ['lenderCapacity', 'fairRate', 'confidence'],
  reason: 'Determines whether documented income can be recognized by lenders without arbitrary assumptions.',
  group: 'credit',
};

export const Q_INFORMAL_SUPPORTED_AMOUNT: QuestionDef = {
  id: 'documented_monthly_income',
  label: 'Approximately how much monthly income is reflected in those records?',
  helpText: 'Your typical monthly bank credits or platform earnings summary.',
  whyWeAsk: 'Recorded earnings are recognized at full value by modern lenders; purely unrecorded cash is treated conservatively.',
  type: 'currency',
  placeholder: '15,000',
  prefix: '₹',
  suffix: '/month',
  allowUnknown: true,
  unknownLabel: "I don't know exact amount",
  condition: answers => answers.income_type === 'informal' && answers.documentation_status === 'partial',
  affects: ['lenderCapacity', 'confidence'],
  reason: 'Sets the documented portion for gig workers.',
  group: 'income',
};

export const INFORMAL_QUESTIONS: QuestionDef[] = [
  Q_INFORMAL_RECORDS,
  Q_INFORMAL_SUPPORTED_AMOUNT,
];

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH E: BUSINESS PURPOSE & COLLATERAL (LAP / Secured Routing)
// ─────────────────────────────────────────────────────────────────────────────

export const Q_COLLATERAL_AVAILABLE: QuestionDef = {
  id: 'collateral_available',
  label: 'Do you have collateral you could potentially use for a secured loan?',
  helpText: 'Pledging commercial or residential property or gold allows Loan Against Property (LAP) or Gold Loan with longer tenures and lower interest rates.',
  whyWeAsk: 'Unsecured business loans cost 17%–28%. LAP or Gold loans cost 9.5%–15% and support much higher borrowing amounts.',
  type: 'select',
  options: [
    { value: 'property_commercial', label: 'Yes — Commercial property (Shop, office, warehouse)' },
    { value: 'property_residential', label: 'Yes — Residential house / flat' },
    { value: 'gold', label: 'Yes — Gold jewellery / ornaments' },
    { value: 'none', label: 'No collateral — seeking an unsecured loan only' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know if my assets qualify",
  condition: answers =>
    answers.income_type === 'self_employed' &&
    answers.loan_purpose === 'business_expansion',
  affects: ['productRoute', 'lenderCapacity', 'fairRate'],
  reason: 'Routes self-employed borrowers to LAP/Gold loan products, enabling LTV evaluation and 60% secured FOIR.',
  group: 'loan',
};

export const Q_GOLD_COLLATERAL: QuestionDef = {
  id: 'gold_collateral',
  label: 'Would you be willing to pledge your gold for this loan?',
  helpText: 'Pledging gold provides fast access to secured Gold Loans with lower interest rates (9%–16%) than unsecured personal loans (11%–26%).',
  whyWeAsk: 'Gold loans are available across salaried, self-employed, and informal borrowers. We only recommend a Gold Loan if you are open to pledging your ornaments.',
  type: 'select',
  options: [
    { value: 'yes', label: "Yes — I'm open to a Gold Loan" },
    { value: 'no', label: 'No — I want an unsecured loan' },
    { value: 'not_sure', label: 'Not sure' },
  ],
  allowUnknown: false,
  condition: answers =>
    answers.loan_purpose === 'personal_event' ||
    answers.loan_purpose === 'medical' ||
    answers.loan_purpose === 'other' ||
    answers.loan_purpose === 'education' ||
    answers.loan_purpose === 'home_renovation' ||
    (answers.loan_purpose === 'business_expansion' && answers.collateral_available === 'gold'),
  affects: ['productRoute', 'lenderCapacity', 'fairRate'],
  reason: 'Determines willingness to pledge gold; routes to Gold Loan only if willing.',
  group: 'loan',
};

export const Q_COLLATERAL_VALUE: QuestionDef = {
  id: 'collateral_value',
  label: 'What is the approximate market value of your collateral property/gold?',
  helpText: 'Conservative estimate. Lenders apply an initial 20% haircut and an LTV ceiling (e.g. 65% for commercial, 75% for residential/gold).',
  whyWeAsk: 'LTV-supported principal is calculated as: Collateral Value × (1 − 20% Haircut) × LTV.',
  type: 'currency',
  placeholder: '45,00,000',
  prefix: '₹',
  allowUnknown: true,
  unknownLabel: "I don't know exact valuation",
  condition: answers => {
    const col = answers.collateral_available;
    return (
      col === 'property_commercial' ||
      col === 'property_residential' ||
      (col === 'gold' && answers.gold_collateral === 'yes') ||
      answers.gold_collateral === 'yes'
    );
  },
  affects: ['lenderCapacity'],
  reason: 'Collateral value × (1 − haircut) × LTV sets the LTV-supported borrowing ceiling.',
  group: 'loan',
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH F: CO-APPLICANT (Explicit Confirmation Required)
// ─────────────────────────────────────────────────────────────────────────────

export const Q_CO_APPLICANT: QuestionDef = {
  id: 'co_applicant',
  label: 'Will another person formally apply with you as a co-applicant?',
  helpText: 'IMPORTANT: A spouse or family member is NOT a co-applicant unless they formally sign and provide documented income.',
  whyWeAsk: 'A formal co-applicant adds their documented earnings to both lender FOIR and safe debt capacity.',
  type: 'select',
  options: [
    { value: 'no', label: 'No — I am applying alone as a single borrower' },
    { value: 'yes', label: 'Yes — a spouse or family member will formally co-apply' },
  ],
  allowUnknown: true,
  unknownLabel: 'Undecided / Not sure',
  condition: () => true, // Asked in household sharpening section
  affects: ['lenderCapacity', 'safeCapacity'],
  reason: 'Never infer co-applicant income from household members. Requires explicit opt-in.',
  group: 'household',
};

export const Q_CO_APPLICANT_INCOME: QuestionDef = {
  id: 'co_applicant_income',
  label: 'Approximately how much monthly documented income will the co-applicant contribute?',
  helpText: 'Their reported salary, ITR income, or bank-recorded earnings.',
  whyWeAsk: 'This documented income is added directly to both lender FOIR capacity and safe disposable cash flow.',
  type: 'currency',
  placeholder: '18,000',
  prefix: '₹',
  suffix: '/month',
  condition: answers => answers.co_applicant === 'yes',
  affects: ['lenderCapacity', 'safeCapacity'],
  reason: 'Added at 100% value to both lender and safe income.',
  group: 'household',
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH G: DEPENDENTS & OTHER EARNER (>2 Dependents + No Other Earner Rule)
// ─────────────────────────────────────────────────────────────────────────────

export const Q_DEPENDENTS: QuestionDef = {
  id: 'dependents',
  label: 'How many people financially depend on your income?',
  helpText: 'Children, non-working spouse, elderly parents — anyone relying on your earnings for daily essentials.',
  whyWeAsk: 'Higher dependent counts with no second earner leave little financial slack during an unexpected emergency.',
  type: 'number',
  placeholder: '0',
  min: 0,
  max: 15,
  condition: () => true,
  affects: ['safeCapacity'],
  reason: 'More than 2 dependents with no other earner reduces the safe retention factor by 5 percentage points.',
  group: 'household',
};

export const Q_OTHER_EARNER: QuestionDef = {
  id: 'other_earner',
  label: 'Is there another regular earner in the household?',
  helpText: 'Another working family member whose income helps share living expenses.',
  whyWeAsk: 'A second earner provides a cushion so that having >2 dependents does not impair your safe loan capacity.',
  type: 'select',
  options: [
    { value: 'yes', label: 'Yes — another household member earns regularly' },
    { value: 'no', label: 'No — I am the sole financial provider' },
  ],
  condition: answers => Number(answers.dependents ?? 0) > 2,
  affects: ['safeCapacity'],
  reason: 'Only asked if dependents >2. If NO other earner, activates the −5pp safe retention adjustment.',
  group: 'household',
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH H & I: EMERGENCY SAVINGS & UPCOMING LARGE EXPENSE
// ─────────────────────────────────────────────────────────────────────────────

export const Q_EMERGENCY_SAVINGS: QuestionDef = {
  id: 'emergency_savings',
  label: 'How many months of essential expenses could you cover from savings?',
  helpText: 'If your income were temporarily interrupted today, how long could your liquid savings sustain necessities?',
  whyWeAsk: 'Savings act as an insurance buffer: <1 month reduces safe capacity (−5pp); >6 months increases it (+5pp).',
  type: 'select_or_unknown',
  options: [
    { value: '0', label: 'Less than 1 month (<1 mo) — No emergency buffer' },
    { value: '2', label: '1 to 3 months' },
    { value: '4', label: '3 to 6 months' },
    { value: '9', label: 'More than 6 months (>6 mo) — Strong emergency cushion' },
  ],
  allowUnknown: true,
  unknownLabel: "I don't know / Prefer not to say (No adjustment, wider band)",
  condition: () => true,
  affects: ['safeCapacity'],
  reason: '<1 month: −5pp retention. >6 months: +5pp retention. Unknown: 0pp adjustment with wider confidence.',
  group: 'household',
};

export const Q_UPCOMING_LARGE_EXPENSE: QuestionDef = {
  id: 'upcoming_large_expense',
  label: 'Do you expect a large unavoidable expense in the next 6–12 months?',
  helpText: 'Wedding, medical surgery, home repair, education admission, or major family commitment.',
  whyWeAsk: 'Predictable large expenses must be pre-funded from cash flow rather than layered under new debt.',
  type: 'select_or_unknown',
  options: [
    { value: 'no', label: 'No — no major lump-sum expenses anticipated' },
    { value: 'yes', label: 'Yes — expecting a significant unavoidable expense' },
  ],
  allowUnknown: true,
  unknownLabel: 'Not sure',
  condition: () => true,
  affects: ['safeCapacity'],
  reason: 'Upcoming expense applies a −5pp retention adjustment to preserve liquidity for the anticipated event.',
  group: 'household',
};

// Generic Documented Monthly Income Question (for general use)
export const DOCUMENTED_MONTHLY_INCOME_QUESTION: QuestionDef = {
  id: 'documented_monthly_income',
  label: 'How much of this monthly income can you support with records?',
  helpText: 'Examples: ITR, bank statements, invoices, salary slips, or other reliable proof.',
  whyWeAsk: 'Documented income receives full lender recognition; unrecorded cash is treated conservatively based on evidence.',
  type: 'currency',
  placeholder: '40,000',
  prefix: '₹',
  suffix: '/month',
  allowUnknown: true,
  unknownLabel: "I don't know how much is documented",
  condition: () => true,
  affects: ['lenderCapacity', 'confidence'],
  reason: 'Documented portion is recognized at 100%; undocumented portion receives conservative treatment.',
  group: 'income',
};

export const CROSS_CUTTING_QUESTIONS: QuestionDef[] = [
  Q_CO_APPLICANT,
  Q_CO_APPLICANT_INCOME,
  Q_DEPENDENTS,
  Q_OTHER_EARNER,
  Q_EMERGENCY_SAVINGS,
  Q_UPCOMING_LARGE_EXPENSE,
];

// Master list of all questions for engine lookup
export const ALL_QUESTIONS: QuestionDef[] = [
  ...MUST_QUESTIONS,
  EXPENSE_BUCKET_QUESTION,
  ...HIGH_COST_DEBT_QUESTIONS,
  ...SALARIED_QUESTIONS,
  ...SELF_EMPLOYED_QUESTIONS,
  ...INFORMAL_QUESTIONS,
  Q_COLLATERAL_AVAILABLE,
  Q_COLLATERAL_VALUE,
  ...CROSS_CUTTING_QUESTIONS,
];

/**
 * Returns whether a question should be actively visible given the borrower's answers so far.
 */
export function isQuestionActive(question: QuestionDef, answers: AnswersMap): boolean {
  if (!question.condition) return true;
  return question.condition(answers);
}
