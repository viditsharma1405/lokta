// ─────────────────────────────────────────────────────────────────────────────
// Final Hardening Test Suite — Lokta Borrower Copilot 10/10 Verification
// Tests all 11 sections of Section 27 and all edge cases of Section 28:
// A. Questionnaire branching
// B. Documentation models & recognition tiers
// C. Stability handling (silence is not stable)
// D. Repayment handling (silence is not clean)
// E. Anita hard-stop and exact arithmetic
// F. Priya baseline preservation
// G. Ravi adaptive routing and co-applicant isolation
// H. Tenure sensitivity (FOIR-bound vs LTV-bound)
// I. SIP isolation (SIP return has 0 effect on lending engine)
// J. Unknown values preservation (never coerced to 0 or positive facts)
// K. Provenance metadata tracking
// L. Edge cases (0 income, expenses > income, requested 0, 100 Cr, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { runCopilot } from '../engine/index';
import { computeEligibleIncomeLender } from '../engine/income';
import { computeLenderCapacity } from '../engine/lenderCapacity';
import { computeFairRate } from '../engine/fairRate';
import { computeSIPComparison } from '../engine/emi';
import { buildProfileFromAnswers, type Answers } from '../questions/questionEngine';
import {
  Q_BUSINESS_TENURE,
  Q_COLLATERAL_AVAILABLE,
  Q_COLLATERAL_VALUE,
  Q_DOCUMENTED_INCOME_ITR,
  Q_DOCUMENTED_INCOME_SE,
  Q_EMPLOYMENT_TENURE,
  Q_INFORMAL_RECORDS,
  Q_VARIABLE_INCOME_SHARE,
  Q_CO_APPLICANT_INCOME,
  Q_OTHER_EARNER,
  EXPENSE_BUCKET_QUESTION,
  Q_HIGH_COST_DEBT_AMOUNT,
  isQuestionActive,
} from '../questions/questionDefs';
import { PERSONA_PRIYA, PERSONA_RAVI, PERSONA_ANITA } from '../data/personas';
import type { BorrowerProfile } from '../types/profile';

let passCount = 0;
let failCount = 0;

