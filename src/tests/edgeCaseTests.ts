// ─────────────────────────────────────────────────────────────────────────────
// Edge Case Tests — Section 33 of Stage 3 requirements
// Run: npx tsx src/tests/edgeCaseTests.ts
// ─────────────────────────────────────────────────────────────────────────────

import { runCopilot } from '../engine/index';
import { computeEMI, principalFromEMI, computeLoanCostBreakdown, computeSIPComparison } from '../engine/emi';
import { chooseTier, qualifiesForBankTierWithCollateral, computeFairRate } from '../engine/fairRate';
import { computeEligibleIncomeLender } from '../engine/income';
import { computeEffectiveCost, computeEffectiveCostForProfile } from '../engine/effectiveCost';
import { computeSafeCapacity } from '../engine/safeCapacity';
import { computeLenderCapacity } from '../engine/lenderCapacity';
import { computeStressTest } from '../engine/stressTest';
import { buildProfileFromAnswers } from '../questions/questionEngine';
import type { BorrowerProfile } from '../types/profile';
import { PERSONA_PRIYA, PERSONA_ANITA, PERSONA_RAVI } from '../data/personas';

let pass = 0; let fail = 0;
function assert(name: string, condition: boolean, detail = '') {
  if (condition) { pass++; console.log(`✓ PASS  ${name}`); }
  else { fail++; console.log(`✗ FAIL  ${name} ${detail}`); }
}

// Helper: create a base salaried profile
function baseSalaried(overrides: Partial<BorrowerProfile> = {}): BorrowerProfile {
  return {
    ...PERSONA_PRIYA,
    requestedAmount: 300000,
    ...overrides,
  };
}

// ── Zero Interest Rate Edge Case ─────────────────────────────────────────────
const emi0 = computeEMI(100000, 0, 36);
assert('EMI at 0% rate', Math.abs(emi0 - 100000/36) < 1, `got ${emi0}`);

// ── Very High Interest Rate ──────────────────────────────────────────────────
const emiHigh = computeEMI(100000, 50, 12);
assert('EMI at 50% rate computes', emiHigh > 0 && isFinite(emiHigh));

// ── Zero Principal ───────────────────────────────────────────────────────────
const emiZeroP = computeEMI(0, 12, 36);
assert('EMI with zero principal', emiZeroP === 0);

// ── Zero EMI for inverse ─────────────────────────────────────────────────────
const pFromZero = principalFromEMI(0, 12, 36);
assert('Principal from zero EMI', pFromZero === 0);

// ── Small Loan ───────────────────────────────────────────────────────────────
const small = runCopilot(baseSalaried({ requestedAmount: 10000 }));
assert('Small loan verdict is BORROW', small.decision.verdict === 'BORROW');

// ── Large Loan (above lender capacity) ───────────────────────────────────────
const large = runCopilot(baseSalaried({ requestedAmount: 5000000 }));
assert('Large loan verdict is BORROW_LESS', large.decision.verdict === 'BORROW_LESS');

// ── Requested Below Safe ─────────────────────────────────────────────────────
const belowSafe = runCopilot(baseSalaried({ requestedAmount: 100000 }));
assert('Requested below safe → BORROW', belowSafe.decision.verdict === 'BORROW');

// ── Requested Between Safe and Lender ────────────────────────────────────────
const between = runCopilot(baseSalaried({ requestedAmount: 900000 }));
assert('Requested between safe/lender → BORROW_LESS', between.decision.verdict === 'BORROW_LESS');

// ── Zero Existing EMI ────────────────────────────────────────────────────────
const noEMI = runCopilot(baseSalaried({ existingEMI: 0, existingEMIIsDefaulted: false }));
assert('Zero existing EMI works', noEMI.lenderCapacity.availableNewEMI > 0);

// ── Unknown Credit Score ─────────────────────────────────────────────────────
const unknownCredit = runCopilot(baseSalaried({
  creditScore: null,
  creditScoreStatus: 'unknown',
}));
assert('Unknown credit score → wider rate band', unknownCredit.fairRate.unknownCount >= 1);
assert('Unknown credit score → rate adjustment = 0', unknownCredit.fairRate.adjustments.some(a => a.factor.includes('unknown')));

// ── Thin-File Borrower ───────────────────────────────────────────────────────
const thinFile = runCopilot(baseSalaried({
  creditScore: null,
  creditScoreStatus: 'thin_file',
}));
assert('Thin file → +5 adjustment', thinFile.fairRate.adjustments.some(a => a.factor.includes('thin') && a.value === 5));

// ── Unknown Household Expenses ───────────────────────────────────────────────
const unknownExp = runCopilot(baseSalaried({
  essentialExpenses: 110000 * 0.55,
  essentialExpensesIsDefaulted: true,
}));
assert('Defaulted expenses → range exists', unknownExp.safeCapacity.safeAmountRange !== undefined);

