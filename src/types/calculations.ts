import type { ConfidenceLevel, CalculationOutput } from './results';

export type Verdict = 'BORROW' | 'BORROW_LESS' | 'DONT_BORROW';
export type StressClassification = 'Comfortable' | 'Tight' | 'Stressed' | 'Unsustainable';

export interface LenderDocBreakdown {
  claimedTotalIncome: number;
  documentedIncome: number | null;
  undocumentedPortion: number | null;
  recognitionRate: number;
  recognitionTierLabel: string;
  recognitionRange?: { low: number; high: number };
  recognizedUndocumented: number;
  eligibleIncomeLender: number;
  isProductJudgement: boolean;
}

export interface LenderCapacityResult extends CalculationOutput {
  foir: number;
  foirSupportedAmount: number;
  ltvSupportedAmount: number | null;
  bindingConstraint: 'foir' | 'ltv' | 'both';
  availableNewEMI: number;
  maxTotalDebtService: number;
  lenderLikelyAmount: number;
  lenderLikelyAmountRange?: { low: number; high: number };
  lenderRecognizedIncomeRange?: { low: number; high: number };
  docBreakdown?: LenderDocBreakdown;
  confidence: ConfidenceLevel;
  explanation: string;
  drivers: string[];
}

export interface SafeCapacityResult extends CalculationOutput {
  disposableCashFlow: number;
  baseRetentionFactor: number;
  adjustments: Array<{ name: string; value: number; reason: string }>;
  adjustedRetentionFactor: number;
  safeEMI: number;         // hard O4 ceiling — never discounted further
  recommendedEMI: number;  // safeEMI × 0.90 — applied exactly once
  safeAmount: number;      // EMI→Principal(safeEMI, fairRateCeiling, defaultTenure)
  recommendedAmount: number; // EMI→Principal(recommendedEMI, fairRateCeiling, defaultTenure)
  safeAmountRange?: { low: number; high: number }; // if expenses defaulted
  confidence: ConfidenceLevel;
  explanation: string;
  drivers: string[];
}

export interface FairRateResult extends CalculationOutput {
  baseBandLow: number;    // %
  baseBandHigh: number;   // %
  startingPosition: number;  // 50
  adjustments: Array<{ factor: string; value: number; reason: string }>;
  finalPosition: number;     // clamped 0–100
  halfWidth: number;
  unknownCount: number;
  bandLowPosition: number;
  bandHighPosition: number;
  fairRateLow: number;    // %
  fairRateHigh: number;   // %
  fairRateMid: number;    // midpoint for EMI calculations
  confidence: ConfidenceLevel;
  explanation: string;
  drivers: string[];
}

export interface EffectiveCostResult extends CalculationOutput {
  principal: number;
  nominalRate: number;     // %/year
  tenureMonths: number;
  emi: number;
  processingFeeAmount: number;
  processingFeePct: number;
  netProceeds: number;
  effectiveMonthlyRate: number;  // r'
  effectiveAnnualizedCost: number; // (1+r')^12 - 1, as %
  effectiveAnnualizedCostRange?: { low: number; high: number }; // fee range
  includedItems: string[];
  excludedItems: string[];
  confidence: ConfidenceLevel;
  explanation: string;
}

export interface StressScenario {
  type: 'income_shock' | 'rate_shock';
  label: string;
  stressedRatio: number;   // as fraction
  stressedRatioPct: number; // as %
  classification: StressClassification;
  explanation: string;
}

export interface StressResult extends CalculationOutput {
  numerator: number;  // recommendedEMI + existingEMI + businessDebtEMI + highCostDebtEMI
  baselineRatio: number;
  baselineClassification: StressClassification;
  incomeShock: StressScenario;
  rateShock: StressScenario;
  confidence: ConfidenceLevel;
  explanation: string;
}

export interface DecisionResult extends CalculationOutput {
  verdict: Verdict;
  hardStopsTriggered: string[];
  softSignalsTriggered: string[];
  softSignalCount: number;
  escalated: boolean;
  reason: string;
  confidence: ConfidenceLevel;
  drivers: string[];
  actionSuggestion?: string;  // for DONT_BORROW
}

export interface ProductRouteResult {
  recommendedRoute: string;
  isSecured: boolean;
  alternativeRoutes: string[];
  rationale: string;
  tradeoffs: string[];
  securityWarning?: string;
}

export type ProvenanceTag = 'FACT' | 'USER_ANSWER' | 'ASSUMPTION' | 'DERIVED';

export interface ProvenanceItem {
  id: string;
  label: string;
  value: string;
  tag: ProvenanceTag;
  explanation: string;
}

export interface CopilotOutput {
  lenderCapacity: LenderCapacityResult;
  safeCapacity: SafeCapacityResult;
  fairRate: FairRateResult;
  effectiveCost: EffectiveCostResult;
  stress: StressResult;
  decision: DecisionResult;
  productRoute: ProductRouteResult;
  provenanceSummary?: ProvenanceItem[];
}
