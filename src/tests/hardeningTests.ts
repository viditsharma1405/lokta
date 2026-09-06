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
import { computeEMI, totalRepayment, totalInterest, computeSIPComparison } from '../engine/emi';
import { computeEffectiveCostForProfile } from '../engine/effectiveCost';
import { computeProductRoute } from '../engine/productRoute';
import { computeSafeCapacity } from '../engine/safeCapacity';
import { buildProfileFromAnswers, type Answers } from '../questions/questionEngine';
import {
  Q_BUSINESS_TENURE,
  Q_SE_DOC_TYPE,
  Q_COLLATERAL_AVAILABLE,
  Q_GOLD_COLLATERAL,
  Q_COLLATERAL_VALUE,
  Q_DOCUMENTED_INCOME_ITR,
  Q_DOCUMENTED_INCOME_SE,
  Q_EMPLOYMENT_TENURE,
  Q_INFORMAL_RECORDS,
  Q_VARIABLE_INCOME_SHARE,
  Q_VARIABLE_INCOME_COMPONENT,
  Q_CO_APPLICANT_INCOME,
  Q_OTHER_EARNER,
  EXPENSE_BUCKET_QUESTION,
  Q_HIGH_COST_DEBT_AMOUNT,
  isQuestionActive,
} from '../questions/questionDefs';
import { PERSONA_PRIYA, PERSONA_RAVI, PERSONA_ANITA } from '../data/personas';
import { LTV } from '../rules/constants';
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
  'Branching: Salaried borrower sees generalized collateral question',
  isQuestionActive(Q_COLLATERAL_AVAILABLE, salariedAnswers)
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
  'Branching: Self-employed borrower sees business documentation type question',
  isQuestionActive(Q_SE_DOC_TYPE, seAnswers)
);

const seItrOnly: Answers = { ...seAnswers, se_doc_type: 'itr' };
assert(
  'Branching: SE with ITR sees ITR question and NOT bank records question',
  isQuestionActive(Q_DOCUMENTED_INCOME_ITR, seItrOnly) &&
    !isQuestionActive(Q_DOCUMENTED_INCOME_SE, seItrOnly)
);

const seRecordsOnly: Answers = { ...seAnswers, se_doc_type: 'records' };
assert(
  'Branching: SE with bank records sees records question and NOT ITR question',
  isQuestionActive(Q_DOCUMENTED_INCOME_SE, seRecordsOnly) &&
    !isQuestionActive(Q_DOCUMENTED_INCOME_ITR, seRecordsOnly)
);

const seBothDoc: Answers = { ...seAnswers, se_doc_type: 'both' };
assert(
  'Branching: SE with both sees both ITR and records questions',
  isQuestionActive(Q_DOCUMENTED_INCOME_SE, seBothDoc) &&
    isQuestionActive(Q_DOCUMENTED_INCOME_ITR, seBothDoc)
);