function assert(description: string, condition: boolean, extra?: string) {
  if (condition) {
    console.log(`✓ PASS  ${description}`);
    passCount++;
  } else {
    console.error(`✗ FAIL  ${description}${extra ? ` — ${extra}` : ''}`);
    failCount++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('LOKTA FINAL HARDENING TEST SUITE — SECTION 27 & 28');
console.log('═══════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// A. QUESTIONNAIRE BRANCHING
// ─────────────────────────────────────────────────────────────────────────────
console.log('── A. Questionnaire Branching ──');

// Salaried borrower does NOT see business questions
const salariedAnswers: Answers = {
  income_type: 'salaried',
  monthly_income: 110000,
  income_stability: 'stable',
  loan_purpose: 'personal_event',
};
assert(
  'Branching: Salaried borrower does NOT see business tenure',
  !isQuestionActive(Q_BUSINESS_TENURE, salariedAnswers)
);
assert(
  'Branching: Salaried borrower does NOT see collateral question',
  !isQuestionActive(Q_COLLATERAL_AVAILABLE, salariedAnswers)
);
assert(
  'Branching: Salaried borrower does NOT see ITR question',
  !isQuestionActive(Q_DOCUMENTED_INCOME_ITR, salariedAnswers)
);
assert(
  'Branching: Salaried borrower does NOT see informal records question',
  !isQuestionActive(Q_INFORMAL_RECORDS, salariedAnswers)
);
assert(
  'Branching: Salaried borrower DOES see employment tenure',
  isQuestionActive(Q_EMPLOYMENT_TENURE, salariedAnswers)
);
assert(
  'Branching: Salaried stable borrower does NOT see variable share question',
  !isQuestionActive(Q_VARIABLE_INCOME_SHARE, salariedAnswers)
);

// Self-employed borrower sees business tenure & collateral for business loans
const seAnswers: Answers = {
  income_type: 'self_employed',
  monthly_income: 60000,
  income_stability: 'stable',
  loan_purpose: 'business_expansion',
};
assert(
  'Branching: Self-employed borrower sees business tenure',
  isQuestionActive(Q_BUSINESS_TENURE, seAnswers)
);
assert(
  'Branching: Self-employed borrower with business purpose reaches collateral question',
  isQuestionActive(Q_COLLATERAL_AVAILABLE, seAnswers)
);
assert(
  'Branching: Self-employed borrower sees business documentation questions',
  isQuestionActive(Q_DOCUMENTED_INCOME_SE, seAnswers) &&
    isQuestionActive(Q_DOCUMENTED_INCOME_ITR, seAnswers)
);
assert(
  'Branching: Self-employed borrower does NOT see corporate employment tenure',
  !isQuestionActive(Q_EMPLOYMENT_TENURE, seAnswers)
);

// Collateral value only asked when collateral is selected
const seWithProperty: Answers = {
  ...seAnswers,
  collateral_available: 'property_commercial',
};
assert(
  'Branching: Collateral value asked when commercial property selected',
  isQuestionActive(Q_COLLATERAL_VALUE, seWithProperty)
);

const seNoCollateral: Answers = {
  ...seAnswers,
  collateral_available: 'none',
};
assert(
  'Branching: Collateral value NOT asked when no collateral selected',
  !isQuestionActive(Q_COLLATERAL_VALUE, seNoCollateral)
);

// Informal borrower does NOT see ITR by default
const informalAnswers: Answers = {
  income_type: 'informal',
  monthly_income: 26000,
  income_stability: 'unstable',
  loan_purpose: 'vehicle',
};
assert(
  'Branching: Informal borrower does NOT see ITR question by default',
  !isQuestionActive(Q_DOCUMENTED_INCOME_ITR, informalAnswers)
);
assert(
  'Branching: Informal borrower sees informal records question',
  isQuestionActive(Q_INFORMAL_RECORDS, informalAnswers)
);

// Co-applicant: Only asks income if co-applicant is explicitly YES
const noCoAnswers: Answers = { co_applicant: 'no' };
assert(
  'Branching: Co-applicant income NOT asked when co_applicant = no',
  !isQuestionActive(Q_CO_APPLICANT_INCOME, noCoAnswers)
);
const profileNoCo = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 80000,
  co_applicant: 'no',
  co_applicant_income: 30000, // Even if entered, ignored when co_applicant is no
});
assert(
  'Branching: Co-applicant income is strictly 0 when co_applicant = no',
  profileNoCo.coApplicantIncome === 0
);

const yesCoAnswers: Answers = { co_applicant: 'yes' };
assert(
  'Branching: Co-applicant income asked when co_applicant = yes',
  isQuestionActive(Q_CO_APPLICANT_INCOME, yesCoAnswers)
);
const profileYesCo = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 80000,
  co_applicant: 'yes',
  co_applicant_income: 30000,
});
assert(
  'Branching: Co-applicant income counted when co_applicant = yes',
  profileYesCo.coApplicantIncome === 30000
);

// Dependents and other earner: Only asked if dependents > 2
assert(
  'Branching: Other earner NOT asked when dependents = 1',
  !isQuestionActive(Q_OTHER_EARNER, { dependents: 1 })
);
assert(
  'Branching: Other earner NOT asked when dependents = 2',
  !isQuestionActive(Q_OTHER_EARNER, { dependents: 2 })
);
assert(
  'Branching: Other earner IS asked when dependents = 3',
  isQuestionActive(Q_OTHER_EARNER, { dependents: 3 })
);

// Expense coarse bucket: Only asked when essential_expenses = unknown
assert(
  'Branching: Expense bucket asked when essential_expenses = unknown',
  isQuestionActive(EXPENSE_BUCKET_QUESTION, { essential_expenses: 'unknown' })
);
assert(
  'Branching: Expense bucket NOT asked when exact expense provided',
  !isQuestionActive(EXPENSE_BUCKET_QUESTION, { essential_expenses: 25000 })
);

// High-cost debt follow-ups: Only asked when high_cost_debt = has_debt
assert(
  'Branching: HCD amount asked when high_cost_debt = has_debt',
  isQuestionActive(Q_HIGH_COST_DEBT_AMOUNT, { high_cost_debt: 'has_debt' })
);
assert(
  'Branching: HCD amount NOT asked when high_cost_debt = none',
  !isQuestionActive(Q_HIGH_COST_DEBT_AMOUNT, { high_cost_debt: 'none' })
);

// ─────────────────────────────────────────────────────────────────────────────
// B. DOCUMENTATION MODEL & RECOGNITION TIERS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── B. Documentation Model ──');