// ── Expenses > Income ────────────────────────────────────────────────────────
const expGtIncome = runCopilot(baseSalaried({
  essentialExpenses: 150000, // > income of 110000
}));
assert('Expenses > income → disposable = 0', expGtIncome.safeCapacity.disposableCashFlow === 0);
assert('Expenses > income → safe EMI = 0', expGtIncome.safeCapacity.safeEMI === 0);

// ── Zero Disposable Cash Flow ────────────────────────────────────────────────
const zeroCash = runCopilot(baseSalaried({
  essentialExpenses: 96000, // leaves 0 after EMI
}));
assert('Zero disposable → safeAmount = 0', zeroCash.safeCapacity.safeAmount === 0 || zeroCash.safeCapacity.disposableCashFlow === 0);

// ── Recent Bounce ────────────────────────────────────────────────────────────
const bounced = runCopilot(baseSalaried({
  recentBounce: true,
  repaymentHistory: 'bounce',
}));
assert('Recent bounce → retention reduced', bounced.safeCapacity.adjustedRetentionFactor < 0.50);
assert('Recent bounce → rate higher', bounced.fairRate.fairRateMid > PERSONA_PRIYA.creditScore! / 100);

// ── High-Cost Debt (below hard stop) ─────────────────────────────────────────
const hcdBelow = runCopilot(baseSalaried({
  highCostDebtOutstanding: 10000,
  highCostDebtEMI: 2000,
  highCostDebtEMIIsDefaulted: false,
}));
assert('High-cost debt below threshold → no hard stop', hcdBelow.decision.hardStopsTriggered.length === 0);
assert('High-cost debt present → soft signal', hcdBelow.decision.softSignalsTriggered.some(s => s.includes('igh-cost')));

// ── High-Cost Debt (above hard stop) ─────────────────────────────────────────
const hcdAbove = runCopilot(baseSalaried({
  highCostDebtOutstanding: 100000,
  highCostDebtEMI: 40000, // way above 30% of 110k
  highCostDebtEMIIsDefaulted: false,
}));
assert('High-cost debt severe → DONT_BORROW', hcdAbove.decision.verdict === 'DONT_BORROW');

// ── No High-Cost Debt ────────────────────────────────────────────────────────
const noHCD = runCopilot(baseSalaried({
  highCostDebtOutstanding: 0,
  highCostDebtEMI: 0,
}));
assert('No high-cost debt → no hard stop', noHCD.decision.hardStopsTriggered.length === 0);

// ── Unknown High-Cost Debt EMI ───────────────────────────────────────────────
const unknownHCDemi = runCopilot(baseSalaried({
  highCostDebtOutstanding: 35000,
  highCostDebtEMI: 35000 * 0.25, // defaulted fallback
  highCostDebtEMIIsDefaulted: true,
}));
assert('Unknown HCD EMI → value = outstanding × 25%', Math.abs(unknownHCDemi.safeCapacity.disposableCashFlow - (110000 - 48000 - 14000 - 8750)) < 100);

// ── No Collateral ────────────────────────────────────────────────────────────
const noColl = runCopilot(baseSalaried({
  collateral: { type: 'none', statedValue: null },
}));
assert('No collateral → LTV not computed', noColl.lenderCapacity.ltvSupportedAmount === null);

// ── Unknown Collateral Value ─────────────────────────────────────────────────
const unknownColl = runCopilot(baseSalaried({
  collateral: { type: 'property_residential', statedValue: null },
  loanPurpose: 'business_expansion',
  incomeType: 'self_employed',
}));
assert('Unknown collateral value → LTV null', unknownColl.lenderCapacity.ltvSupportedAmount === null);

// ── Income Range (self-employed) ─────────────────────────────────────────────
const incomeRange = runCopilot({
  ...baseSalaried(),
  incomeType: 'self_employed',
  documentedIncome: 30000,
  claimedTotalIncome: 50000,
  undocumentedPortion: 20000,
  eligibleIncomeLender: 30000 + 0.10 * 20000,
  eligibleIncomeSafe: 50000,
  documentationStatus: 'partial',
});
assert('Income range profile computes', incomeRange.lenderCapacity.lenderLikelyAmount > 0);

// ── Total Cost Breakdown Tests ───────────────────────────────────────────────
const costBreakdown = computeLoanCostBreakdown(500000, 12, 36, 1.5);
assert('Total repayment exceeds principal', costBreakdown.totalRepayment > 500000);
assert('Cost multiple is greater than 1', costBreakdown.costMultiple > 1.15);
assert('Processing fee calculated correctly', costBreakdown.estimatedProcessingFee === 500000 * 0.015);
assert('Sum of shares equals 100%', Math.abs((costBreakdown.principalSharePct + costBreakdown.interestSharePct + costBreakdown.feeSharePct) - 100) < 0.01);

const zeroCostBreakdown = computeLoanCostBreakdown(0, 12, 36);
assert('Zero principal loan breakdown handles safely', zeroCostBreakdown.totalOutflow === 0);