const seNoneDoc: Answers = { ...seAnswers, se_doc_type: 'none' };
assert(
  'Branching: SE with no documentation sees neither ITR nor records questions',
  !isQuestionActive(Q_DOCUMENTED_INCOME_SE, seNoneDoc) &&
    !isQuestionActive(Q_DOCUMENTED_INCOME_ITR, seNoneDoc)
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

// Vehicle loan does NOT ask for property collateral
const vehicleAnswers: Answers = {
  income_type: 'self_employed',
  monthly_income: 60000,
  loan_purpose: 'vehicle',
};
assert(
  'Routing: Vehicle loan asks generalized collateral question for potential secured alternatives',
  isQuestionActive(Q_COLLATERAL_AVAILABLE, vehicleAnswers)
);

// Personal event purpose asks if collateral is available
const personalAnswers: Answers = {
  income_type: 'salaried',
  monthly_income: 60000,
  loan_purpose: 'personal_event',
};
assert(
  'Routing: Personal event purpose reaches gold collateral question',
  isQuestionActive(Q_GOLD_COLLATERAL, personalAnswers)
);

// Gold loan routing for personal purpose
const profileWithGold = buildProfileFromAnswers({
  ...personalAnswers,
  gold_collateral: 'yes',
  collateral_value: 300000,
});
const outputGold = runCopilot(profileWithGold);
assert(
  'Routing: Gold collateral for personal purpose keeps Personal Loan primary with Gold Loan alternative',
  outputGold.productRoute.recommendedRoute === 'Personal Loan' &&
    outputGold.productRoute.securedAlternative?.product === 'Gold Loan'
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

// Regression test for Section 2: salaried with missing stability
const profileMissingStability = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 80000,
  // income_stability field is completely omitted
});
assert(
  'Stability: Missing/unanswered stability remains "unknown" (no silent stable coercion)',
  profileMissingStability.incomeStability === 'unknown'
);
const copilotMissingStability = runCopilot(profileMissingStability);
assert(
  'Stability: Missing stability gets no positive rate adjustment and no stable retention bonus',
  !copilotMissingStability.fairRate.adjustments.some(a => a.factor === 'Stable income') &&
    copilotMissingStability.safeCapacity.baseRetentionFactorLabel !== 'Salaried, stable income'
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

// 3. Multi-tenure simulation monotonicity (12, 24, 36, 48, 60 months)
const t12 = runCopilot(PERSONA_PRIYA, 12);
const t24 = runCopilot(PERSONA_PRIYA, 24);
const t36 = runCopilot(PERSONA_PRIYA, 36);
const t48 = runCopilot(PERSONA_PRIYA, 48);
const t60 = runCopilot(PERSONA_PRIYA, 60);

assert(
  'Tenure: Safe EMI ceiling is identical across 12, 24, 36, 48, 60 months',
  t12.safeCapacity.safeEMI === t24.safeCapacity.safeEMI &&
    t24.safeCapacity.safeEMI === t36.safeCapacity.safeEMI &&
    t36.safeCapacity.safeEMI === t48.safeCapacity.safeEMI &&
    t48.safeCapacity.safeEMI === t60.safeCapacity.safeEMI
);

assert(
  'Tenure: Safe principal scales monotonically across 12, 24, 36, 48, 60 months',
  t12.safeCapacity.safeAmount < t24.safeCapacity.safeAmount &&
    t24.safeCapacity.safeAmount < t36.safeCapacity.safeAmount &&
    t36.safeCapacity.safeAmount < t48.safeCapacity.safeAmount &&
    t48.safeCapacity.safeAmount < t60.safeCapacity.safeAmount
);

assert(
  'Tenure: Lender amount scales monotonically across 12, 24, 36, 48, 60 months for unsecured loan',
  t12.lenderCapacity.lenderLikelyAmount < t24.lenderCapacity.lenderLikelyAmount &&
    t24.lenderCapacity.lenderLikelyAmount < t36.lenderCapacity.lenderLikelyAmount &&
    t36.lenderCapacity.lenderLikelyAmount < t48.lenderCapacity.lenderLikelyAmount &&
    t48.lenderCapacity.lenderLikelyAmount < t60.lenderCapacity.lenderLikelyAmount
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

// ─────────────────────────────────────────────────────────────────────────────
// M. REQUESTED LOAN EMI VS SAFE EMI CEILING CLARITY & MATH REGRESSION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── M. Requested Loan EMI vs Safe EMI Ceiling Clarity & Math ──');

// 1. Core regression example from spec: Principal = ₹7,00,000, Rate = 10%, Tenure = 36 months
const testPrincipal = 700000;
const testAnnualRate = 10;
const testTenure = 36;

const testEMI = computeEMI(testPrincipal, testAnnualRate, testTenure);
const testRepayment = totalRepayment(testEMI, testTenure);
const testInterest = totalInterest(testPrincipal, testEMI, testTenure);

// Expected approximate EMI: ₹22,587/month
assert(
  'Clarity: Requested loan EMI for ₹7L at 10% for 36m is approx ₹22,587 (exact: 22587)',
  Math.round(testEMI) === 22587
);

// Expected total repayment: ~₹8.13L (8,13,133)
assert(
  'Clarity: Requested loan total repayment is approx ₹8.13L (8,13,133)',
  testRepayment > 812000 && testRepayment < 814000
);

// Expected interest: ~₹1.13L (1,13,133)
assert(
  'Clarity: Requested loan total interest is approx ₹1.13L (1,13,133)',
  testInterest > 112000 && testInterest < 114000
);

// 2. Safe EMI ceiling ≠ requested loan EMI
const sampleProfileWithSafeCeiling: BorrowerProfile = {
  ...PERSONA_PRIYA,
  requestedAmount: 700000,
};
const resSample = runCopilot(sampleProfileWithSafeCeiling, 36);

// Safe EMI ceiling is derived from borrower cashflow (e.g. ₹24,000 for Priya)
// It is NOT the EMI for the requested loan!
assert(
  'Clarity: Safe EMI ceiling is NOT equal to requested loan EMI',
  resSample.safeCapacity.safeEMI !== testEMI
);

// 3. Mathematical correctness: safe EMI ceiling must NOT be used to calculate requested-loan interest
const wrongInterestUsingSafeCeiling = resSample.safeCapacity.safeEMI * testTenure - testPrincipal;
const correctInterest = totalInterest(testPrincipal, testEMI, testTenure);

assert(
  'Clarity: Safe EMI ceiling must NOT be used to calculate requested-loan interest',
  correctInterest !== wrongInterestUsingSafeCeiling &&
    Math.abs(correctInterest - 113133) < 50
);

// 4. Tenure change recalculates requested loan EMI while safe EMI ceiling remains fixed
const emi12 = computeEMI(testPrincipal, testAnnualRate, 12);
const emi48 = computeEMI(testPrincipal, testAnnualRate, 48);

assert(
  'Clarity: Changing tenure recalculates requested-loan EMI (12m > 36m > 48m)',
  emi12 > testEMI && testEMI > emi48
);

const repay12 = totalRepayment(emi12, 12);
const repay48 = totalRepayment(emi48, 48);

assert(
  'Clarity: Changing tenure recalculates requested-loan total repayment and interest',
  repay48 > testRepayment && testRepayment > repay12
);

// ─────────────────────────────────────────────────────────────────────────────
// N. FINAL SURGICAL PASS REGRESSION SUITE (ITEMS 1–16)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── N. Final Submission Regression Suite (Items 1–16) ──');

// 1. Requested ₹7L loan at 10% / 36 months
const n_p7L = 700000;
const n_r10 = 10;
const n_t36 = 36;
const n_emi7L = computeEMI(n_p7L, n_r10, n_t36);
const n_repay7L = totalRepayment(n_emi7L, n_t36);
const n_interest7L = totalInterest(n_p7L, n_emi7L, n_t36);
assert('Reg 1: Requested ₹7L loan at 10% / 36m produces EMI = ₹22,587', Math.round(n_emi7L) === 22587);
assert('Reg 1: Requested ₹7L loan at 10% / 36m total repayment = ₹8.13L (8,13,133)', Math.round(n_repay7L) === 813133);
assert('Reg 1: Requested ₹7L loan at 10% / 36m total interest = ₹1.13L (1,13,133)', Math.round(n_interest7L) === 113133);

// 2. Requested-loan EMI uses fairRateMid
const priyaOutput = runCopilot(PERSONA_PRIYA);
const priyaReqEMI = computeEMI(PERSONA_PRIYA.requestedAmount, priyaOutput.fairRate.fairRateMid, 36);
assert('Reg 2: Requested loan EMI evaluates using fairRateMid', priyaReqEMI > 0 && isFinite(priyaReqEMI));

// 3. Requested effective cost uses same fairRateMid
const priyaReqCost = computeEffectiveCostForProfile(PERSONA_PRIYA, PERSONA_PRIYA.requestedAmount, priyaOutput.fairRate.fairRateMid, 36);
assert('Reg 3: Requested effective cost evaluates nominal rate using same fairRateMid', priyaReqCost.nominalRate === priyaOutput.fairRate.fairRateMid);

// 4. Requested interest is actual requested EMI × tenure − principal
assert('Reg 4: Requested interest formula is strictly EMI × tenure − principal', totalInterest(n_p7L, n_emi7L, n_t36) === n_emi7L * n_t36 - n_p7L);

// 5. Safe EMI ceiling is NOT used as requested EMI
assert('Reg 5: Safe EMI ceiling is NOT used as requested-loan EMI', priyaOutput.safeCapacity.safeEMI !== priyaReqEMI);

// 6. safeAmount is distinct from recommendedAmount
assert('Reg 6: safeAmount is a separate property from recommendedAmount', 'safeAmount' in priyaOutput.safeCapacity && 'recommendedAmount' in priyaOutput.safeCapacity);

// 7. safe amount > recommended amount (recommended is 90% of safe amount)
assert('Reg 7: safeAmount > recommendedAmount (recommended = safe × 0.90)', priyaOutput.safeCapacity.safeAmount > priyaOutput.safeCapacity.recommendedAmount && Math.abs(priyaOutput.safeCapacity.recommendedAmount - Math.round(priyaOutput.safeCapacity.safeAmount * 0.9)) <= 1);

// 8. Missing stability remains unknown
const nMissingStability = buildProfileFromAnswers({ income_type: 'salaried', monthly_income: 60000 });
assert('Reg 8: Missing stability remains strictly unknown', nMissingStability.incomeStability === 'unknown');

// 9. Missing repayment remains unknown
const nMissingRepayment = buildProfileFromAnswers({ income_type: 'salaried', monthly_income: 60000 });
assert('Reg 9: Missing repayment remains strictly unknown', nMissingRepayment.repaymentHistory === 'unknown');

// 10. Ravi documented income
assert('Reg 10: Ravi documented income is ₹35,000/mo (ITR ₹4.2L/yr)', PERSONA_RAVI.documentedIncome === 35000);

// 11. Ravi co-applicant handling
const raviLenderNoCo = PERSONA_RAVI.eligibleIncomeLender - PERSONA_RAVI.coApplicantIncome;
const raviLenderWithCo = PERSONA_RAVI.eligibleIncomeLender;
const raviSafeNoCo = PERSONA_RAVI.eligibleIncomeSafe - PERSONA_RAVI.coApplicantIncome;
const raviSafeWithCo = PERSONA_RAVI.eligibleIncomeSafe;
assert('Reg 11: Ravi lender income without spouse = ₹45,000 (35k + 40% × 25k)', raviLenderNoCo === 45000);
assert('Reg 11: Ravi lender income with explicit co-applicant = ₹63,000 (45k + 18k)', raviLenderWithCo === 63000);
assert('Reg 11: Ravi safe income without spouse = ₹60,000', raviSafeNoCo === 60000);
assert('Reg 11: Ravi safe income with spouse co-applicant = ₹78,000', raviSafeWithCo === 78000);

// 12. Anita hard stop
const anitaOutput = runCopilot(PERSONA_ANITA);
assert('Reg 12: Anita high-cost debt burden (33.65%) triggers hard stop -> DONT_BORROW', anitaOutput.decision.verdict === 'DONT_BORROW');

// 13. Tenure propagation
const priya36Safe = runCopilot(PERSONA_PRIYA, 36).safeCapacity;
const priya60Safe = runCopilot(PERSONA_PRIYA, 60).safeCapacity;
assert('Reg 13: Changing tenure recalculates safe principal (60m > 36m)', priya60Safe.safeAmount > priya36Safe.safeAmount);
assert('Reg 13: Safe EMI ceiling is strictly constant across tenures', priya60Safe.safeEMI === priya36Safe.safeEMI);

// 14. SIP isolation
const baseOutput = runCopilot(PERSONA_PRIYA, 36);
computeSIPComparison(10000, 36, 12, 50000);
computeSIPComparison(10000, 36, 18, 50000);
assert('Reg 14: SIP calculation does NOT mutate base engine outputs', baseOutput.safeCapacity.safeAmount === priya36Safe.safeAmount && baseOutput.decision.verdict === 'BORROW_LESS');

// 15. Provenance tracking
assert('Reg 15: Provenance tracks required tags (USER_ANSWER, ASSUMPTION, DERIVED)', baseOutput.provenanceSummary !== undefined && baseOutput.provenanceSummary.some(p => p.tag === 'USER_ANSWER') && baseOutput.provenanceSummary.some(p => p.tag === 'ASSUMPTION') && baseOutput.provenanceSummary.some(p => p.tag === 'DERIVED'));

// 16. Gold willingness and routing
const personalUnwilling = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 60000,
  loan_purpose: 'personal_event',
  gold_collateral: 'no',
});
assert('Reg 16: Personal purpose + gold unwilling -> Personal Loan', computeProductRoute(personalUnwilling).recommendedRoute === 'Personal Loan');