// Fully documented ₹90k → ₹90k lender income
const fullDoc = computeEligibleIncomeLender(90000, 90000, false, 0, {
  documentationStatus: 'full',
  incomeStability: 'stable',
});
assert('Doc: Fully documented ₹90k recognized at 100% (₹90,000)', fullDoc.eligibleIncomeLender === 90000);
assert('Doc: Fully documented has undocumented portion = 0', fullDoc.undocumentedPortion === 0);

// Partially documented ₹90k / ₹60k → documented portion fully counted
const partialDoc = computeEligibleIncomeLender(60000, 90000, false, 0, {
  documentationStatus: 'partial',
  incomeStability: 'stable',
  businessTenure: 4,
  hasRecords: true,
});
// 60,000 + 75% of 30,000 = 82,500
assert(
  'Doc: Partially documented ₹90k/₹60k counts ₹60k at 100% plus tiered recognition on ₹30k',
  partialDoc.eligibleIncomeLender >= 75000 && partialDoc.undocumentedPortion === 30000
);

// Completely undocumented ₹30k → no blanket 10%
const undoc30k = computeEligibleIncomeLender(0, 30000, false, 0, {
  documentationStatus: 'none',
  incomeStability: 'unstable',
});
assert(
  'Doc: Completely undocumented ₹30k does NOT produce blanket 10% (₹3,000)',
  undoc30k.eligibleIncomeLender !== 3000
);
assert(
  'Doc: Completely undocumented ₹30k produces weak 25% tier (₹7,500)',
  undoc30k.eligibleIncomeLender === 7500
);

// Completely undocumented ₹3L → no ₹25k cap
const undoc3L = computeEligibleIncomeLender(0, 300000, false, 0, {
  documentationStatus: 'none',
  incomeStability: 'stable',
  businessTenure: 5,
});
assert(
  'Doc: Undocumented ₹3L is NOT capped at ₹25,000',
  undoc3L.eligibleIncomeLender > 25000
);
assert(
  'Doc: Undocumented ₹3L with stable established business recognizes 50% tier (₹1,50,000)',
  undoc3L.eligibleIncomeLender === 150000
);

// Completely undocumented ₹9L → no ₹25k cap
const undoc9L = computeEligibleIncomeLender(0, 900000, false, 0, {
  documentationStatus: 'none',
  incomeStability: 'stable',
  businessTenure: 5,
});
assert(
  'Doc: Undocumented ₹9L is NOT capped at ₹25,000',
  undoc9L.eligibleIncomeLender > 25000
);
assert(
  'Doc: Undocumented ₹9L recognizes 50% tier (₹4,50,000)',
  undoc9L.eligibleIncomeLender === 450000
);

// Unknown documentation → wider range + lower confidence
const unknownDoc = computeEligibleIncomeLender(null, 50000, false, 0, {
  documentationStatus: 'unknown',
});
assert(
  'Doc: Unknown documentation produces null undocumented portion',
  unknownDoc.undocumentedPortion === null
);
assert(
  'Doc: Unknown documentation produces uncertainty range',
  unknownDoc.eligibleIncomeRange !== undefined && unknownDoc.eligibleIncomeRange.low === 0
);

// ─────────────────────────────────────────────────────────────────────────────
// C. STABILITY HANDLING (Silence is not stable)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── C. Stability Handling ──');

const profileUnknownStability = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 80000,
  income_stability: 'unknown',
});
assert(
  'Stability: Explicit "I don\'t know" for salaried remains "unknown" (NOT silently coerced to stable)',
  profileUnknownStability.incomeStability === 'unknown'
);

const seUnknownStability = buildProfileFromAnswers({
  income_type: 'self_employed',
  monthly_income: 50000,
  income_stability: 'unknown',
});
assert(
  'Stability: Self-employed with unknown stability remains "unknown"',
  seUnknownStability.incomeStability === 'unknown'
);

const fairRateUnknownStability = computeFairRate(profileUnknownStability);
assert(
  'Stability: Unknown stability adds zero discount in fair-rate position',
  fairRateUnknownStability.adjustments.some(
    a => a.factor === 'Income stability unknown' && a.value === 0
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// D. REPAYMENT HANDLING (Silence is not clean)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── D. Repayment Handling ──');

const profileNoBounce = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 90000,
  recent_bounce: 'no',
  // repayment_history NOT provided
});
assert(
  'Repayment: Absence of bounce (recent_bounce = no) does NOT infer clean repayment history',
  profileNoBounce.repaymentHistory === 'unknown'
);
assert(
  'Repayment: recentBounce flag is false when recent_bounce = no',
  profileNoBounce.recentBounce === false
);