// ── SIP Investment Instead Tests ────────────────────────────────────────────
const sip = computeSIPComparison(15000, 36, 12, 100000);
assert('SIP future value exceeds total invested', sip.futureValue > sip.totalInvested);
assert('SIP wealth gain is positive', sip.wealthGain > 0);
assert('Net wealth difference includes interest avoided', sip.netWealthDifference === sip.wealthGain + 100000);

const sipZeroReturn = computeSIPComparison(10000, 24, 0, 50000);
assert('SIP at 0% return equals total invested', sipZeroReturn.futureValue === 240000);

// ── Stage 3.5 Final Corrections Tests ────────────────────────────────────────

// 1. Fair Rate Tier Logic
const pScore780 = baseSalaried({ creditScore: 780 });
assert('Fair rate: score 780 → bank tier', chooseTier(pScore780) === 'bankTier');

const pScore720 = baseSalaried({ creditScore: 720 });
assert('Fair rate: score 720 → bank tier', chooseTier(pScore720) === 'bankTier');

const pScore680 = baseSalaried({ creditScore: 680 });
assert('Fair rate: score 680 → NOT automatically bank tier (nbfcTier)', chooseTier(pScore680) === 'nbfcTier');

const pScoreUnknown = baseSalaried({ creditScore: null, creditScoreStatus: 'unknown' });
assert('Fair rate: unknown score → nbfcTier', chooseTier(pScoreUnknown) === 'nbfcTier');
const fairRateUnknown = computeFairRate(pScoreUnknown);
assert('Fair rate: unknown score → band widened due to unknown factor', fairRateUnknown.halfWidth > 15);

const pThinFileCollateral = baseSalaried({
  creditScore: null,
  creditScoreStatus: 'thin_file',
  businessTenure: 5,
  collateral: { type: 'property_commercial', statedValue: 3000000 },
});
assert('Fair rate: thin-file with collateral + tenure → qualifies for bank tier', qualifiesForBankTierWithCollateral(pThinFileCollateral));
assert('Fair rate: thin-file with collateral + tenure → bankTier', chooseTier(pThinFileCollateral) === 'bankTier');

const pThinFileNoCollateral = baseSalaried({
  creditScore: null,
  creditScoreStatus: 'thin_file',
  businessTenure: 5,
  collateral: { type: 'none', statedValue: null },
});
assert('Fair rate: thin-file without collateral → NOT bank tier', !qualifiesForBankTierWithCollateral(pThinFileNoCollateral) && chooseTier(pThinFileNoCollateral) === 'nbfcTier');

// 2. Repayment History Distinction
const pRepayClean = computeFairRate(baseSalaried({ repaymentHistory: 'clean' }));
const pRepayBounce = computeFairRate(baseSalaried({ repaymentHistory: 'bounce' }));
const pRepayUnknown = computeFairRate(baseSalaried({ repaymentHistory: 'unknown' }));

const adjClean = pRepayClean.adjustments.find(a => a.factor.includes('Clean repayment'))?.value;
const adjBounce = pRepayBounce.adjustments.find(a => a.factor.includes('Recent EMI bounce'))?.value;
const adjUnknown = pRepayUnknown.adjustments.find(a => a.factor.includes('Repayment history unknown'))?.value;

assert('Repayment history: clean gives -5 discount', adjClean === -5);
assert('Repayment history: bounce gives +20 penalty', adjBounce === 20);
assert('Repayment history: unknown does NOT become clean (0 adjustment)', adjUnknown === 0);
assert('Repayment history: unknown widens the band', pRepayUnknown.halfWidth > pRepayClean.halfWidth);

// 3. Co-Applicant Handling
const noCoAppLender = computeEligibleIncomeLender(100000, 100000, false, 0);
const withCoAppLender = computeEligibleIncomeLender(100000, 100000, false, 25000);
assert('Co-applicant: no co-applicant → 0 added', noCoAppLender.eligibleIncomeLender === 100000);
assert('Co-applicant: explicit co-applicant → full documented co-applicant income added', withCoAppLender.eligibleIncomeLender === 125000);

// 4. Anita Devi Verification
const anitaOutput = runCopilot(PERSONA_ANITA);
const anitaDisp = PERSONA_ANITA.eligibleIncomeSafe - PERSONA_ANITA.essentialExpenses - PERSONA_ANITA.highCostDebtEMI;
assert('Anita: disposable cash flow equals ₹350', Math.abs(anitaDisp - 350) < 0.01 && anitaOutput.safeCapacity.disposableCashFlow === 350);
assert('Anita: safe EMI equals ₹35 (₹350 × 10%)', anitaOutput.safeCapacity.safeEMI === 35);
assert('Anita: recommended EMI equals ₹31.50 (₹35 × 90%)', anitaOutput.safeCapacity.recommendedEMI === 31.5);
assert('Anita: decision verdict is strictly DONT_BORROW', anitaOutput.decision.verdict === 'DONT_BORROW');
assert('Anita: high-cost debt severe hard stop is triggered', anitaOutput.decision.hardStopsTriggered.some(f => f.includes('High-cost debt') || f.includes('highCostDebtSevere')));

