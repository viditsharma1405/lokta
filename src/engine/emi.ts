// ─────────────────────────────────────────────────────────────────────────────
// EMI Engine — pure math, no UI dependency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard EMI formula: P × r × (1+r)^n / ((1+r)^n − 1)
 * @param principal ₹
 * @param annualRatePct % per year (e.g., 12 for 12%)
 * @param tenureMonths integer months
 */
export function computeEMI(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) {
    // Zero-interest edge case: simple division
    return principal / tenureMonths;
  }
  const r = annualRatePct / 100 / 12;
  const n = tenureMonths;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

/**
 * Inverse EMI: given a desired EMI, find the maximum principal.
 * P = EMI × [1 − (1+r)^(−n)] / r
 */
export function principalFromEMI(
  desiredEMI: number,
  annualRatePct: number,
  tenureMonths: number
): number {
  if (desiredEMI <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) {
    return desiredEMI * tenureMonths;
  }
  const r = annualRatePct / 100 / 12;
  const n = tenureMonths;
  return desiredEMI * (1 - Math.pow(1 + r, -n)) / r;
}

export function totalRepayment(emi: number, tenureMonths: number): number {
  return emi * tenureMonths;
}

export function totalInterest(principal: number, emi: number, tenureMonths: number): number {
  return totalRepayment(emi, tenureMonths) - principal;
}

/**
 * Solve for effective monthly rate r' using bisection method.
 * netProceeds = EMI × [1 − (1+r')^(−n)] / r'
 */
export function solveEffectiveMonthlyRate(
  netProceeds: number,
  emi: number,
  tenureMonths: number,
  maxIterations = 200
): number {
  if (netProceeds <= 0 || emi <= 0) return 0;

  // Edge case: EMI × n close to netProceeds → very low rate
  if (emi * tenureMonths <= netProceeds) return 0;

  let lo = 0.00001;
  let hi = 1.0; // 100%/month — absurdly high upper bound

  const pv = (r: number) => emi * (1 - Math.pow(1 + r, -tenureMonths)) / r;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const computed = pv(mid);
    if (Math.abs(computed - netProceeds) < 0.01) return mid;
    if (computed > netProceeds) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

export function effectiveAnnualizedCost(monthlyRate: number): number {
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100; // returns as %
}

export interface LoanCostBreakdown {
  principal: number;
  monthlyEMI: number;
  tenureMonths: number;
  annualRatePct: number;
  totalRepayment: number;
  totalInterest: number;
  estimatedProcessingFee: number;
  totalOutflow: number;
  interestPercentOfPrincipal: number;
  costMultiple: number; // e.g. 1.25x (totalOutflow / principal)
  principalSharePct: number;
  interestSharePct: number;
  feeSharePct: number;
}

/**
 * Calculates complete breakdown of total cash to be paid over the loan tenure.
 */
export function computeLoanCostBreakdown(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
  processingFeePct = 1.5
): LoanCostBreakdown {
  if (principal <= 0 || tenureMonths <= 0) {
    return {
      principal: 0,
      monthlyEMI: 0,
      tenureMonths: Math.max(0, tenureMonths),
      annualRatePct,
      totalRepayment: 0,
      totalInterest: 0,
      estimatedProcessingFee: 0,
      totalOutflow: 0,
      interestPercentOfPrincipal: 0,
      costMultiple: 1,
      principalSharePct: 100,
      interestSharePct: 0,
      feeSharePct: 0,
    };
  }

  const monthlyEMI = computeEMI(principal, annualRatePct, tenureMonths);
  const totalRepay = totalRepayment(monthlyEMI, tenureMonths);
  const interest = Math.max(0, totalRepay - principal);
  const estimatedProcessingFee = principal * (processingFeePct / 100);
  const totalOutflow = totalRepay + estimatedProcessingFee;

  const costMultiple = principal > 0 ? totalOutflow / principal : 1;
  const interestPercentOfPrincipal = principal > 0 ? (interest / principal) * 100 : 0;

  const principalSharePct = totalOutflow > 0 ? (principal / totalOutflow) * 100 : 100;
  const interestSharePct = totalOutflow > 0 ? (interest / totalOutflow) * 100 : 0;
  const feeSharePct = totalOutflow > 0 ? (estimatedProcessingFee / totalOutflow) * 100 : 0;

  return {
    principal,
    monthlyEMI,
    tenureMonths,
    annualRatePct,
    totalRepayment: totalRepay,
    totalInterest: interest,
    estimatedProcessingFee,
    totalOutflow,
    interestPercentOfPrincipal,
    costMultiple,
    principalSharePct,
    interestSharePct,
    feeSharePct,
  };
}

export interface InvestmentComparison {
  monthlyInvestment: number;
  tenureMonths: number;
  annualReturnPct: number;
  totalInvested: number;
  futureValue: number;
  wealthGain: number;
  netWealthDifference: number; // wealthGain + interest paid (opportunity cost delta)
}

/**
 * Calculates what happens if the borrower invests the monthly EMI in a SIP instead of borrowing.
 * Uses standard annuity due (payments at start of period) compounding monthly.
 */
export function computeSIPComparison(
  monthlyInvestment: number,
  tenureMonths: number,
  annualReturnPct = 12,
  totalInterestPaid = 0
): InvestmentComparison {
  if (monthlyInvestment <= 0 || tenureMonths <= 0) {
    return {
      monthlyInvestment: 0,
      tenureMonths: Math.max(0, tenureMonths),
      annualReturnPct,
      totalInvested: 0,
      futureValue: 0,
      wealthGain: 0,
      netWealthDifference: 0,
    };
  }

  const totalInvested = monthlyInvestment * tenureMonths;

  if (annualReturnPct <= 0) {
    return {
      monthlyInvestment,
      tenureMonths,
      annualReturnPct,
      totalInvested,
      futureValue: totalInvested,
      wealthGain: 0,
      netWealthDifference: totalInterestPaid,
    };
  }

  const i = annualReturnPct / 100 / 12;
  const n = tenureMonths;
  // FV = P * [ ((1+i)^n - 1) / i ] * (1+i)
  const factor = Math.pow(1 + i, n);
  const futureValue = monthlyInvestment * ((factor - 1) / i) * (1 + i);
  const wealthGain = Math.max(0, futureValue - totalInvested);
  const netWealthDifference = wealthGain + totalInterestPaid;

  return {
    monthlyInvestment,
    tenureMonths,
    annualReturnPct,
    totalInvested,
    futureValue,
    wealthGain,
    netWealthDifference,
  };
}