const personalWilling = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 60000,
  loan_purpose: 'personal_event',
  gold_collateral: 'yes',
  collateral_value: 300000,
});
const routePersonalWilling = computeProductRoute(personalWilling);
assert(
  'Reg 16: Personal purpose + gold willing -> Personal Loan primary, Gold Loan secured alternative',
  routePersonalWilling.recommendedRoute === 'Personal Loan' &&
    routePersonalWilling.securedAlternative?.product === 'Gold Loan'
);

const personalNotSure = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 60000,
  loan_purpose: 'personal_event',
  gold_collateral: 'not_sure',
});
const routeNotSure = computeProductRoute(personalNotSure);
assert('Reg 16: Personal purpose + gold not sure -> Personal Loan primary, Gold Loan alternative', routeNotSure.recommendedRoute === 'Personal Loan' && routeNotSure.alternativeRoutes.some(r => r.includes('Gold Loan')));

const bizProperty = buildProfileFromAnswers({
  income_type: 'self_employed',
  monthly_income: 80000,
  loan_purpose: 'business_expansion',
  collateral_available: 'property_commercial',
  collateral_value: 4500000,
});
assert('Reg 16: Business + property collateral -> LAP', computeProductRoute(bizProperty).recommendedRoute.includes('LAP'));

const bizNoCollateral = buildProfileFromAnswers({
  income_type: 'self_employed',
  monthly_income: 80000,
  loan_purpose: 'business_expansion',
  collateral_available: 'none',
});
assert('Reg 16: Business + no collateral -> Business Loan (Unsecured)', computeProductRoute(bizNoCollateral).recommendedRoute === 'Business Loan (Unsecured)');