// 5. Slider Engine Purity Test
const basePriya = baseSalaried({ requestedAmount: 600000 });
const res6L = runCopilot(basePriya);
const res8L = runCopilot({ ...basePriya, requestedAmount: 800000 });
const res10L = runCopilot({ ...basePriya, requestedAmount: 1000000 });

assert('Slider: changing requested amount updates requested principal in engine', res6L.lenderCapacity.lenderLikelyAmount === res8L.lenderCapacity.lenderLikelyAmount);
assert('Slider: FOIR is unchanged across slider values', res6L.lenderCapacity.foir === res8L.lenderCapacity.foir && res8L.lenderCapacity.foir === res10L.lenderCapacity.foir);
assert('Slider: Safe capacity is unchanged across slider values', res6L.safeCapacity.safeAmount === res8L.safeCapacity.safeAmount);
assert('Slider: Verdict adapts dynamically to requested amount', res6L.decision.verdict === 'BORROW' && res8L.decision.verdict === 'BORROW_LESS');

// 6. SIP Isolation Test
const coreOutputBeforeSIP = runCopilot(basePriya);
const sipA = computeSIPComparison(10000, 36, 12, 50000);
const sipB = computeSIPComparison(10000, 36, 18, 50000);
assert('SIP: higher return rate generates higher future value', sipB.futureValue > sipA.futureValue);
const coreOutputAfterSIP = runCopilot(basePriya);

assert('SIP: SIP returns have zero effect on decision verdict', coreOutputBeforeSIP.decision.verdict === coreOutputAfterSIP.decision.verdict);
assert('SIP: SIP returns have zero effect on safe borrowing amount', coreOutputBeforeSIP.safeCapacity.safeAmount === coreOutputAfterSIP.safeCapacity.safeAmount);
assert('SIP: SIP returns have zero effect on lender capacity', coreOutputBeforeSIP.lenderCapacity.lenderLikelyAmount === coreOutputAfterSIP.lenderCapacity.lenderLikelyAmount);
assert('SIP: SIP returns have zero effect on fair rate band', coreOutputBeforeSIP.fairRate.fairRateMid === coreOutputAfterSIP.fairRate.fairRateMid);
assert('SIP: SIP returns have zero effect on stress test score', coreOutputBeforeSIP.stress.score === coreOutputAfterSIP.stress.score);

// ── Loan Tenure Simulator What-If Tests ──────────────────────────────────────

// 1. Same amount, different tenure: EMI decreases with tenure, total interest increases
const rateTest = 11.5;
const emi36 = computeEMI(800000, rateTest, 36);
const emi48 = computeEMI(800000, rateTest, 48);
const emi60 = computeEMI(800000, rateTest, 60);

assert('Tenure: 36mo EMI > 48mo EMI for same principal and rate', emi36 > emi48);
assert('Tenure: 48mo EMI > 60mo EMI for same principal and rate', emi48 > emi60);

const cost36 = computeLoanCostBreakdown(800000, rateTest, 36, 1.5);
const cost48 = computeLoanCostBreakdown(800000, rateTest, 48, 1.5);
const cost60 = computeLoanCostBreakdown(800000, rateTest, 60, 1.5);

assert('Tenure: 36mo total interest < 48mo total interest', cost36.totalInterest < cost48.totalInterest);
assert('Tenure: 48mo total interest < 60mo total interest', cost48.totalInterest < cost60.totalInterest);

// 2. Safe EMI ceiling remains completely unchanged
const priyaInitial = runCopilot(PERSONA_PRIYA);
const priyaSafeCeiling = priyaInitial.safeCapacity.safeEMI;

// The simulator calculates hypothetical loan EMIs at various tenures:
const hypEMI36 = computeEMI(PERSONA_PRIYA.requestedAmount, priyaInitial.fairRate.fairRateMid, 36);
const hypEMI48 = computeEMI(PERSONA_PRIYA.requestedAmount, priyaInitial.fairRate.fairRateMid, 48);
const hypEMI60 = computeEMI(PERSONA_PRIYA.requestedAmount, priyaInitial.fairRate.fairRateMid, 60);

assert('Tenure: safe EMI ceiling remains ₹24,000 regardless of simulated tenure', priyaSafeCeiling === 24000);
assert('Tenure: 36mo hypothetical EMI is above safe ceiling (₹24k)', hypEMI36 > priyaSafeCeiling);
assert('Tenure: 48mo hypothetical EMI drops below safe ceiling (₹24k)', hypEMI48 < priyaSafeCeiling);
assert('Tenure: 60mo hypothetical EMI is comfortably below safe ceiling', hypEMI60 < priyaSafeCeiling);

// 3. Amount + tenure interaction recalculates through the same engine functions
const simEffCost36 = computeEffectiveCost(800000, rateTest, 36, 'personal_loan');
const simEffCost48 = computeEffectiveCost(800000, rateTest, 48, 'personal_loan');
assert('Tenure: effective cost computes properly across simulated tenures', simEffCost36.effectiveAnnualizedCost > 0 && simEffCost48.effectiveAnnualizedCost > 0);

