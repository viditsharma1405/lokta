// ─────────────────────────────────────────────────────────────────────────────
// Provenance Model — Section 8 of Lokta judging rules
// Every material financial value retains provenance:
//   FACT: Benchmark/external identity
//   USER_ANSWER: Directly reported by the borrower
//   ASSUMPTION: Model fallback, product judgement tier, or conservative estimate
//   DERIVED: Mathematically calculated output
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type {
  CopilotOutput,
  ProvenanceItem,
  ProvenanceTag,
} from '../types/calculations';

function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function buildProvenanceSummary(
  profile: BorrowerProfile,
  output: Omit<CopilotOutput, 'provenanceSummary'>
): ProvenanceItem[] {
  const items: ProvenanceItem[] = [];

  // 1. Monthly Income
  items.push({
    id: 'monthly_income',
    label: 'Claimed Monthly Income',
    value: formatRupees(profile.claimedTotalIncome),
    tag: 'USER_ANSWER' as ProvenanceTag,
    explanation:
      profile.incomeType === 'salaried'
        ? 'Reported by you as your monthly take-home salary.'
        : 'Based on your reported earnings range and tenure.',
  });

  // 2. Documented Income
  items.push({
    id: 'documented_income',
    label: 'Documented Income',
    value:
      profile.documentedIncome === null
        ? 'Unknown (silence preserved)'
        : formatRupees(profile.documentedIncome),
    tag:
      profile.documentedIncome === null
        ? ('ASSUMPTION' as ProvenanceTag)
        : ('USER_ANSWER' as ProvenanceTag),
    explanation:
      profile.documentedIncome === null
        ? 'Documentation status unknown — no false precision or arbitrary zero assumed.'
        : `Supported with formal records (ITR, payslips, or statements) at ${formatRupees(profile.documentedIncome)}/month.`,
  });

  // 3. Lender-Recognized Income
  items.push({
    id: 'lender_recognized_income',
    label: 'Lender-Recognized Income',
    value: formatRupees(profile.eligibleIncomeLender),
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Documented income recognized at 100% plus conservative tiered recognition on the undocumented portion.',
  });

  // 4. Essential Expenses
  items.push({
    id: 'essential_expenses',
    label: 'Essential Living Expenses',
    value: formatRupees(profile.essentialExpenses),
    tag: profile.essentialExpensesIsDefaulted
      ? ('ASSUMPTION' as ProvenanceTag)
      : ('USER_ANSWER' as ProvenanceTag),
    explanation: profile.essentialExpensesIsDefaulted
      ? 'Conservative regional default assumption (55% salaried / 65% SE & informal) because expenses were not specified.'
      : 'Reported directly by you as essential living necessities that cannot be skipped.',
  });

  // 5. Existing Debt Service
  items.push({
    id: 'existing_debt',
    label: 'Existing Monthly Debt Service',
    value: formatRupees(
      profile.existingEMI + profile.businessDebtEMI + profile.highCostDebtEMI
    ),
    tag:
      profile.existingEMIIsDefaulted || profile.highCostDebtEMIIsDefaulted
        ? ('ASSUMPTION' as ProvenanceTag)
        : ('USER_ANSWER' as ProvenanceTag),
    explanation:
      profile.highCostDebtEMIIsDefaulted
        ? 'Includes high-cost debt fallback (25% of balance) because monthly payment was unknown.'
        : 'Reported directly by you as active ongoing monthly payments.',
  });

  // 6. Safe Disposable Cash Flow
  items.push({
    id: 'disposable_cash_flow',
    label: 'Disposable Monthly Cash Flow',
    value: formatRupees(output.safeCapacity.disposableCashFlow),
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Calculated as: Safe Income − Essential Expenses − Existing EMIs − High-Cost Debt Payments.',
  });

  // 7. Safe Retention Factor
  items.push({
    id: 'retention_factor',
    label: 'Cash Retention Factor',
    value: `${(output.safeCapacity.adjustedRetentionFactor * 100).toFixed(0)}%`,
    tag: 'ASSUMPTION' as ProvenanceTag,
    explanation:
      'Product judgement setting the maximum fraction of disposable surplus that can safely service new debt (10%–55% clamp).',
  });

  // 8. Safe EMI Ceiling
  items.push({
    id: 'safe_emi',
    label: 'Borrower Safe EMI Ceiling',
    value: `${formatRupees(output.safeCapacity.safeEMI)}/month`,
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Calculated as: Disposable Cash Flow × Adjusted Retention Factor. Hard ceiling never to be breached.',
  });

  // 9. Recommended EMI
  items.push({
    id: 'recommended_emi',
    label: 'Recommended EMI',
    value: `${formatRupees(output.safeCapacity.recommendedEMI)}/month`,
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Safe EMI × 90% presentation headroom (applied exactly once for a safety buffer).',
  });

  // 10. Lender-Likely Amount
  items.push({
    id: 'lender_amount',
    label: 'Lender-Likely Principal',
    value: formatRupees(output.lenderCapacity.lenderLikelyAmount),
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Principal supported by lender FOIR debt-service capacity (capped by LTV ceiling if secured loan).',
  });

  // 11. Borrower-Safe Amount
  items.push({
    id: 'safe_amount',
    label: 'Borrower-Safe Principal',
    value: formatRupees(output.safeCapacity.recommendedAmount),
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Principal supported by your recommended EMI amortized at the fair-rate ceiling.',
  });

  // 12. Fair Rate Midpoint
  items.push({
    id: 'fair_rate_mid',
    label: 'Fair Benchmark Rate',
    value: `${output.fairRate.fairRateMid.toFixed(2)}% p.a.`,
    tag: 'DERIVED' as ProvenanceTag,
    explanation:
      'Calculated from market rate band positioned by credit score, tenure, and repayment history.',
  });

  return items;
}