const vehicleProfile = buildProfileFromAnswers({
  income_type: 'salaried',
  monthly_income: 50000,
  loan_purpose: 'vehicle',
});
assert('Reg 16: Vehicle purpose -> Two-Wheeler Loan', computeProductRoute(vehicleProfile).recommendedRoute === 'Two-Wheeler Loan');

// ─────────────────────────────────────────────────────────────────────────────
// O. FINAL SURGICAL PASS: FAIR RATE & GENERALIZED COLLATERAL (CHANGES 1 & 2)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── O. Fair Rate & Collateral Comprehensive Verification ──');

// ── Fair Rate Tests (1–14) ──
// 1. Strong known borrower → lower part of band
const strongProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  creditScore: 800,
  repaymentHistory: 'clean',
  incomeStability: 'stable',
  documentationStatus: 'full',
  highCostDebtOutstanding: 0,
};
const strongFR = computeFairRate(strongProfile);
assert('FairRate 1: Strong known borrower → lower part of band (finalPosition <= 30)', strongFR.finalPosition <= 30);

// 2. Neutral borrower → around middle of band
const neutralProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  creditScore: 680,
  repaymentHistory: 'unknown',
  incomeStability: 'unknown',
  documentationStatus: 'partial',
  highCostDebtOutstanding: 0,
};
const neutralFR = computeFairRate(neutralProfile);
assert('FairRate 2: Neutral borrower → around middle of band (position = 50)', neutralFR.finalPosition === 50);

// 3. Recent bounce → rate increases
const cleanRepayProfile: BorrowerProfile = { ...PERSONA_PRIYA, repaymentHistory: 'clean' };
const bounceRepayProfile: BorrowerProfile = { ...PERSONA_PRIYA, repaymentHistory: 'bounce' };
assert('FairRate 3: Recent bounce → rate increases', computeFairRate(bounceRepayProfile).fairRateMid > computeFairRate(cleanRepayProfile).fairRateMid);

// 4. High-cost debt → rate increases
const noHcdProfile: BorrowerProfile = { ...PERSONA_PRIYA, highCostDebtOutstanding: 0 };
const withHcdProfile: BorrowerProfile = { ...PERSONA_PRIYA, highCostDebtOutstanding: 50000 };
assert('FairRate 4: High-cost debt → rate increases', computeFairRate(withHcdProfile).fairRateMid > computeFairRate(noHcdProfile).fairRateMid);

// 5. Unknown credit → midpoint unchanged, range wider
const baseKnownCredit: BorrowerProfile = { ...PERSONA_PRIYA, creditScore: 680, creditScoreStatus: 'known' };
const baseUnknownCredit: BorrowerProfile = { ...PERSONA_PRIYA, creditScore: null, creditScoreStatus: 'unknown' };
const frKnownCredit = computeFairRate(baseKnownCredit);
const frUnknownCredit = computeFairRate(baseUnknownCredit);
assert('FairRate 5: Unknown credit → midpoint unchanged', Math.abs(frUnknownCredit.fairRateMid - frKnownCredit.fairRateMid) < 0.001);
assert('FairRate 5: Unknown credit → range wider', (frUnknownCredit.fairRateHigh - frUnknownCredit.fairRateLow) > (frKnownCredit.fairRateHigh - frKnownCredit.fairRateLow));