// 4. Existing default behavior unchanged when simulator untouched
assert('Tenure: Priya original result untouched at default 36mo tenure', priyaInitial.decision.verdict === 'BORROW_LESS' && priyaInitial.safeCapacity.safeEMI === 24000 && Math.abs(priyaInitial.safeCapacity.safeAmount - 728000) / 728000 < 0.03);

// ── Tenure Propagation Regression Tests (Sections 7, 8, 13) ──────────────────

// Section 7: Safe EMI strictly unchanged across tenures, Safe Amount changes and scales
const safeCap12 = computeSafeCapacity(PERSONA_PRIYA, priyaInitial.fairRate.fairRateHigh, 12);
const safeCap24 = computeSafeCapacity(PERSONA_PRIYA, priyaInitial.fairRate.fairRateHigh, 24);
const safeCap36 = computeSafeCapacity(PERSONA_PRIYA, priyaInitial.fairRate.fairRateHigh, 36);
const safeCap48 = computeSafeCapacity(PERSONA_PRIYA, priyaInitial.fairRate.fairRateHigh, 48);

assert('Tenure: Safe EMI at 12m equals Safe EMI at 48m', safeCap12.safeEMI === safeCap48.safeEMI && safeCap12.safeEMI === 24000);
assert('Tenure: Safe EMI at 24m equals Safe EMI at 36m', safeCap24.safeEMI === safeCap36.safeEMI);
assert('Tenure: Safe Amount at 48m > Safe Amount at 12m', safeCap48.safeAmount > safeCap12.safeAmount);
assert('Tenure: Safe Amount at 48m > Safe Amount at 36m', safeCap48.safeAmount > safeCap36.safeAmount);
assert('Tenure: Recommended Amount at 48m > Recommended Amount at 12m', safeCap48.recommendedAmount > safeCap12.recommendedAmount);
assert('Tenure: 90% presentation headroom applied correctly at 48m', Math.abs(safeCap48.recommendedAmount - safeCap48.safeAmount * 0.9) < 1);

// Section 8: Lender capacity regression tests
// 8a. FOIR is binding constraint (unsecured personal loan, Priya)
const lenderCap12 = computeLenderCapacity(PERSONA_PRIYA, priyaInitial.fairRate.fairRateMid, 12);
const lenderCap48 = computeLenderCapacity(PERSONA_PRIYA, priyaInitial.fairRate.fairRateMid, 48);
assert('Tenure: FOIR-supported lender amount at 48m > 12m', lenderCap48.lenderLikelyAmount > lenderCap12.lenderLikelyAmount);
assert('Tenure: FOIR constraint is binding for unsecured loan', lenderCap48.bindingConstraint === 'foir');

// 8b. LTV is binding constraint (secured LAP loan)
// Create a secured borrower with high income but modest collateral
const securedProfile: BorrowerProfile = {
  ...PERSONA_RAVI,
  monthlyIncome: 200000,
  documentedIncome: 200000,
  eligibleIncomeLender: 200000,
  eligibleIncomeSafe: 200000,
  loanPurpose: 'business_expansion',
  collateral: {
    type: 'property_residential',
    statedValue: 1000000, // 10L stated -> 20% haircut = 8L -> 70% LTV = 5.6L cap
  },
  existingEMI: 0,
  businessDebtEMI: 0,
  highCostDebtOutstanding: 0,
  highCostDebtEMI: 0,
};

const securedLender12 = computeLenderCapacity(securedProfile, 11.5, 12);
const securedLender84 = computeLenderCapacity(securedProfile, 11.5, 84);
const ltvCap = 1000000 * 0.80 * 0.70; // 560,000

assert('Tenure (Secured): FOIR amount at 84m exceeds 12m', securedLender84.foirSupportedAmount > securedLender12.foirSupportedAmount);
assert('Tenure (Secured): FOIR amount at 84m exceeds LTV limit', securedLender84.foirSupportedAmount > ltvCap);
assert('Tenure (Secured): Lender amount at 84m is capped strictly by LTV', securedLender84.lenderLikelyAmount === ltvCap && securedLender84.bindingConstraint === 'ltv');

// Section 13: Exact bug regression test (12m -> 48m and reverse 48m -> 12m cache-busting check)
const testProfile = PERSONA_PRIYA;
const requestedPrincipal = 800000;
const testRate = priyaInitial.fairRate.fairRateMid;
const feePct = priyaInitial.effectiveCost.processingFeePct;

// Run 12 months
const simEMI_12 = computeEMI(requestedPrincipal, testRate, 12);
const simSafe_12 = computeSafeCapacity(testProfile, priyaInitial.fairRate.fairRateHigh, 12);
const simLender_12 = computeLenderCapacity(testProfile, testRate, 12);
const simCost_12 = computeLoanCostBreakdown(requestedPrincipal, testRate, 12, feePct);
const simStress_12 = computeStressTest(testProfile, simSafe_12, priyaInitial.fairRate, 12, requestedPrincipal);
const simEff_12 = computeEffectiveCostForProfile(testProfile, requestedPrincipal, testRate, 12);

