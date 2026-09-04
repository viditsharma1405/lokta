export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CalculationOutput {
  confidence: ConfidenceLevel;
  explanation: string;
}

export interface TenureOption {
  months: number;
  label: string;
  emi: number;
  totalRepayment: number;
  totalInterest: number;
}

export interface NegotiationCard {
  verdict: string;
  verdictReason: string;
  isMathematicalOnly: boolean; // true for DONT_BORROW
  requestedAmount: number;
  lenderLikelyAmount: number;
  safeAmount: number;
  recommendedAmount: number;
  safeAmountRange?: { low: number; high: number };
  fairRateLow: number;
  fairRateHigh: number;
  effectiveAnnualizedCostLow: number;
  effectiveAnnualizedCostHigh: number;
  safeEMI: number;
  recommendedEMI: number;
  stressClassification: string;
  stressExplanation: string;
  reasons: string[];
  productRoute: string;
  securityWarning?: string;
  checklist: string[];
  negotiationScript: string;
  confidenceSummary: string;
  disclaimer: string;
}