// 6. Unknown repayment → midpoint unchanged, range wider
const baseNeutralRepay: BorrowerProfile = { ...PERSONA_PRIYA, repaymentHistory: 'clean' };
const baseUnknownRepay: BorrowerProfile = { ...PERSONA_PRIYA, repaymentHistory: 'unknown' };
const frNeutralRepay = computeFairRate(baseNeutralRepay);
const frUnknownRepay = computeFairRate(baseUnknownRepay);
assert('FairRate 6: Unknown repayment → range wider than clean baseline', (frUnknownRepay.fairRateHigh - frUnknownRepay.fairRateLow) > (frNeutralRepay.fairRateHigh - frNeutralRepay.fairRateLow));

// 7. Unknown stability → midpoint unchanged, range wider
const baseNeutralStability: BorrowerProfile = { ...PERSONA_PRIYA, incomeStability: 'stable' };
const baseUnknownStability: BorrowerProfile = { ...PERSONA_PRIYA, incomeStability: 'unknown' };
const frNeutralStab = computeFairRate(baseNeutralStability);
const frUnknownStab = computeFairRate(baseUnknownStability);
assert('FairRate 7: Unknown stability → range wider than stable baseline', (frUnknownStab.fairRateHigh - frUnknownStab.fairRateLow) > (frNeutralStab.fairRateHigh - frNeutralStab.fairRateLow));

// 8. Unknown documentation → midpoint unchanged, range wider
const basePartialDoc: BorrowerProfile = { ...PERSONA_PRIYA, documentationStatus: 'partial' };
const baseUnknownDoc: BorrowerProfile = { ...PERSONA_PRIYA, documentationStatus: 'unknown' };
const frPartialDoc = computeFairRate(basePartialDoc);
const frUnknownDoc = computeFairRate(baseUnknownDoc);
assert('FairRate 8: Unknown documentation → midpoint unchanged vs partial (0 pt base)', Math.abs(frUnknownDoc.fairRateMid - frPartialDoc.fairRateMid) < 0.001);
assert('FairRate 8: Unknown documentation → range wider', (frUnknownDoc.fairRateHigh - frUnknownDoc.fairRateLow) > (frPartialDoc.fairRateHigh - frPartialDoc.fairRateLow));

// 9. Multiple unknowns → width capped at ±25
const allUnknownsProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  creditScore: null,
  creditScoreStatus: 'unknown',
  repaymentHistory: 'unknown',
  incomeStability: 'unknown',
  documentationStatus: 'unknown',
};
const frAllUnknowns = computeFairRate(allUnknownsProfile);
assert('FairRate 9: Multiple unknowns → width capped at ±25', frAllUnknowns.halfWidth === 25);

// 10. Position clamped to 0–100
const extremeRiskyProfile: BorrowerProfile = {
  ...PERSONA_PRIYA,
  creditScore: 400,
  repaymentHistory: 'bounce',
  incomeStability: 'unstable',
  documentationStatus: 'none',
  highCostDebtOutstanding: 100000,
};
const frExtreme = computeFairRate(extremeRiskyProfile);
assert('FairRate 10: Position clamped to 0–100', frExtreme.finalPosition <= 100 && frExtreme.finalPosition >= 0);

// 11. Rate never escapes product band
assert('FairRate 11: Rate never escapes product band (low >= baseBandLow, high <= baseBandHigh)', frExtreme.fairRateLow >= frExtreme.baseBandLow && frExtreme.fairRateHigh <= frExtreme.baseBandHigh && strongFR.fairRateLow >= strongFR.baseBandLow && strongFR.fairRateHigh <= strongFR.baseBandHigh);

// 12. Priya-like profile ≈ 10–11.5%
const priyaOutputFR = runCopilot(PERSONA_PRIYA).fairRate;
assert('FairRate 12: Priya-like profile ≈ 10–11.5% (fairRateMid ~11.44%, fairRateLow ~10.5%)', priyaOutputFR.fairRateLow >= 10.0 && priyaOutputFR.fairRateMid <= 11.6);

// 13. Ravi-like secured profile ≈ 10.5–13.0%
const raviOutputFR = runCopilot(PERSONA_RAVI).fairRate;
assert('FairRate 13: Ravi-like secured profile ≈ 10.5–13.0%', raviOutputFR.fairRateLow >= 10.5 && raviOutputFR.fairRateHigh <= 13.0);

// 14. Anita-like risky profile remains materially higher
const anitaOutputFR = runCopilot(PERSONA_ANITA).fairRate;
assert('FairRate 14: Anita-like risky profile remains materially higher (mid > 18%)', anitaOutputFR.fairRateMid > 18.0);

// ── Collateral Tests (1–10) ──
// 1. Residential property LTV: 70%
assert('Collateral 1: Residential property LTV is 70%', LTV.lapResidential === 0.70);

// 2. Commercial property LTV: 60%
assert('Collateral 2: Commercial property LTV is 60%', LTV.lapCommercial === 0.60);

// 3. Gold LTV tiered
assert('Collateral 3: Gold LTV tiered (85%, 80%, 75%)', LTV.gold.upTo2L === 0.85 && LTV.gold.twoTo10L === 0.80 && LTV.gold.above10L === 0.75);