// Run 48 months
const simEMI_48 = computeEMI(requestedPrincipal, testRate, 48);
const simSafe_48 = computeSafeCapacity(testProfile, priyaInitial.fairRate.fairRateHigh, 48);
const simLender_48 = computeLenderCapacity(testProfile, testRate, 48);
const simCost_48 = computeLoanCostBreakdown(requestedPrincipal, testRate, 48, feePct);
const simStress_48 = computeStressTest(testProfile, simSafe_48, priyaInitial.fairRate, 48, requestedPrincipal);
const simEff_48 = computeEffectiveCostForProfile(testProfile, requestedPrincipal, testRate, 48);

assert('Bug regression: EMI changes for same principal (12m vs 48m)', simEMI_12 !== simEMI_48 && simEMI_12 > simEMI_48);
assert('Bug regression: Safe EMI stays strictly unchanged (12m vs 48m)', simSafe_12.safeEMI === simSafe_48.safeEMI);
assert('Bug regression: Safe amount changes (48m > 12m)', simSafe_48.safeAmount > simSafe_12.safeAmount);
assert('Bug regression: Lender FOIR amount changes (48m > 12m)', simLender_48.lenderLikelyAmount > simLender_12.lenderLikelyAmount);
assert('Bug regression: Total interest increases with tenure (48m > 12m)', simCost_48.totalInterest > simCost_12.totalInterest);
assert('Bug regression: Total repayment increases with tenure (48m > 12m)', simCost_48.totalOutflow > simCost_12.totalOutflow);
assert('Bug regression: Effective cost is recalculated across tenures', simEff_48.effectiveAnnualizedCost > 0 && simEff_12.effectiveAnnualizedCost > 0);
assert('Bug regression: Stress test is recalculated across tenures', simStress_12.baselineRatio > simStress_48.baselineRatio);

// Reverse test (48m -> 12m) to guarantee no accidental state or caching mutation
const simSafe_12_rev = computeSafeCapacity(testProfile, priyaInitial.fairRate.fairRateHigh, 12);
const simLender_12_rev = computeLenderCapacity(testProfile, testRate, 12);
assert('Bug regression reverse: Safe amount at 12m is identical when run after 48m', simSafe_12_rev.safeAmount === simSafe_12.safeAmount);
assert('Bug regression reverse: Lender amount at 12m is identical when run after 48m', simLender_12_rev.lenderLikelyAmount === simLender_12.lenderLikelyAmount);

// Primary assessment preservation check
const priyaAfterSim = runCopilot(PERSONA_PRIYA);
assert('Preservation: Primary assessment safe amount unchanged at default 36m', priyaAfterSim.safeCapacity.safeAmount === priyaInitial.safeCapacity.safeAmount);
assert('Preservation: Primary assessment lender amount unchanged at default 36m', priyaAfterSim.lenderCapacity.lenderLikelyAmount === priyaInitial.lenderCapacity.lenderLikelyAmount);

// ── Salaried Stability & Variable Retention Tests ────────────────────────────
const salariedStableProfile = baseSalaried({ incomeStability: 'stable', variableIncomeShare: 0 });
const resStable = computeSafeCapacity(salariedStableProfile, 12);
assert('Salaried stable: base retention is 50%', resStable.baseRetentionFactor === 0.50);

const salariedUnknownNoVar = baseSalaried({ incomeStability: 'unknown', variableIncomeShare: 0 });
const resUnknownNoVar = computeSafeCapacity(salariedUnknownNoVar, 12);
assert('Salaried unknown with 0 variable pay: base retention is 50%', resUnknownNoVar.baseRetentionFactor === 0.50);

const salariedModerateProfile = baseSalaried({ incomeStability: 'moderate', variableIncomeShare: 0.15 });
const resModerate = computeSafeCapacity(salariedModerateProfile, 12);
assert('Salaried moderate (variable pay): base retention is 40%', resModerate.baseRetentionFactor === 0.40);

const salariedUnstableProfile = baseSalaried({ incomeStability: 'unstable', variableIncomeShare: 0.50 });
const resUnstable = computeSafeCapacity(salariedUnstableProfile, 12);
assert('Salaried unstable (high variable): base retention is 40%', resUnstable.baseRetentionFactor === 0.40);
assert('Salaried unstable (high variable): triggers >30% adjustment of -5pp', resUnstable.adjustments.some(a => a.name.includes('>30%')));