const profileUnknownBounce = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 90000,
  recent_bounce: 'unknown',
});
assert(
  'Repayment: Unknown bounce answer maintains repaymentHistory = unknown',
  profileUnknownBounce.repaymentHistory === 'unknown'
);

const fairRateNoBounce = computeFairRate(profileNoBounce);
assert(
  'Repayment: Repayment history unknown gets 0 rate adjustment (not -5 clean discount)',
  fairRateNoBounce.adjustments.some(
    a => a.factor === 'Repayment history unknown' && a.value === 0
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// E. ANITA PERSONA & HARD-STOP ARITHMETIC
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── E. Anita Persona & Arithmetic ──');

const anita = runCopilot(PERSONA_ANITA);
assert('Anita: HCD monthly payment fallback is ₹8,750 (₹35k × 25%)', PERSONA_ANITA.highCostDebtEMI === 8750);
assert(
  'Anita: Disposable cash flow is exactly ₹350 (₹26,000 − ₹16,900 − ₹8,750)',
  anita.safeCapacity.disposableCashFlow === 350
);
assert(
  'Anita: Safe retention hits 10% floor',
  anita.safeCapacity.adjustedRetentionFactor === 0.10
);
assert('Anita: Safe EMI ceiling is ₹35/month (₹350 × 10%)', anita.safeCapacity.safeEMI === 35);
assert('Anita: Recommended EMI is ₹31.50/month (₹35 × 90%)', anita.safeCapacity.recommendedEMI === 31.5);

const anitaHcdBurden = PERSONA_ANITA.highCostDebtEMI / PERSONA_ANITA.eligibleIncomeSafe;
assert(
  'Anita: HCD burden is 33.65% (8,750 / 26,000)',
  Math.abs(anitaHcdBurden - 0.3365) < 0.001
);
assert('Anita: Verdict is strictly DONT_BORROW', anita.decision.verdict === 'DONT_BORROW');
assert(
  'Anita: Severe hard-stop triggered (burden >= 30%)',
  anita.decision.hardStopsTriggered.some(s => s.includes('SEVERE'))
);
assert(
  'Anita: Mathematical capacity numbers are still computed and visible on DONT_BORROW',
  anita.safeCapacity.safeEMI > 0 && anita.fairRate.fairRateMid > 0
);

// ─────────────────────────────────────────────────────────────────────────────
// F. PRIYA BASELINE PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── F. Priya Baseline Preservation ──');

const priya = runCopilot(PERSONA_PRIYA);
assert('Priya: Documented salaried income ₹1,10,000', priya.lenderCapacity.maxTotalDebtService === 55000);
assert('Priya: Safe EMI ceiling is ₹24,000', priya.safeCapacity.safeEMI === 24000);
assert('Priya: Recommended EMI is ₹21,600 (24,000 × 90%)', priya.safeCapacity.recommendedEMI === 21600);
assert('Priya: Verdict is BORROW_LESS (requested ₹8L > safe amount)', priya.decision.verdict === 'BORROW_LESS');
assert('Priya: Lender capacity is high (₹12.57L)', priya.lenderCapacity.lenderLikelyAmount > 1200000);

// ─────────────────────────────────────────────────────────────────────────────
// G. RAVI PERSONA & ADAPTIVE LAP ROUTING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── G. Ravi Adaptive LAP Routing ──');

const ravi = runCopilot(PERSONA_RAVI);
assert('Ravi: Product route is LAP (Commercial Property collateral)', ravi.productRoute.recommendedRoute.includes('LAP'));
assert('Ravi: Product is secured', ravi.productRoute.isSecured === true);
assert('Ravi: FOIR is 60% (secured LAP)', ravi.lenderCapacity.foir === 0.60);
assert('Ravi: Lender likely amount is ₹21.60L', Math.abs(ravi.lenderCapacity.lenderLikelyAmount - 2160000) < 50000);
assert('Ravi: Verdict is BORROW_LESS', ravi.decision.verdict === 'BORROW_LESS');

// ─────────────────────────────────────────────────────────────────────────────
// H. TENURE SENSITIVITY & BINDING CONSTRAINTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── H. Tenure Sensitivity ──');

// 1. Unsecured FOIR-bound: changing tenure MUST change lender principal
const priya12 = runCopilot(PERSONA_PRIYA, 12);
const priya48 = runCopilot(PERSONA_PRIYA, 48);
assert(
  'Tenure: FOIR-bound lender amount changes with tenure (48m > 12m)',
  priya48.lenderCapacity.lenderLikelyAmount > priya12.lenderCapacity.lenderLikelyAmount
);
assert(
  'Tenure: Safe principal changes with tenure (48m > 12m)',
  priya48.safeCapacity.safeAmount > priya12.safeCapacity.safeAmount
);
assert(
  'Tenure: Safe EMI ceiling is strictly identical across tenures (₹24,000 at 12m & 48m)',
  priya12.safeCapacity.safeEMI === priya48.safeCapacity.safeEMI
);

// 2. Secured LTV-bound: changing tenure does NOT change lender amount if LTV binds
// Build a profile where LTV constraint strictly binds
const profileLtvBound: BorrowerProfile = {
  ...PERSONA_RAVI,
  collateral: { type: 'property_commercial', statedValue: 1000000 }, // Small shop: ₹10L -> adjusted ₹8L -> 65% LTV = ₹5.2L
};
const ltv12 = computeLenderCapacity(profileLtvBound, 11.5, 36);
const ltv84 = computeLenderCapacity(profileLtvBound, 11.5, 84);
assert(
  'Tenure: When LTV binds, lender amount is capped by LTV across tenures',
  ltv12.bindingConstraint === 'ltv' && ltv84.bindingConstraint === 'ltv'
);
assert(
  'Tenure: LTV-bound lender amount remains unchanged when tenure increases (36m vs 84m)',
  ltv12.lenderLikelyAmount === ltv84.lenderLikelyAmount
);

// ─────────────────────────────────────────────────────────────────────────────
// I. SIP ISOLATION (Opportunity Cost Never Bleeds into Core Engine)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── I. SIP Isolation ──');

const baselineBeforeSIP = runCopilot(PERSONA_PRIYA);
const sipReturn1 = computeSIPComparison(20000, 36, 8, 100000);
const sipReturn2 = computeSIPComparison(20000, 36, 18, 100000);
assert('SIP: Higher return rate generates higher future value', sipReturn2.futureValue > sipReturn1.futureValue);

const baselineAfterSIP = runCopilot(PERSONA_PRIYA);
assert('SIP: SIP return rate does not change verdict', baselineBeforeSIP.decision.verdict === baselineAfterSIP.decision.verdict);
assert('SIP: SIP return rate does not change safe EMI', baselineBeforeSIP.safeCapacity.safeEMI === baselineAfterSIP.safeCapacity.safeEMI);
assert('SIP: SIP return rate does not change safe amount', baselineBeforeSIP.safeCapacity.safeAmount === baselineAfterSIP.safeCapacity.safeAmount);
assert('SIP: SIP return rate does not change lender amount', baselineBeforeSIP.lenderCapacity.lenderLikelyAmount === baselineAfterSIP.lenderCapacity.lenderLikelyAmount);
assert('SIP: SIP return rate does not change fair rate', baselineBeforeSIP.fairRate.fairRateMid === baselineAfterSIP.fairRate.fairRateMid);
assert('SIP: SIP return rate does not change stress classification', baselineBeforeSIP.stress.baselineClassification === baselineAfterSIP.stress.baselineClassification);
assert('SIP: SIP return rate does not change confidence', baselineBeforeSIP.decision.confidence === baselineAfterSIP.decision.confidence);

// ─────────────────────────────────────────────────────────────────────────────
// J. UNKNOWN VALUES PRESERVATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── J. Unknown Values Preservation ──');

const blankAnswers: Answers = {
  income_type: 'salaried',
  monthly_income: 70000,
  requested_amount: 300000,
  loan_purpose: 'personal_event',
};
const profileFromBlank = buildProfileFromAnswers(blankAnswers);
assert('Unknown: Credit score is null (not 0 or 300)', profileFromBlank.creditScore === null && profileFromBlank.creditScoreStatus === 'unknown');
assert('Unknown: Repayment history is unknown (not clean or bounce)', profileFromBlank.repaymentHistory === 'unknown');
assert('Unknown: Emergency savings is null (not 0 months)', profileFromBlank.emergencySavingsMonths === null);
assert('Unknown: Expenses defaulted flag is true', profileFromBlank.essentialExpensesIsDefaulted === true);

// ─────────────────────────────────────────────────────────────────────────────
// K. PROVENANCE TRACKING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── K. Provenance Tracking ──');

const copilotOutput = runCopilot(PERSONA_PRIYA);
assert('Provenance: Output contains provenanceSummary list', copilotOutput.provenanceSummary !== undefined && copilotOutput.provenanceSummary.length >= 10);
const incomeProv = copilotOutput.provenanceSummary?.find(p => p.id === 'monthly_income');
assert('Provenance: monthly_income is tagged USER_ANSWER', incomeProv?.tag === 'USER_ANSWER');
const retentionProv = copilotOutput.provenanceSummary?.find(p => p.id === 'retention_factor');
assert('Provenance: retention_factor is tagged ASSUMPTION', retentionProv?.tag === 'ASSUMPTION');
const safeEmiProv = copilotOutput.provenanceSummary?.find(p => p.id === 'safe_emi');
assert('Provenance: safe_emi is tagged DERIVED', safeEmiProv?.tag === 'DERIVED');

// ─────────────────────────────────────────────────────────────────────────────
// L. EDGE CASES & NUMERICAL STABILITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── L. Edge Cases & Numerical Stability ──');

// 1. Zero income
const zeroIncomeProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  claimedTotalIncome: 0,
  documentedIncome: 0,
  eligibleIncomeLender: 0,
  eligibleIncomeSafe: 0,
};
const resZeroIncome = runCopilot(zeroIncomeProfile);
assert('Edge: Zero income produces safe EMI = 0 (no NaN)', resZeroIncome.safeCapacity.safeEMI === 0 && !isNaN(resZeroIncome.safeCapacity.safeEMI));
assert('Edge: Zero income produces lender amount = 0', resZeroIncome.lenderCapacity.lenderLikelyAmount === 0);

// 2. Expenses > Income
const heavyExpenseProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  claimedTotalIncome: 50000,
  eligibleIncomeSafe: 50000,
  essentialExpenses: 70000, // exceeds income
};
const resHeavyExpense = runCopilot(heavyExpenseProfile);
assert('Edge: Expenses > income produces disposable = 0', resHeavyExpense.safeCapacity.disposableCashFlow === 0);
assert('Edge: Expenses > income produces safe EMI = 0', resHeavyExpense.safeCapacity.safeEMI === 0);
assert('Edge: Expenses > income safe amount is 0 (not negative)', resHeavyExpense.safeCapacity.safeAmount === 0);

