// ─────────────────────────────────────────────────────────────────────────────
// Question Engine — converts raw questionnaire answers into a BorrowerProfile
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile, IncomeType, IncomeStability, DocumentationStatus, RepaymentHistory, CreditScoreStatus, CollateralType, LoanPurpose } from '../types/profile';
import {
  computeClaimedIncome,
  computeEligibleIncomeLender,
  computeEligibleIncomeSafe,
  computeEssentialExpenses,
  computeExistingEMI,
  computeHighCostDebtEMI,
  isSecuredProduct,
} from '../engine/income';

export type Answers = Record<string, string | number | null | undefined>;

function num(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === 'unknown') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function str(val: string | number | null | undefined): string {
  return val === null || val === undefined ? '' : String(val);
}

export function buildProfileFromAnswers(answers: Answers): BorrowerProfile {
  const incomeType = str(answers.income_type) as IncomeType || 'salaried';
  const rawPurpose = str(answers.loan_purpose);
  const loanPurpose = (rawPurpose === 'business' ? 'business_expansion' : rawPurpose) as LoanPurpose || 'personal_event';
  const requestedAmount = num(answers.requested_amount) ?? 0;

  // Documentation Status (resolved early so income normalization can use it)
  const docRaw = str(answers.documentation_status) || str(answers.documentation);
  let documentationStatus: DocumentationStatus = 'unknown';
  if (
    docRaw === 'full' ||
    docRaw === 'itr' ||
    docRaw === 'itr_available' ||
    docRaw.toLowerCase().includes('itr') ||
    docRaw === 'complete' ||
    docRaw === 'yes'
  ) {
    documentationStatus = 'full';
  } else if (docRaw === 'partial') {
    documentationStatus = 'partial';
  } else if (docRaw === 'none' || docRaw === 'no' || docRaw === 'undocumented') {
    documentationStatus = 'none';
  } else if (answers.has_itr === 'yes' || String(answers.has_itr) === 'true' || String(answers.itr_available) === 'true' || answers.itr_available === 'yes') {
    documentationStatus = 'full';
  } else if (incomeType === 'salaried' && (!docRaw || docRaw === 'unknown')) {
    // Salaried borrowers are assumed fully documented (salary slips) by default
    documentationStatus = 'full';
  }

  // Income
  const rawMonthlyIncome = num(answers.monthly_income) ?? 0;
  const businessTenure = num(answers.business_tenure) ?? undefined;
  const itrAnnual = num(answers.documented_income_itr);
  const rangeLow = num(answers.income_range_low);
  const rangeHigh = num(answers.income_range_high);
  const explicitDocIncome = num(answers.documented_income) ?? num(answers.documentedIncome) ?? num(answers.documented_monthly_income);
  const explicitClaimedIncome = num(answers.claimed_total_income) ?? num(answers.claimedTotalIncome);

  let claimedTotalIncome: number;
  if (explicitClaimedIncome !== null) {
    claimedTotalIncome = explicitClaimedIncome;
  } else if (rangeLow !== null && rangeHigh !== null) {
    claimedTotalIncome = computeClaimedIncome(incomeType, null, rangeLow, rangeHigh, businessTenure);
  } else {
    claimedTotalIncome = rawMonthlyIncome;
  }

  // If claimedTotalIncome is 0, fall back to ITR or explicit documented income
  if (claimedTotalIncome === 0 && itrAnnual !== null && itrAnnual > 0) {
    claimedTotalIncome = itrAnnual / 12;
  } else if (claimedTotalIncome === 0 && explicitDocIncome !== null && explicitDocIncome > 0) {
    claimedTotalIncome = explicitDocIncome;
  }

  let documentedIncome: number | null = null;
  const isDocUnknown = docRaw === 'unknown' || answers.documented_income === 'unknown' || answers.documented_monthly_income === 'unknown' || answers.documented_income_itr === 'unknown';

  if (isDocUnknown) {
    documentationStatus = 'unknown';
    documentedIncome = null;
  } else if (explicitDocIncome !== null) {
    documentedIncome = explicitDocIncome;
    if (documentationStatus === 'unknown') {
      documentationStatus = documentedIncome >= claimedTotalIncome ? 'full' : (documentedIncome > 0 ? 'partial' : 'none');
    }
  } else if (itrAnnual !== null && itrAnnual > 0) {
    documentedIncome = itrAnnual / 12;
    if (documentationStatus === 'unknown') {
      documentationStatus = documentedIncome >= claimedTotalIncome ? 'full' : 'partial';
    }
  } else if (incomeType === 'salaried' || documentationStatus === 'full') {
    // Fully documented borrower: claimedTotalIncome = documentedIncome
    documentedIncome = claimedTotalIncome;
  } else if (documentationStatus === 'none') {
    documentedIncome = 0;
  } else {
    // documentationStatus === 'partial' (without explicit number) or 'unknown'
    documentedIncome = documentationStatus === 'unknown' ? null : 0;
  }

  // Claimed income should not be less than verified documented income
  if (documentedIncome !== null && documentedIncome > claimedTotalIncome) {
    claimedTotalIncome = documentedIncome;
  }

  // Collateral
  const collateralType = str(answers.collateral_available) as CollateralType || 'none';
  const collateralValue = collateralType !== 'none' ? num(answers.collateral_value) : null;

  // Co-applicant
  const hasCo = str(answers.co_applicant) === 'yes';
  const coApplicantIncome = hasCo ? (num(answers.co_applicant_income) ?? 0) : 0;

  // Determine if secured product
  // Build a temporary loan type to check
  const hasCollateral = collateralType !== 'none' && collateralValue !== null && collateralValue > 0;
  let loanTypeForSecured = 'personal_loan';
  if (loanPurpose === 'home_purchase') loanTypeForSecured = 'home_loan';
  else if (loanPurpose === 'vehicle') loanTypeForSecured = 'two_wheeler_loan';
  else if (loanPurpose === 'business_expansion') {
    if (hasCollateral) loanTypeForSecured = collateralType === 'property_commercial' ? 'lap_commercial' : 'lap';
    else loanTypeForSecured = 'business_loan';
  }
  else if (collateralType === 'gold') loanTypeForSecured = 'gold_loan';
  const secured = isSecuredProduct(loanTypeForSecured);

  const stabilityStr = str(answers.income_stability) || str(answers.income_stability_biz) || str(answers.income_stability_informal);
  let incomeStability: IncomeStability = 'unknown';
  if (stabilityStr === 'stable') incomeStability = 'stable';
  else if (stabilityStr === 'moderate') incomeStability = 'moderate';
  else if (stabilityStr === 'unstable') incomeStability = 'unstable';
  else if (incomeType === 'salaried' && (!answers.variable_income_share || num(answers.variable_income_share) === 0)) {
    // Standard salaried income with no variable component is stable fixed salary
    incomeStability = 'stable';
  }

  const { undocumentedPortion, eligibleIncomeLender } =
    computeEligibleIncomeLender(
      documentedIncome,
      claimedTotalIncome,
      secured,
      coApplicantIncome,
      {
        documentationStatus,
        incomeStability,
        businessTenure,
        isSecured: secured,
        hasRecords: documentationStatus === 'partial',
      }
    );
  const eligibleIncomeSafe = computeEligibleIncomeSafe(claimedTotalIncome, coApplicantIncome);

  // Existing EMI
  const rawEMI = str(answers.existing_emi) === 'unknown' ? null : num(answers.existing_emi);
  const { value: existingEMI, isDefaulted: existingEMIIsDefaulted } =
    computeExistingEMI(rawEMI, eligibleIncomeSafe);

  // Business debt
  const businessDebtEMI = num(answers.business_debt) ?? 0;

  // High-cost debt
  const hasHighCost = str(answers.high_cost_debt) === 'has_debt';
  const highCostOutstanding = hasHighCost ? (num(answers.high_cost_debt_amount) ?? 0) : 0;
  const rawHighCostMonthly = hasHighCost
    ? (str(answers.high_cost_debt_monthly) === 'unknown' ? null : num(answers.high_cost_debt_monthly))
    : null;
  const hcd = hasHighCost
    ? computeHighCostDebtEMI(rawHighCostMonthly, highCostOutstanding)
    : { value: 0, isDefaulted: false, range: undefined };

  // Essential expenses
  const rawExpenses = str(answers.essential_expenses) === 'unknown' ? null : num(answers.essential_expenses);
  let expenseInput = rawExpenses;
  if (expenseInput === null && answers.expense_bucket && str(answers.expense_bucket) !== 'unknown') {
    expenseInput = num(answers.expense_bucket);
  }
  const expenses = computeEssentialExpenses(expenseInput, incomeType, eligibleIncomeSafe);

  // Credit score
  const creditScoreRaw = str(answers.credit_score);
  let creditScore: number | null = null;
  let creditScoreStatus: CreditScoreStatus = 'unknown';
  if (creditScoreRaw === 'thin_file') {
    creditScoreStatus = 'thin_file';
  } else if (creditScoreRaw && creditScoreRaw !== 'unknown' && creditScoreRaw !== '') {
    creditScore = parseInt(creditScoreRaw);
    creditScoreStatus = isNaN(creditScore) ? 'unknown' : 'known';
  }

  // Repayment history
  const repaymentRaw = str(answers.repayment_history);
  let repaymentHistory: RepaymentHistory = 'unknown';
  if (repaymentRaw === 'clean') repaymentHistory = 'clean';
  else if (repaymentRaw === 'bounce') repaymentHistory = 'bounce';

  const recentBounce = str(answers.recent_bounce) === 'yes' || repaymentHistory === 'bounce';

  // Stability was resolved during income normalization above

  // Documentation status was resolved during income normalization above

  // Dependents
  const dependents = num(answers.dependents) ?? 0;
  const hasOtherEarner = str(answers.other_earner) === 'yes' || coApplicantIncome > 0;

  // Emergency savings
  const savingsRaw = str(answers.emergency_savings);
  let emergencySavingsMonths: number | null = null;
  if (savingsRaw && savingsRaw !== 'unknown' && savingsRaw !== '') {
    emergencySavingsMonths = parseFloat(savingsRaw);
  }

  // Upcoming large expense
  const upcomingLargeExpense = str(answers.upcoming_large_expense) === 'yes';

  // Variable income share
  const variableRaw = num(answers.variable_income_share);
  let variableIncomeShare = 0;
  if (variableRaw !== null) {
    variableIncomeShare = variableRaw / 100;
  } else if (incomeStability === 'moderate') {
    variableIncomeShare = 0.15;
  } else if (incomeStability === 'unstable') {
    variableIncomeShare = 0.50;
  }

  // Productive return (display only)
  const isProductiveLoan = str(answers.productive_return) === 'yes';

  return {
    incomeType,
    loanPurpose,
    requestedAmount,
    documentedIncome,
    claimedTotalIncome,
    undocumentedPortion,
    eligibleIncomeLender,
    eligibleIncomeSafe,
    existingEMI,
    existingEMIIsDefaulted,
    businessDebtEMI,
    highCostDebtEMI: hcd.value,
    highCostDebtEMIIsDefaulted: hcd.isDefaulted,
    highCostDebtEMIRange: hcd.range,
    highCostDebtOutstanding: highCostOutstanding,
    essentialExpenses: expenses.value,
    essentialExpensesIsDefaulted: expenses.isDefaulted,
    essentialExpensesRange: expenses.range,
    collateral: { type: collateralType, statedValue: collateralValue },
    creditScore,
    creditScoreStatus,
    repaymentHistory,
    recentBounce,
    incomeStability,
    documentationStatus,
    dependents,
    hasOtherEarner,
    coApplicantIncome,
    emergencySavingsMonths,
    upcomingLargeExpense,
    employmentTenure: str(answers.employment_tenure) as BorrowerProfile['employmentTenure'] || undefined,
    businessTenure,
    variableIncomeShare,
    isProductiveLoan,
  };
}