// Questionnaire answers integration test
const answersSalariedFixed = {
  income_type: 'salaried',
  monthly_income: 85000,
  loan_purpose: 'education',
  requested_amount: 1000000,
  existing_emi: 0,
  essential_expenses: 25000,
  income_stability: 'stable',
  high_cost_debt: 'none',
  recent_bounce: 'no',
};
const profileFromAnswers = buildProfileFromAnswers(answersSalariedFixed);
const copilotFromAnswers = runCopilot(profileFromAnswers);
assert('Answers integration: salaried fixed disposable is ₹60,000', copilotFromAnswers.safeCapacity.disposableCashFlow === 60000);
assert('Answers integration: salaried fixed base retention is 50%', copilotFromAnswers.safeCapacity.baseRetentionFactor === 0.50);
assert('Answers integration: salaried fixed safe EMI is ₹30,000 (50% of 60k)', copilotFromAnswers.safeCapacity.safeEMI === 30000);
assert('Answers integration: salaried fixed recommended EMI is ₹27,000 (90% of 30k)', copilotFromAnswers.safeCapacity.recommendedEMI === 27000);

// ── Documented vs. Undocumented Income Normalization (Stage 3.5 Bug Fix) ──────
// 1. Fully documented self-employed: ₹90K claimed, ₹90K documented → lender income ₹90K
const fullDoc = computeEligibleIncomeLender(90000, 90000, false, 0);
assert('Income normalization: fully documented self-employed undocumented portion is ₹0', fullDoc.undocumentedPortion === 0);
assert('Income normalization: fully documented self-employed lender income is ₹90,000 (no haircut)', fullDoc.eligibleIncomeLender === 90000);

// 2. Partially documented self-employed: ₹90K claimed, ₹60K documented → lender income ₹63K unsecured
const partialDoc = computeEligibleIncomeLender(60000, 90000, false, 0);
assert('Income normalization: partially documented undocumented portion is ₹30,000', partialDoc.undocumentedPortion === 30000);
assert('Income normalization: partially documented lender income is ₹63,000 (60k + 10% of 30k)', partialDoc.eligibleIncomeLender === 63000);

// 3. Fully undocumented: claimed ₹30K, documented ₹0 → must NOT use blanket 10% (not ₹3,000)
const undoc30k = computeEligibleIncomeLender(0, 30000, false, 0);
assert('Income normalization: fully undocumented claimed ₹30k does NOT produce blanket ₹3k (produces ₹10,500 baseline surrogate)', undoc30k.eligibleIncomeLender === 10500 && undoc30k.eligibleIncomeLender !== 3000);

// 4. Fully undocumented secured: ₹70K claimed, ₹0 documented → lender income ₹28K secured (40% of 70k)
const undocSecured = computeEligibleIncomeLender(0, 70000, true, 0);
assert('Income normalization: fully undocumented secured lender income is ₹28,000 (40% of 70k)', undocSecured.eligibleIncomeLender === 28000);

// 5. ₹9 Lakh undocumented edge case: claimed ₹9,00,000, documented ₹0
// System must NOT blindly conclude ₹90,000; must cap at ₹25,000 informal ceiling with LOW confidence
const answers9L = {
  monthly_income: 900000,
  income_type: 'informal',
  documentation_status: 'none',
  requested_amount: 500000,
  loan_purpose: 'personal_event',
  existing_emi: 0,
  essential_expenses: 100000,
  high_cost_debt: 'none',
  recent_bounce: 'no',
};
const profile9L = buildProfileFromAnswers(answers9L);
const result9L = runCopilot(profile9L);
assert('9L Edge Case: claimedTotalIncome is ₹9,00,000', profile9L.claimedTotalIncome === 900000);
assert('9L Edge Case: documentedIncome is ₹0', profile9L.documentedIncome === 0);
assert('9L Edge Case: undocumentedPortion is ₹9,00,000', profile9L.undocumentedPortion === 900000);
assert('9L Edge Case: lender-recognized income is capped at ₹25,000 (NOT ₹90,000 blind multiplier)', profile9L.eligibleIncomeLender === 25000 && profile9L.eligibleIncomeLender !== 90000);
assert('9L Edge Case: lender capacity confidence is strictly LOW', result9L.lenderCapacity.confidence === 'LOW');
assert('9L Edge Case: driver contains conservative cap explanation', result9L.lenderCapacity.drivers.some(d => d.includes('capped at ₹25,000/month')));

// 6. Anita regression under new undocumented model
const anitaEdgeProfile = PERSONA_ANITA;
const anitaEdgeResult = runCopilot(anitaEdgeProfile);
assert('Anita regression: claimed income is ₹26,000', anitaEdgeProfile.claimedTotalIncome === 26000);
assert('Anita regression: lender-recognized income is ₹9,100 (NOT ₹2,600)', anitaEdgeProfile.eligibleIncomeLender === 9100 && anitaEdgeProfile.eligibleIncomeLender !== 2600);
assert('Anita regression: high-cost debt payment remains ₹8,750', anitaEdgeProfile.highCostDebtEMI === 8750);
assert('Anita regression: high-cost debt burden is 33.65% (>30% threshold)', anitaEdgeProfile.highCostDebtEMI / anitaEdgeProfile.eligibleIncomeSafe > 0.30);
assert('Anita regression: decision verdict remains strictly DONT_BORROW', anitaEdgeResult.decision.verdict === 'DONT_BORROW');
assert('Anita regression: severe hard stop remains triggered', anitaEdgeResult.decision.hardStopsTriggered.some(s => s.includes('SEVERE')));