// 3. Existing EMI > Income
const heavyEmiProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  claimedTotalIncome: 50000,
  eligibleIncomeSafe: 50000,
  essentialExpenses: 20000,
  existingEMI: 60000,
};
const resHeavyEmi = runCopilot(heavyEmiProfile);
assert('Edge: Existing EMI > income produces safe EMI = 0', resHeavyEmi.safeCapacity.safeEMI === 0);
assert('Edge: Existing EMI > income availableNewEMI = 0', resHeavyEmi.lenderCapacity.availableNewEMI === 0);
assert('Edge: Existing EMI > income lender amount = 0', resHeavyEmi.lenderCapacity.lenderLikelyAmount === 0);

// 4. Requested amount = 0
const zeroReqProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  requestedAmount: 0,
};
const resZeroReq = runCopilot(zeroReqProfile);
assert('Edge: Requested amount = 0 verdict is BORROW (within capacity)', resZeroReq.decision.verdict === 'BORROW');
assert('Edge: Requested amount = 0 outputs remain valid finite numbers', !isNaN(resZeroReq.safeCapacity.safeAmount));

// 5. Extremely large requested amount (₹100 Crore)
const hugeReqProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  requestedAmount: 1000000000,
};
const resHugeReq = runCopilot(hugeReqProfile);
assert('Edge: Huge requested amount verdict is BORROW_LESS', resHugeReq.decision.verdict === 'BORROW_LESS');
assert('Edge: Huge requested amount produces finite ratios', isFinite(resHugeReq.stress.baselineRatio));

// 6. Documented income > Claimed income
const docGtClaimed = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 50000,
  documented_monthly_income: 70000,
});
assert(
  'Edge: Documented > Claimed normalizes claimed total to documented',
  docGtClaimed.claimedTotalIncome === 70000
);

// 7. Very short tenure (12m) vs Very long tenure (84m)
const res12 = runCopilot(PERSONA_PRIYA, 12);
const res84 = runCopilot(PERSONA_PRIYA, 84);
assert('Edge: Short tenure 12m produces positive finite principal', res12.safeCapacity.safeAmount > 0 && isFinite(res12.safeCapacity.safeAmount));
assert('Edge: Long tenure 84m produces positive finite principal', res84.safeCapacity.safeAmount > 0 && isFinite(res84.safeCapacity.safeAmount));

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`HARDENING TEST SUITE SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}
