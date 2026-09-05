// ─────────────────────────────────────────────────────────────────────────────
// Persona Validation Tests
// These verify the engine against Stage 2.5's corrected walkthrough figures.
// Run: npx tsx src/tests/personaTests.ts
// ─────────────────────────────────────────────────────────────────────────────

import { runCopilot } from '../engine/index';
import { PERSONA_PRIYA, PERSONA_RAVI, PERSONA_ANITA } from '../data/personas';

type TestResult = {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
};

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;

function approx(actual: number, expected: number, tolerancePct = 2): boolean {
  const tol = Math.abs(expected) * tolerancePct / 100;
  return Math.abs(actual - expected) <= Math.max(tol, 100); // min ₹100 tolerance
}

function test(name: string, actual: number, expected: number, tolerancePct = 2) {
  const passed = approx(actual, expected, tolerancePct);
  results.push({
    name,
    passed,
    expected: `≈ ₹${expected.toLocaleString('en-IN')} (±${tolerancePct}%)`,
    actual: `₹${Math.round(actual).toLocaleString('en-IN')}`,
  });
  if (passed) passCount++; else failCount++;
}

function testStr(name: string, actual: string, expected: string) {
  const passed = actual === expected;
  results.push({
    name,
    passed,
    expected,
    actual,
  });
  if (passed) passCount++; else failCount++;
}

function testBool(name: string, actual: boolean, expected: boolean) {
  const passed = actual === expected;
  results.push({
    name,
    passed,
    expected: String(expected),
    actual: String(actual),
  });
  if (passed) passCount++; else failCount++;
}

function testRange(name: string, actual: number, low: number, high: number) {
  const passed = actual >= low && actual <= high;
  results.push({
    name,
    passed,
    expected: `${low.toFixed(2)}% – ${high.toFixed(2)}%`,
    actual: `${actual.toFixed(2)}%`,
  });
  if (passed) passCount++; else failCount++;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIYA — Stage 2.5 Section 13
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── PRIYA ──');
const priya = runCopilot(PERSONA_PRIYA);
test('Priya: lender-likely amount', priya.lenderCapacity.lenderLikelyAmount, 1257000, 2);
test('Priya: safe EMI ceiling', priya.safeCapacity.safeEMI, 24000, 1);
test('Priya: recommended EMI', priya.safeCapacity.recommendedEMI, 21600, 1);
test('Priya: safe amount', priya.safeCapacity.safeAmount, 728000, 3);
test('Priya: recommended amount', priya.safeCapacity.recommendedAmount, 655000, 3);
testRange('Priya: fair rate low', priya.fairRate.fairRateLow, 10.0, 11.0);
testRange('Priya: fair rate high', priya.fairRate.fairRateHigh, 12.0, 12.5);
testStr('Priya: verdict', priya.decision.verdict, 'BORROW_LESS');

// ─────────────────────────────────────────────────────────────────────────────
// RAVI — Stage 2.5 Section 14
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── RAVI ──');
const ravi = runCopilot(PERSONA_RAVI);
test('Ravi: lender-likely amount', ravi.lenderCapacity.lenderLikelyAmount, 2160000, 2);
test('Ravi: safe EMI ceiling', ravi.safeCapacity.safeEMI, 10920, 2);
test('Ravi: recommended EMI', ravi.safeCapacity.recommendedEMI, 9828, 2);
// NOTE: Stage 2.5 Section 14 uses factor=51.83 for 12.5%, 84mo which corresponds to ~15%.
// The standard EMI formula gives factor=55.80 for 12.5%, 84mo.
// Our formula is mathematically correct. The Stage 2.5 walkthrough has a factor typo.
// Expected amounts using correct math: safeAmt ≈ ₹6.09L, recAmt ≈ ₹5.48L.
test('Ravi: safe amount', ravi.safeCapacity.safeAmount, 609333, 3);
test('Ravi: recommended amount', ravi.safeCapacity.recommendedAmount, 548400, 3);
testRange('Ravi: fair rate low', ravi.fairRate.fairRateLow, 10.5, 11.5);
testRange('Ravi: fair rate high', ravi.fairRate.fairRateHigh, 12.0, 13.0);
testStr('Ravi: verdict', ravi.decision.verdict, 'BORROW_LESS');

// ─────────────────────────────────────────────────────────────────────────────
// ANITA — Stage 2.5 Section 15 (with Stage 3 arithmetic correction)
// Note: The correction is ₹26,000 − ₹16,900 − ₹8,750 = ₹350 NOT ₹300.
// safe EMI = ₹350 × 10% = ₹35; recommended EMI = ₹35 × 90% = ₹31.50
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── ANITA ──');
const anita = runCopilot(PERSONA_ANITA);
// Verify arithmetic correction
const _anitaDisposable = PERSONA_ANITA.eligibleIncomeSafe - PERSONA_ANITA.essentialExpenses - PERSONA_ANITA.highCostDebtEMI;
test('Anita: disposable cash flow', anita.safeCapacity.disposableCashFlow, 350, 10);
test('Anita: safe EMI', anita.safeCapacity.safeEMI, 35, 15);
test('Anita: recommended EMI', anita.safeCapacity.recommendedEMI, 31.5, 15);
test('Anita: high-cost-debt EMI fallback', PERSONA_ANITA.highCostDebtEMI, 8750, 0.1);
test('Anita: lender-likely amount', anita.lenderCapacity.lenderLikelyAmount, 0, 50);
testStr('Anita: verdict', anita.decision.verdict, 'DONT_BORROW');
testBool('Anita: severe hard stop triggered', anita.decision.hardStopsTriggered.some(s => s.includes('SEVERE')), true);
testBool('Anita: compound hard stop triggered', anita.decision.hardStopsTriggered.some(s => s.includes('COMPOUND')), true);

// Print results
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('PERSONA VALIDATION RESULTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const r of results) {
  const status = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}  ${r.name}`);
  if (!r.passed) {
    console.log(`         Expected: ${r.expected}`);
    console.log(`         Actual:   ${r.actual}`);
  }
}
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) {
  console.error('\n❌ Some tests failed. Check engine calculations.');
  process.exit(1);
} else {
  console.log('\n✅ All persona tests passed.');
}