// 7. Row 16 complete scenario test via buildProfileFromAnswers and runCopilot
const answersRow16 = {
  monthly_income: 90000,
  income_type: 'self_employed',
  income_stability: 'stable',
  income_stability_biz: 'stable',
  documentation_status: 'full', // ITR available
  essential_expenses: 'unknown',
  existing_emi: 5000,
  high_cost_debt: 'none',
  recent_bounce: 'no',
  credit_score: 750,
  emergency_savings: 4,
  requested_amount: 800000,
  loan_purpose: 'business',
};
const profileRow16 = buildProfileFromAnswers(answersRow16);
const resultRow16 = runCopilot(profileRow16);

assert('Row 16: claimedTotalIncome is ₹90,000', profileRow16.claimedTotalIncome === 90000);
assert('Row 16: documentedIncome is ₹90,000', profileRow16.documentedIncome === 90000);
assert('Row 16: undocumentedPortion is ₹0', profileRow16.undocumentedPortion === 0);
assert('Row 16: eligibleIncomeLender is ₹90,000 (NOT ₹9,000)', profileRow16.eligibleIncomeLender === 90000);
assert('Row 16: FOIR is 45% (self-employed with ITR)', resultRow16.lenderCapacity.foir === 0.45);
assert('Row 16: maxTotalDebtService is ₹40,500 (45% of 90k)', resultRow16.lenderCapacity.maxTotalDebtService === 40500);
assert('Row 16: existing obligations is ₹5,000', resultRow16.lenderCapacity.drivers.some(d => d.includes('Existing obligations: ₹5,000')));
assert('Row 16: availableNewEMI is ₹35,500 (₹40,500 − ₹5,000)', resultRow16.lenderCapacity.availableNewEMI === 35500);
assert('Row 16: essentialExpenses remains ₹58,500 (65% default for unknown SE expenses)', profileRow16.essentialExpenses === 58500);
assert('Row 16: disposableCashFlow is ₹26,500 (₹90k − ₹58.5k − ₹5k)', resultRow16.safeCapacity.disposableCashFlow === 26500);
assert('Row 16: baseRetentionFactor is 40% (SE documented steady)', resultRow16.safeCapacity.baseRetentionFactor === 0.40);
assert('Row 16: safeEMI is ₹10,600 (40% of ₹26,500)', resultRow16.safeCapacity.safeEMI === 10600);
assert('Row 16: lender likely amount is positive and computed via fair-rate midpoint', resultRow16.lenderCapacity.lenderLikelyAmount > 0);

// Partially documented via buildProfileFromAnswers
const answersPartial16 = {
  ...answersRow16,
  documentation_status: 'partial',
  documented_income: 60000,
};
const profilePartial16 = buildProfileFromAnswers(answersPartial16);
assert('Partially documented via answers: documentedIncome is ₹60,000', profilePartial16.documentedIncome === 60000);
assert('Partially documented via answers: undocumentedPortion is ₹30,000', profilePartial16.undocumentedPortion === 30000);
assert('Partially documented via answers: eligibleIncomeLender is ₹63,000 (60k + 10% of 30k)', profilePartial16.eligibleIncomeLender === 63000);

// Partially documented via annual ITR question
const answersPartialITR = {
  ...answersRow16,
  documentation_status: 'partial',
  documented_income_itr: 720000, // 7.2L/yr = 60k/mo
};
const profilePartialITR = buildProfileFromAnswers(answersPartialITR);
assert('Partially documented via annual ITR: documentedIncome is ₹60,000', profilePartialITR.documentedIncome === 60000);
assert('Partially documented via annual ITR: eligibleIncomeLender is ₹63,000', profilePartialITR.eligibleIncomeLender === 63000);

// 8. Verify that changing documentation status does NOT alter borrower-safe income calculation
const answersUndoc16 = {
  ...answersRow16,
  documentation_status: 'none',
};
const profileUndoc16 = buildProfileFromAnswers(answersUndoc16);
assert('Safe capacity preservation: full doc safe income is ₹90,000', profileRow16.eligibleIncomeSafe === 90000);
assert('Safe capacity preservation: undocumented safe income remains ₹90,000', profileUndoc16.eligibleIncomeSafe === 90000);
assert('Safe capacity preservation: safe income is unaffected by documentation haircut', profileRow16.eligibleIncomeSafe === profileUndoc16.eligibleIncomeSafe);
assert('Lender income differs between full doc (₹90k) and undocumented (capped at ₹25k)', profileRow16.eligibleIncomeLender === 90000 && profileUndoc16.eligibleIncomeLender === 25000);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`EDGE CASE TESTS: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error('❌ Some edge case tests failed.');
} else {
  console.log('✅ All edge case tests passed.');
}