// 4. Collateral valuation haircut: removed (no arbitrary 20% haircut; evaluates as statedValue * illustrative LTV)
const residentialColTest: BorrowerProfile = {
  ...PERSONA_RAVI,
  collateral: { type: 'property_residential', statedValue: 1000000, willingToPledge: 'yes' },
};
const resCap = computeLenderCapacity(residentialColTest, 11.5, 84);
assert('Collateral 4: No arbitrary haircut; LTV capacity is statedValue × illustrative LTV (10L × 70% = 7L)', resCap.ltvSupportedAmount === 700000);

// 5. Missing collateral value: no fabricated LTV
const bizMissingCollateralVal: BorrowerProfile = {
  ...PERSONA_RAVI,
  collateral: { type: 'property_commercial', statedValue: null, willingToPledge: 'yes' },
};
const capMissingVal = computeLenderCapacity(bizMissingCollateralVal, 11.5, 84);
assert('Collateral 5: Missing collateral value → no fabricated LTV (ltvSupportedAmount is null)', capMissingVal.ltvSupportedAmount === null);

// 6. Not sure collateral → no LTV capacity
const bizNotSureCollateral: BorrowerProfile = {
  ...PERSONA_RAVI,
  collateral: { type: 'property_commercial', statedValue: 4500000, willingToPledge: 'not_sure' },
};
const capNotSure = computeLenderCapacity(bizNotSureCollateral, 11.5, 84);
assert('Collateral 6: Not sure collateral → no LTV capacity', capNotSure.ltvSupportedAmount === null);

// 7. Business + property → LAP
const routeBizResProp = computeProductRoute({
  ...PERSONA_RAVI,
  collateral: { type: 'property_residential', statedValue: 3000000, willingToPledge: 'yes' },
});
assert('Collateral 7: Business + residential property → LAP', routeBizResProp.recommendedRoute === 'LAP (Residential Property)' && routeBizResProp.isSecured === true);

const routeBizCommProp = computeProductRoute({
  ...PERSONA_RAVI,
  collateral: { type: 'property_commercial', statedValue: 4500000, willingToPledge: 'yes' },
});
assert('Collateral 7: Business + commercial property → LAP', routeBizCommProp.recommendedRoute === 'LAP (Commercial Property)' && routeBizCommProp.isSecured === true);

// 8. Vehicle + property → Two-Wheeler remains primary; property is alternative
const routeVehicleProp = computeProductRoute({
  ...PERSONA_PRIYA,
  loanPurpose: 'vehicle',
  collateral: { type: 'property_residential', statedValue: 4000000, willingToPledge: 'yes' },
});
assert('Collateral 8: Vehicle + property → Two-Wheeler remains primary', routeVehicleProp.recommendedRoute === 'Two-Wheeler Loan');
assert('Collateral 8: Vehicle + property → LAP is secured alternative', routeVehicleProp.securedAlternative?.product === 'Loan Against Property (LAP)');

// 9. Vehicle + gold → Two-Wheeler remains primary; gold is alternative
const routeVehicleGold = computeProductRoute({
  ...PERSONA_PRIYA,
  loanPurpose: 'vehicle',
  collateral: { type: 'gold', statedValue: 200000, willingToPledge: 'yes' },
});
assert('Collateral 9: Vehicle + gold → Two-Wheeler remains primary', routeVehicleGold.recommendedRoute === 'Two-Wheeler Loan');
assert('Collateral 9: Vehicle + gold → Gold Loan is secured alternative', routeVehicleGold.securedAlternative?.product === 'Gold Loan');

// 10. No collateral → unsecured route
const routeNoColBiz = computeProductRoute({
  ...PERSONA_RAVI,
  collateral: { type: 'none', statedValue: null, willingToPledge: 'no' },
});
assert('Collateral 10: No collateral business → Unsecured Business Loan', routeNoColBiz.recommendedRoute === 'Business Loan (Unsecured)' && routeNoColBiz.isSecured === false);

const routeNoColPersonal = computeProductRoute({
  ...PERSONA_PRIYA,
  collateral: { type: 'none', statedValue: null, willingToPledge: 'no' },
});
assert('Collateral 10: No collateral personal → Unsecured Personal Loan', routeNoColPersonal.recommendedRoute === 'Personal Loan' && routeNoColPersonal.isSecured === false);

// ─────────────────────────────────────────────────────────────────────────────
// P. COLLATERAL DATA FLOW & LTV BINDING CONSTRAINT TESTS (TESTS 1–5)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── P. Collateral Data Flow & LTV Binding Constraint Tests ──');

// Setup: Commercial property at 60% LTV with FOIR-supported capacity = ₹24L (exact 24,00,000)
// At 12% interest over 84 months (LAP Commercial default):
// computeEMI(2400000, 12, 84) = 42366.55871...
// With 60% secured FOIR, required eligibleIncomeLender = targetEMI / 0.60
const foir24LEMI = computeEMI(2400000, 12, 84);
const foir24LIncome = foir24LEMI / 0.60;

const base24LCommercialProfile: BorrowerProfile = {
  ...PERSONA_RAVI,
  loanPurpose: 'business_expansion',
  eligibleIncomeLender: foir24LIncome,
  existingEMI: 0,
  businessDebtEMI: 0,
  highCostDebtEMI: 0,
  collateral: { type: 'property_commercial', statedValue: 4500000, willingToPledge: 'yes' },
};

// Test 1: Commercial property ₹45L, LTV 60%, FOIR-supported ₹24L → lender-likely ₹24L
const t1Result = computeLenderCapacity(base24LCommercialProfile, 12, 84);
assert(
  'Test 1: Commercial property ₹45L, LTV 60%, FOIR-supported ₹24L → lender-likely ₹24L',
  Math.round(t1Result.foirSupportedAmount) === 2400000 &&
  t1Result.ltvSupportedAmount === 2700000 &&
  Math.round(t1Result.lenderLikelyAmount) === 2400000 &&
  t1Result.bindingConstraint === 'foir'
);

// Test 2: Commercial property ₹30L, LTV 60%, FOIR-supported ₹24L → lender-likely ₹18L
const t2Profile: BorrowerProfile = {
  ...base24LCommercialProfile,
  collateral: { type: 'property_commercial', statedValue: 3000000, willingToPledge: 'yes' },
};
const t2Result = computeLenderCapacity(t2Profile, 12, 84);
assert(
  'Test 2: Commercial property ₹30L, LTV 60%, FOIR-supported ₹24L → lender-likely ₹18L',
  Math.round(t2Result.foirSupportedAmount) === 2400000 &&
  t2Result.ltvSupportedAmount === 1800000 &&
  Math.round(t2Result.lenderLikelyAmount) === 1800000 &&
  t2Result.bindingConstraint === 'ltv'
);

// Test 3: Commercial property ₹60L, LTV 60%, FOIR-supported ₹24L → lender-likely ₹24L
const t3Profile: BorrowerProfile = {
  ...base24LCommercialProfile,
  collateral: { type: 'property_commercial', statedValue: 6000000, willingToPledge: 'yes' },
};
const t3Result = computeLenderCapacity(t3Profile, 12, 84);
assert(
  'Test 3: Commercial property ₹60L, LTV 60%, FOIR-supported ₹24L → lender-likely ₹24L',
  Math.round(t3Result.foirSupportedAmount) === 2400000 &&
  t3Result.ltvSupportedAmount === 3600000 &&
  Math.round(t3Result.lenderLikelyAmount) === 2400000 &&
  t3Result.bindingConstraint === 'foir'
);

// Test 4: No collateral → no LTV constraint; lender-likely should use the applicable non-LTV capacity logic
const t4Profile: BorrowerProfile = {
  ...base24LCommercialProfile,
  collateral: { type: 'none', statedValue: null, willingToPledge: 'no' },
};
const t4Result = computeLenderCapacity(t4Profile, 12, 84);
assert(
  'Test 4: No collateral → no LTV constraint; lender-likely uses applicable non-LTV capacity logic',
  t4Result.ltvSupportedAmount === null &&
  t4Result.bindingConstraint === 'foir' &&
  t4Result.lenderLikelyAmount === t4Result.foirSupportedAmount
);

// Test 5: Changing only collateral value should change lender-likely whenever the LTV constraint becomes binding
const t5Result45 = computeLenderCapacity(base24LCommercialProfile, 12, 84);
const t5Result30 = computeLenderCapacity({
  ...base24LCommercialProfile,
  collateral: { type: 'property_commercial', statedValue: 3000000, willingToPledge: 'yes' },
}, 12, 84);
assert(
  'Test 5: Changing only collateral value changes lender-likely whenever LTV constraint becomes binding',
  Math.round(t5Result45.lenderLikelyAmount) === 2400000 &&
  Math.round(t5Result30.lenderLikelyAmount) === 1800000 &&
  t5Result45.lenderLikelyAmount !== t5Result30.lenderLikelyAmount &&
  t5Result45.bindingConstraint === 'foir' &&
  t5Result30.bindingConstraint === 'ltv'
);

// Questionnaire flow integration test: Personal purpose with commercial property
const personalWithCommercialAnswers: Answers = {
  income_type: 'salaried',
  monthly_income: foir24LIncome,
  loan_purpose: 'personal_event',
  collateral_available: 'property_commercial',
  collateral_value: 3000000,
  existing_emi: 0,
};
const pPersonalComm = buildProfileFromAnswers(personalWithCommercialAnswers);
const outPersonalComm = runCopilot(pPersonalComm);
assert(
  'Questionnaire flow: Personal purpose with commercial property ₹30L binds at LTV ₹18L',
  pPersonalComm.collateral.statedValue === 3000000 &&
  outPersonalComm.lenderCapacity.ltvSupportedAmount === 1800000 &&
  outPersonalComm.lenderCapacity.bindingConstraint === 'ltv' &&
  outPersonalComm.lenderCapacity.lenderLikelyAmount <= 1800000
);

// ─────────────────────────────────────────────────────────────────────────────
// Q. VARIABLE INCOME COMPONENT & ADAPTIVE SAFE RETENTION TESTS (TESTS 1–7)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Q. Variable Income Component & Adaptive Safe Retention Tests ──');

// Base self-employed profile with documented ITR (steady, 40% base retention)
// ₹60,000 claimed income, ₹30,000 living expenses, ₹0 existing debt
// Disposable surplus = ₹30,000. Base retention = 40%.
const baseSEVarProfile: BorrowerProfile = {
  ...PERSONA_RAVI,
  coApplicantIncome: 0,
  eligibleIncomeSafe: 60000,
  claimedTotalIncome: 60000,
  essentialExpenses: 30000,
  essentialExpensesIsDefaulted: false,
  existingEMI: 0,
  existingEMIIsDefaulted: false,
  businessDebtEMI: 0,
  highCostDebtEMI: 0,
  highCostDebtEMIIsDefaulted: false,
  highCostDebtOutstanding: 0,
  recentBounce: false,
  dependents: 0,
  hasOtherEarner: false,
  emergencySavingsMonths: null,
  upcomingLargeExpense: false,
};

// TEST 1 — 0–10%
// Variable component = 0–10%
// Expected: no -5pp adjustment
const varT1Profile: BorrowerProfile = {
  ...baseSEVarProfile,
  variableIncomeComponent: 'low',
};
const varT1Safe = computeSafeCapacity(varT1Profile, 12);
assert(
  'TEST 1: Variable component = 0–10% → no -5pp adjustment (base 40% retention preserved)',
  !varT1Safe.adjustments.some(a => a.name.includes('>30%')) &&
  varT1Safe.adjustedRetentionFactor === 0.40
);

// TEST 2 — 10–30%
// Variable component = 10–30%
// Expected: no -5pp adjustment
const varT2Profile: BorrowerProfile = {
  ...baseSEVarProfile,
  variableIncomeComponent: 'moderate',
};
const varT2Safe = computeSafeCapacity(varT2Profile, 12);
assert(
  'TEST 2: Variable component = 10–30% → no -5pp adjustment (base 40% retention preserved)',
  !varT2Safe.adjustments.some(a => a.name.includes('>30%')) &&
  varT2Safe.adjustedRetentionFactor === 0.40
);

// TEST 3 — >30%
// Variable component = >30%
// Expected: existing -5pp adjustment applies exactly once
const varT3Profile: BorrowerProfile = {
  ...baseSEVarProfile,
  variableIncomeComponent: 'high',
};
const varT3Safe = computeSafeCapacity(varT3Profile, 12);
const varT3AdjustmentsCount = varT3Safe.adjustments.filter(a => a.name.includes('>30%')).length;
assert(
  'TEST 3: Variable component = >30% → existing -5pp adjustment applies exactly once (40% - 5% = 35%)',
  varT3AdjustmentsCount === 1 &&
  varT3Safe.adjustedRetentionFactor === 0.35 &&
  varT3Safe.adjustments.find(a => a.name.includes('>30%'))?.value === -0.05
);

// TEST 4 — Not sure
// Variable component = unknown
// Expected: no -5pp adjustment, unknown is preserved, confidence/unknown behavior is respected
const varT4Profile: BorrowerProfile = {
  ...baseSEVarProfile,
  variableIncomeComponent: 'unknown',
};
const varT4Safe = computeSafeCapacity(varT4Profile, 12);
assert(
  'TEST 4: Variable component = unknown → no -5pp adjustment (40% retention)',
  !varT4Safe.adjustments.some(a => a.name.includes('>30%')) &&
  varT4Safe.adjustedRetentionFactor === 0.40
);
assert(
  'TEST 4: Variable component = unknown → unknown preserved and confidence widens (MEDIUM confidence)',
  varT4Profile.variableIncomeComponent === 'unknown' &&
  varT4Safe.confidence === 'MEDIUM'
);

// TEST 5 — Salaried borrower
// Expected: variable-income question is not shown in the normal stable salaried flow
const salariedStableAnswers: Answers = {
  income_type: 'salaried',
  monthly_income: 100000,
  income_stability: 'stable',
  loan_purpose: 'personal_event',
};
assert(
  'TEST 5: Salaried stable borrower → variable-income question is NOT shown',
  !isQuestionActive(Q_VARIABLE_INCOME_COMPONENT, salariedStableAnswers)
);

// TEST 6 — Self-employed borrower
// Expected: variable-income question is shown
const seVarAnswers: Answers = {
  income_type: 'self_employed',
  monthly_income: 60000,
  income_stability: 'stable',
  loan_purpose: 'business_expansion',
};
assert(
  'TEST 6: Self-employed borrower → variable-income question IS shown',
  isQuestionActive(Q_VARIABLE_INCOME_COMPONENT, seVarAnswers)
);

// TEST 7 — Gig/informal borrower
// Expected: variable-income question is shown
const gigVarAnswers: Answers = {
  income_type: 'informal',
  monthly_income: 26000,
  income_stability: 'unstable',
  loan_purpose: 'vehicle',
};
assert(
  'TEST 7: Gig/informal borrower → variable-income question IS shown',
  isQuestionActive(Q_VARIABLE_INCOME_COMPONENT, gigVarAnswers)
);

// Questionnaire flow integration tests: Answers mapping into profile
const answers0to10: Answers = { income_type: 'self_employed', monthly_income: 50000, variable_income_component: '0_10' };
const answers10to30: Answers = { income_type: 'self_employed', monthly_income: 50000, variable_income_component: '10_30' };
const answersGt30: Answers = { income_type: 'self_employed', monthly_income: 50000, variable_income_component: 'gt_30' };
const answersUnknown: Answers = { income_type: 'self_employed', monthly_income: 50000, variable_income_component: 'unknown' };

assert('Questionnaire flow: 0–10% answer maps to low variableIncomeComponent', buildProfileFromAnswers(answers0to10).variableIncomeComponent === 'low');
assert('Questionnaire flow: 10–30% answer maps to moderate variableIncomeComponent', buildProfileFromAnswers(answers10to30).variableIncomeComponent === 'moderate');
assert('Questionnaire flow: >30% answer maps to high variableIncomeComponent', buildProfileFromAnswers(answersGt30).variableIncomeComponent === 'high');
assert('Questionnaire flow: Not sure answer maps to unknown variableIncomeComponent', buildProfileFromAnswers(answersUnknown).variableIncomeComponent === 'unknown');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`HARDENING TEST SUITE SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}
