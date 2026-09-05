import { useState, useMemo } from 'react';
import type { BorrowerProfile } from '../../types/profile';
import type { CopilotOutput, StressClassification } from '../../types/calculations';
import { formatCurrency, formatEMI, formatRateBand, formatPercent, formatLakhs } from '../../utils/currency';
import { computeEMI, totalRepayment, totalInterest, computeLoanCostBreakdown, computeSIPComparison } from '../../engine/emi';
import { TENURE_DEFAULTS, TENURE_OPTIONS } from '../../rules/constants';
import { determineLoanTypeKey, computeLenderCapacity } from '../../engine/lenderCapacity';
import { computeSafeCapacity } from '../../engine/safeCapacity';
import { computeEffectiveCostForProfile } from '../../engine/effectiveCost';
import { runCopilot } from '../../engine/index';
import {
  computeEligibleIncomeLender,
  computeEligibleIncomeSafe,
  isSecuredProduct,
} from '../../engine/income';

interface ResultsDashboardProps {
  profile: BorrowerProfile;
  output: CopilotOutput;
  personaName: string;
  onShowCard: () => void;
}

// ── Slider Component ─────────────────────────────────────────────────────────
function InputSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
  color = 'lokta',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hint?: string;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const accentColor = color === 'amber' ? '#b45309' : color === 'red' ? '#dc2626' : '#5a2045';
  const trackStyle = {
    background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, #eae3d9 ${pct}%, #eae3d9 100%)`,
  };

  return (
    <div className="py-2 touch-pan-y">
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <span className="text-xs font-medium text-[#52525b]">{label}</span>
        <span className="text-sm font-bold text-[#18181b] bg-[#faf7f2] px-2 py-0.5 rounded-md border border-[#eae3d9] flex-shrink-0">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none"
        style={trackStyle}
      />
      <div className="flex justify-between text-[11px] sm:text-xs text-[#71717a] mt-0.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {hint && <p className="text-[11px] sm:text-xs text-[#71717a] mt-0.5 italic">{hint}</p>}
    </div>
  );
}

// ── Tenure Slider Component ──────────────────────────────────────────────────
function TenureSlider({
  label = 'Loan tenure',
  value,
  options,
  defaultTenure,
  isAssumed = false,
  onChange,
}: {
  label?: string;
  value: number;
  options: number[];
  defaultTenure: number;
  isAssumed?: boolean;
  onChange: (v: number) => void;
}) {
  const minIdx = 0;
  const maxIdx = options.length - 1;
  const currentIdx = Math.max(0, options.indexOf(value));
  const pct = maxIdx > 0 ? (currentIdx / maxIdx) * 100 : 0;

  const trackStyle = {
    background: `linear-gradient(to right, #5a2045 0%, #5a2045 ${pct}%, #eae3d9 ${pct}%, #eae3d9 100%)`,
  };

  const yearsStr = (value / 12).toFixed(value % 12 === 0 ? 0 : 1);

  return (
    <div className="py-2.5 touch-pan-y">
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <span className="text-xs font-medium text-[#52525b]">
          {isAssumed ? `Assumed tenure for this estimate: ${yearsStr} years` : label}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAssumed ? (
            <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
              ASSUMPTION
            </span>
          ) : value === defaultTenure ? (
            <span className="text-[10px] text-[#5a2045] bg-[#f4e7f0] border border-[#e8d0e0] px-1.5 py-0.2 rounded font-semibold">
              Default
            </span>
          ) : null}
          <span className="text-sm font-bold text-[#18181b] bg-[#faf7f2] px-2 py-0.5 rounded-md border border-[#eae3d9]">
            {value} months
          </span>
        </div>
      </div>
      <input
        type="range"
        min={minIdx}
        max={maxIdx}
        step={1}
        value={currentIdx}
        onChange={e => {
          const idx = Number(e.target.value);
          if (options[idx] !== undefined) onChange(options[idx]);
        }}
        className="w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none"
        style={trackStyle}
      />
      <div className="flex justify-between items-center text-[11px] sm:text-xs text-[#71717a] mt-1 gap-1">
        <span className="hidden xs:inline flex-shrink-0">{options[0]}m</span>
        <div className="flex gap-1 flex-wrap justify-center mx-auto">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-md transition-all cursor-pointer ${
                opt === value
                  ? 'bg-[#5a2045] text-white font-bold shadow-xs'
                  : 'bg-[#faf7f2] border border-[#eae3d9] text-[#52525b] hover:text-[#18181b] hover:bg-[#f2efe9]'
              }`}
            >
              {opt}m
            </button>
          ))}
        </div>
        <span className="hidden xs:inline flex-shrink-0">{options[maxIdx]}m</span>
      </div>
    </div>
  );
}

// ── Verdict Badge ────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }: { verdict: string }) {
  const cfg = {
    'BORROW': { bg: 'bg-[#ecfdf5] border-[#a7f3d0]', text: 'text-[#065f46]', icon: '✓', label: 'Borrow' },
    'BORROW_LESS': { bg: 'bg-[#fffbeb] border-[#fde68a]', text: 'text-[#92400e]', icon: '⚠', label: 'Borrow Less' },
    'DONT_BORROW': { bg: 'bg-[#fef2f2] border-[#fecaca]', text: 'text-[#991b1b]', icon: '✕', label: "Don't Borrow" },
  }[verdict] ?? { bg: 'bg-[#faf7f2] border-[#eae3d9]', text: 'text-[#52525b]', icon: '?', label: verdict };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm border ${cfg.bg} ${cfg.text}`}>
      <span>{cfg.icon}</span> {cfg.label}
    </div>
  );
}

// ── Confidence Dot ───────────────────────────────────────────────────────────
function ConfidenceDot({ level }: { level: string }) {
  const color = { 'HIGH': 'bg-emerald-600', 'MEDIUM': 'bg-amber-500', 'LOW': 'bg-red-600' }[level] ?? 'bg-gray-400';
  const label = { 'HIGH': 'High confidence', 'MEDIUM': 'Medium confidence', 'LOW': 'Low confidence' }[level] ?? level;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#71717a]">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

// ── Stress Bar ───────────────────────────────────────────────────────────────
function StressBar({ pct, classification }: { pct: number; classification: StressClassification }) {
  const barColor = {
    'Comfortable': 'bg-emerald-600',
    'Tight': 'bg-amber-500',
    'Stressed': 'bg-orange-500',
    'Unsustainable': 'bg-red-600',
  }[classification];
  const textColor = {
    'Comfortable': 'text-emerald-800',
    'Tight': 'text-amber-800',
    'Stressed': 'text-orange-800',
    'Unsustainable': 'text-red-800',
  }[classification];
  const displayPct = Math.min(pct, 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#eae3d9] rounded-full h-2.5">
        <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${displayPct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-28 ${textColor}`}>
        {pct.toFixed(1)}% · {classification}
      </span>
    </div>
  );
}

// ── Expandable ───────────────────────────────────────────────────────────────
function Expandable({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#eae3d9] pt-2 mt-2">
      <button onClick={() => setOpen(!open)} className="text-xs text-[#5a2045] hover:text-[#4b1a39] font-semibold flex items-center gap-1 cursor-pointer">
        {open ? '▾' : '▸'} {title}
      </button>
      {open && <div className="mt-2 text-xs text-[#52525b] space-y-1 leading-relaxed">{children}</div>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ResultsDashboard({ profile, output: _output, personaName, onShowCard }: ResultsDashboardProps) {
  // Editable inputs — initialized from profile
  const [income, setIncome] = useState(Math.round(profile.eligibleIncomeSafe - profile.coApplicantIncome));
  const [expenses, setExpenses] = useState(Math.round(profile.essentialExpenses));
  const [existingEMI, setExistingEMI] = useState(Math.round(profile.existingEMI));
  const [requestedAmount, setRequestedAmount] = useState(Math.round(profile.requestedAmount));
  const [highCostEMI, setHighCostEMI] = useState(Math.round(profile.highCostDebtEMI));

  const hasCollateral =
    profile.collateral.type !== 'none' &&
    profile.collateral.willingToPledge === 'yes' &&
    (profile.collateral.statedValue ?? 0) > 0;

  const [collateralValue, setCollateralValue] = useState<number>(
    profile.collateral.statedValue ?? 0
  );

  // Rebuild profile when input sliders change
  const updatedProfile = useMemo<BorrowerProfile>(() => {
    const currentCollateral = hasCollateral
      ? { ...profile.collateral, statedValue: collateralValue }
      : profile.collateral;
    const loanTypeKey = determineLoanTypeKey({ ...profile, collateral: currentCollateral });
    const secured = isSecuredProduct(loanTypeKey);
    
    // If the borrower is salaried or fully documented, their documented income equals their total income
    let dynamicDocumentedIncome = profile.documentedIncome;
    if (profile.incomeType === 'salaried' || profile.documentationStatus === 'full') {
      dynamicDocumentedIncome = income;
    } else if (profile.documentationStatus === 'unknown' || profile.documentedIncome === null) {
      dynamicDocumentedIncome = null;
    } else if (profile.documentationStatus === 'none') {
      dynamicDocumentedIncome = 0;
    } else if (profile.documentationStatus === 'partial' && profile.documentedIncome !== null) {
      dynamicDocumentedIncome = Math.min(income, profile.documentedIncome);
    }

    const { eligibleIncomeLender, undocumentedPortion } = computeEligibleIncomeLender(
      dynamicDocumentedIncome,
      income,
      secured,
      profile.coApplicantIncome,
      {
        documentationStatus: profile.documentationStatus,
        incomeStability: profile.incomeStability,
        businessTenure: profile.businessTenure,
        employmentTenure: profile.employmentTenure,
        isSecured: secured,
      }
    );
    const eligibleIncomeSafe = computeEligibleIncomeSafe(income, profile.coApplicantIncome);

    return {
      ...profile,
      collateral: currentCollateral,
      documentedIncome: dynamicDocumentedIncome,
      claimedTotalIncome: income,
      undocumentedPortion,
      eligibleIncomeLender,
      eligibleIncomeSafe,
      essentialExpenses: expenses,
      essentialExpensesIsDefaulted: false,
      existingEMI,
      existingEMIIsDefaulted: false,
      highCostDebtEMI: highCostEMI,
      highCostDebtEMIIsDefaulted: false,
      requestedAmount,
    };
  }, [income, expenses, existingEMI, requestedAmount, highCostEMI, collateralValue, hasCollateral, profile]);

  // Primary Assessment (at product default tenure) — remains the baseline
  const output = useMemo<CopilotOutput>(() => {
    return runCopilot(updatedProfile);
  }, [updatedProfile]);

  const { lenderCapacity, safeCapacity, fairRate, effectiveCost, stress, decision, productRoute } = output;
  const isDontBorrow = decision.verdict === 'DONT_BORROW';

  const loanTypeKey = determineLoanTypeKey(updatedProfile);
  const defaultTenure = TENURE_DEFAULTS[loanTypeKey] ?? 36;
  const tenureOpts = TENURE_OPTIONS[loanTypeKey] ?? [12, 24, 36, 48, 60];

  const activeCollateralVal = updatedProfile.collateral.statedValue ?? profile.collateral.statedValue ?? 0;
  const illustrativeLtvPct = (lenderCapacity.ltvSupportedAmount !== null && activeCollateralVal > 0)
    ? Math.round((lenderCapacity.ltvSupportedAmount / activeCollateralVal) * 100)
    : 0;

  const collateralExplanation =
    lenderCapacity.bindingConstraint === 'ltv'
      ? `Estimated repayment capacity supports ${formatLakhs(lenderCapacity.foirSupportedAmount)}, but your collateral supports approximately ${formatLakhs(lenderCapacity.ltvSupportedAmount ?? 0)} based on the illustrative LTV (${illustrativeLtvPct}%). We use the lower of the two.`
      : lenderCapacity.bindingConstraint === 'foir'
      ? `Your collateral could support approximately ${formatLakhs(lenderCapacity.ltvSupportedAmount ?? 0)} based on the illustrative LTV (${illustrativeLtvPct}%), but estimated repayment capacity supports ${formatLakhs(lenderCapacity.foirSupportedAmount)}. We use the lower of the two.`
      : `Both your collateral and estimated repayment capacity support approximately ${formatLakhs(lenderCapacity.lenderLikelyAmount)}.`;

  // Interactive Tenure Simulator state (initialized strictly to default tenure)
  const [simulatedTenure, setSimulatedTenure] = useState<number>(defaultTenure);

  // Mobile segment control: Results vs Adjust Finances
  const [mobileTab, setMobileTab] = useState<'results' | 'finances'>('results');

  // Feature state: If invest instead (Illustrative SIP — optional / collapsed by default)
  const [showSip, setShowSip] = useState<boolean>(false);
  const [sipReturnPct, setSipReturnPct] = useState<number>(12);

  // Compact expandable state for What We Know vs What We Assumed
  const [showProvenance, setShowProvenance] = useState<boolean>(false);

  const effectiveInterestRate = fairRate.fairRateMid;

  // What-If scenario (propagating simulatedTenure to Safe Amount and Lender Likely Amount)
  const simulatedScenario = useMemo(() => {
    // 1. Safe capacity at simulated tenure (Safe EMI ceiling strictly unchanged; Safe Amount recalculates)
    const simSafeCapacity = computeSafeCapacity(updatedProfile, fairRate.fairRateHigh, simulatedTenure);

    // 2. Lender capacity at simulated tenure (FOIR-supported principal recalculates; LTV cap preserved for secured)
    const simLenderCapacity = computeLenderCapacity(updatedProfile, fairRate.fairRateMid, simulatedTenure);

    return {
      safeCapacity: simSafeCapacity,
      lenderCapacity: simLenderCapacity,
    };
  }, [updatedProfile, fairRate.fairRateHigh, fairRate.fairRateMid, simulatedTenure]);

  // Calculations for the actual requested loan at fair-rate midpoint & simulated tenure
  const requestedLoanCalculations = useMemo(() => {
    const emi = computeEMI(requestedAmount, effectiveInterestRate, simulatedTenure);
    const totalRepay = totalRepayment(emi, simulatedTenure);
    const interest = totalInterest(requestedAmount, emi, simulatedTenure);
    const isBelowCeiling = emi <= safeCapacity.safeEMI;
    return {
      emi,
      totalRepay,
      interest,
      isBelowCeiling,
    };
  }, [requestedAmount, effectiveInterestRate, simulatedTenure, safeCapacity.safeEMI]);

  // Effective cost evaluated specifically for the requested loan principal using the SAME fairRateMid
  const requestedEffectiveCost = useMemo(() => {
    return computeEffectiveCostForProfile(
      updatedProfile,
      requestedAmount,
      fairRate.fairRateMid,
      simulatedTenure
    );
  }, [updatedProfile, requestedAmount, fairRate.fairRateMid, simulatedTenure]);



  // Illustrative SIP comparison (calculates against the loan interest that would be avoided)
  const sipPrincipal = safeCapacity.recommendedAmount > 0 ? safeCapacity.recommendedAmount : requestedAmount;
  const sipLoanCost = useMemo(() => {
    return computeLoanCostBreakdown(
      sipPrincipal,
      effectiveInterestRate,
      simulatedTenure,
      effectiveCost.processingFeePct
    );
  }, [sipPrincipal, effectiveInterestRate, simulatedTenure, effectiveCost.processingFeePct]);

  const sipComparison = useMemo(() => {
    const monthlyToInvest = safeCapacity.recommendedEMI > 0 ? safeCapacity.recommendedEMI : sipLoanCost.monthlyEMI;
    return computeSIPComparison(
      monthlyToInvest,
      simulatedTenure,
      sipReturnPct,
      sipLoanCost.totalInterest
    );
  }, [safeCapacity.recommendedEMI, sipLoanCost.monthlyEMI, simulatedTenure, sipReturnPct, sipLoanCost.totalInterest]);

  // Slider ranges — generous but sensible
  const incomeMax = Math.max(income * 4, 500000);
  const expenseMax = Math.max(income, expenses * 3, 200000);
  const emiMax = Math.max(income * 0.8, existingEMI * 3, 100000);
  const amountMax = Math.max(requestedAmount * 3, lenderCapacity.lenderLikelyAmount * 2, 5000000);
  const hcdMax = Math.max(highCostEMI * 4, 50000, income * 0.5);

  // Live disposal calculation for the mini bar
  const disposable = Math.max(0, income - expenses - existingEMI - highCostEMI);
  const disposablePct = income > 0 ? (disposable / income) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Persona badge */}
      {personaName && (
        <div className="mb-4 bg-[#f4e7f0] text-[#5a2045] text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 border border-[#e8d0e0]">
          <span className="w-6 h-6 bg-[#5a2045] text-white rounded-full flex items-center justify-center text-xs font-bold">{personaName[0]}</span>
          Demo: {personaName}'s Assessment
        </div>
      )}

      {/* Mobile Segmented Tab Control */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-[#eae3d9] mb-4 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('results')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99] ${
            mobileTab === 'results'
              ? 'bg-[#5a2045] text-white shadow-xs'
              : 'text-[#52525b] hover:text-[#18181b] hover:bg-[#faf7f2]'
          }`}
        >
          <span>📊</span> Assessment Results
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('finances')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99] ${
            mobileTab === 'finances'
              ? 'bg-[#5a2045] text-white shadow-xs'
              : 'text-[#52525b] hover:text-[#18181b] hover:bg-[#faf7f2]'
          }`}
        >
          <span>✏️</span> Adjust Finances
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── LEFT: Input Panel ─────────────────────────────────────────────── */}
        <div className={`w-full lg:w-80 lg:sticky lg:top-20 max-h-[85vh] lg:max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-[#eae3d9] p-4 sm:p-5 shadow-xs flex-shrink-0 ${
          mobileTab === 'finances' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white/95 backdrop-blur-xs pb-2 pt-0.5 z-10 -mx-1 px-1 border-b border-[#eae3d9]/50">
            <div className="w-7 h-7 bg-[#f4e7f0] rounded-lg flex items-center justify-center">
              <span className="text-[#5a2045] text-sm">✏</span>
            </div>
            <h3 className="text-base font-bold text-[#18181b]">Your Finances</h3>
            <span className="text-xs text-[#71717a] ml-auto">Drag to update</span>
          </div>

          <div className="space-y-1 divide-y divide-[#eae3d9]">
            <InputSlider
              label="Monthly income"
              value={income}
              min={5000}
              max={incomeMax}
              step={1000}
              onChange={setIncome}
              format={v => formatCurrency(v, true)}
            />
            <InputSlider
              label="Monthly expenses"
              value={expenses}
              min={0}
              max={expenseMax}
              step={1000}
              onChange={setExpenses}
              format={v => formatCurrency(v, true)}
              color={expenses > income * 0.7 ? 'red' : 'amber'}
            />
            <InputSlider
              label="Existing EMIs / month"
              value={existingEMI}
              min={0}
              max={emiMax}
              step={500}
              onChange={setExistingEMI}
              format={v => formatCurrency(v, true)}
            />
            {profile.highCostDebtOutstanding > 0 && (
              <InputSlider
                label="High-cost debt payment"
                value={highCostEMI}
                min={0}
                max={hcdMax}
                step={500}
                onChange={setHighCostEMI}
                format={v => formatCurrency(v, true)}
                color="red"
                hint="Loans at 30%+ APR"
              />
            )}
            <InputSlider
              label="Loan amount requested"
              value={requestedAmount}
              min={10000}
              max={amountMax}
              step={10000}
              onChange={setRequestedAmount}
              format={v => formatCurrency(v, true)}
              color="lokta"
            />
            {hasCollateral && (
              <InputSlider
                label="Collateral value"
                value={collateralValue}
                min={100000}
                max={Math.max(collateralValue * 2.5, 10000000)}
                step={100000}
                onChange={setCollateralValue}
                format={v => formatCurrency(v, true)}
                color="lokta"
                hint={`${profile.collateral.type === 'property_commercial' ? 'Commercial property' : profile.collateral.type === 'property_residential' ? 'Residential property' : 'Gold'} collateral`}
              />
            )}
            <TenureSlider
              label="Loan tenure"
              value={simulatedTenure}
              options={tenureOpts}
              defaultTenure={defaultTenure}
              isAssumed={!profile.requestedTenureMonths && simulatedTenure === defaultTenure}
              onChange={setSimulatedTenure}
            />
          </div>

          {/* Live disposable cash flow bar */}
          <div className="mt-4 pt-4 border-t border-[#eae3d9]">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#71717a]">Disposable cash flow</span>
              <span className={`font-bold ${disposable <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatCurrency(disposable, true)}/mo
              </span>
            </div>
            <div className="w-full bg-[#eae3d9] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${disposable <= 0 ? 'bg-red-600' : disposablePct > 40 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, disposablePct)}%` }}
              />
            </div>
            <p className="text-xs text-[#71717a] mt-1">{disposablePct.toFixed(0)}% of income free after obligations</p>
          </div>

          {/* Fixed inputs (not slider-adjustable) */}
          <div className="mt-4 pt-4 border-t border-[#eae3d9] space-y-1.5">
            <p className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-2">Fixed Profile Inputs</p>
            {[
              { label: 'Income type', val: profile.incomeType.replace('_', ' ') },
              {
                label: 'Salary / Stability',
                val:
                  profile.incomeType === 'salaried'
                    ? profile.incomeStability === 'stable'
                      ? 'Fixed (No variable pay)'
                      : profile.incomeStability === 'moderate'
                      ? 'Variable (Moderate)'
                      : profile.incomeStability === 'unstable'
                      ? 'Variable (Commission)'
                      : 'Fixed (No variable pay)'
                    : profile.incomeStability.replace('_', ' '),
              },
              ...(profile.variableIncomeShare && profile.variableIncomeShare > 0
                ? [{ label: 'Variable pay', val: `${(profile.variableIncomeShare * 100).toFixed(0)}% of income` }]
                : []),
              { label: 'Credit score', val: profile.creditScore ? String(profile.creditScore) : profile.creditScoreStatus.replace('_', ' ') },
              { label: 'Repayment history', val: personaName === 'Ravi' && profile.repaymentHistory === 'clean' ? 'Clean (Demo Assumption)' : profile.repaymentHistory },
              ...(profile.coApplicantIncome > 0
                ? [
                    {
                      label: 'Co-applicant',
                      val:
                        personaName === 'Ravi'
                          ? `₹${profile.coApplicantIncome.toLocaleString('en-IN')}/mo (Demo assumption: spouse included as co-applicant)`
                          : `₹${profile.coApplicantIncome.toLocaleString('en-IN')}/mo (Disclosed by borrower)`,
                    },
                  ]
                : []),
              { label: 'Documentation', val: profile.documentationStatus },
              { label: 'Product', val: productRoute.recommendedRoute },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center text-xs py-0.5 gap-2">
                <span className="text-[#71717a] flex-shrink-0">{item.label}</span>
                <span className="font-medium text-[#18181b] capitalize text-right">{item.val}</span>
              </div>
            ))}
          </div>

          {/* Mobile Apply Button */}
          <div className="mt-5 pt-3 border-t border-[#eae3d9] lg:hidden">
            <button
              type="button"
              onClick={() => {
                setMobileTab('results');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-3 rounded-xl bg-[#5a2045] hover:bg-[#4b1a39] text-white font-bold text-xs shadow-xs transition-all cursor-pointer text-center active:scale-[0.99]"
            >
              Apply Changes & View Results →
            </button>
          </div>
        </div>

        {/* ── RIGHT: Results Panel ────────────────────────────────────────── */}
        <div className={`flex-1 min-w-0 space-y-4 ${
          mobileTab === 'results' ? 'block' : 'hidden lg:block'
        }`}>

          {/* Mobile Quick Tweak Banner */}
          <div className="flex items-center justify-between bg-[#faf4f8] border border-[#e8d0e0] px-3.5 py-2.5 rounded-xl lg:hidden shadow-xs">
            <span className="text-xs text-[#5a2045] font-medium">Want to test different numbers?</span>
            <button
              type="button"
              onClick={() => {
                setMobileTab('finances');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-[#5a2045] bg-white border border-[#e8d0e0] px-2.5 py-1 rounded-lg hover:bg-[#f4e7f0] transition-all cursor-pointer"
            >
              Adjust Finances ⚙️
            </button>
          </div>

          {/* Verdict */}
          <div className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
            isDontBorrow ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]' :
            decision.verdict === 'BORROW_LESS' ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' :
            'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <VerdictBadge verdict={decision.verdict} />
                <p className="text-sm text-[#3f3f46] mt-2 leading-relaxed max-w-xl">{decision.reason}</p>
              </div>
              {decision.actionSuggestion && (
                <div className="bg-white rounded-xl p-3 text-xs text-[#52525b] border border-[#eae3d9] max-w-xs shadow-xs">
                  💡 {decision.actionSuggestion}
                </div>
              )}
            </div>
          </div>

          {/* Two Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Lender-Likely Card */}
            <div className="bg-white rounded-xl border border-[#eae3d9] p-4 shadow-xs">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-5 h-5 bg-[#5a2045] text-white rounded-full flex items-center justify-center text-xs font-bold">L</span>
                <span className="text-xs font-semibold text-[#71717a]">Lender-Likely</span>
                <ConfidenceDot level={lenderCapacity.confidence} />
              </div>
              <p className="text-2xl font-extrabold text-[#18181b]">{formatLakhs(lenderCapacity.lenderLikelyAmount)}</p>
              {lenderCapacity.lenderLikelyAmountRange && (
                <p className="text-xs text-[#52525b] mt-0.5">
                  Range: {formatLakhs(lenderCapacity.lenderLikelyAmountRange.low)}–{formatLakhs(lenderCapacity.lenderLikelyAmountRange.high)}
                </p>
              )}
              {lenderCapacity.ltvSupportedAmount !== null ? (
                <div className="mt-3 pt-2.5 border-t border-[#eae3d9] space-y-1.5 bg-[#faf7f2] p-2.5 rounded-lg border border-[#eae3d9]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71717a]">Collateral value:</span>
                    <span className="font-semibold text-[#18181b]">{formatLakhs(activeCollateralVal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71717a]">Illustrative LTV:</span>
                    <span className="font-semibold text-[#18181b]">{illustrativeLtvPct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71717a]">Collateral-supported amount:</span>
                    <span className={`font-semibold ${lenderCapacity.bindingConstraint === 'ltv' ? 'text-[#5a2045] font-bold' : 'text-[#18181b]'}`}>
                      {formatLakhs(lenderCapacity.ltvSupportedAmount)}
                      {lenderCapacity.bindingConstraint === 'ltv' && (
                        <span className="ml-1 text-[10px] bg-[#f4e7f0] text-[#5a2045] px-1 py-0.2 rounded font-bold border border-[#e8d0e0]">
                          Binding
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71717a]">Repayment-capacity-supported amount:</span>
                    <span className={`font-semibold ${lenderCapacity.bindingConstraint === 'foir' ? 'text-[#5a2045] font-bold' : 'text-[#18181b]'}`}>
                      {formatLakhs(lenderCapacity.foirSupportedAmount)}
                      {lenderCapacity.bindingConstraint === 'foir' && (
                        <span className="ml-1 text-[10px] bg-[#f4e7f0] text-[#5a2045] px-1 py-0.2 rounded font-bold border border-[#e8d0e0]">
                          Binding
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#eae3d9]">
                    <span className="font-bold text-[#5a2045]">Estimated lender-likely amount:</span>
                    <span className="font-extrabold text-[#5a2045] text-sm">{formatLakhs(lenderCapacity.lenderLikelyAmount)}</span>
                  </div>
                  <p className="text-[11px] text-[#52525b] mt-1.5 leading-relaxed italic">
                    {collateralExplanation}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#71717a] mt-0.5">
                  Baseline at {defaultTenure}mo default · FOIR: {(lenderCapacity.foir * 100).toFixed(0)}% of lender-recognized income
                </p>
              )}
              {simulatedTenure !== defaultTenure && (
                <div className="mt-2 pt-2 border-t border-[#eae3d9] text-xs">
                  <span className="text-[#71717a]">What-If at {simulatedTenure}mo: </span>
                  <span className="font-bold text-[#5a2045]">{formatLakhs(simulatedScenario.lenderCapacity.lenderLikelyAmount)}</span>
                </div>
              )}
              <Expandable title="How this was calculated">
                {lenderCapacity.drivers.map((d, i) => <p key={i}>• {d}</p>)}
              </Expandable>
            </div>

            {/* Borrower-Safe Ceiling Card */}
            <div className={`rounded-xl border-2 p-4 shadow-xs ${isDontBorrow ? 'bg-[#fef2f2] border-[#fecaca]' : 'bg-[#f2f8f4] border-[#a7f3d0]'}`}>
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 ${isDontBorrow ? 'bg-red-600' : 'bg-[#065f46]'} text-white rounded-full flex items-center justify-center text-xs font-bold`}>🛡</span>
                  <span className="text-xs font-bold text-[#18181b]">Borrower-Safe Ceiling</span>
                </div>
                <ConfidenceDot level={safeCapacity.confidence} />
              </div>
              <p className={`text-2xl font-extrabold ${isDontBorrow ? 'text-red-600' : 'text-[#065f46]'}`}>{formatLakhs(safeCapacity.safeAmount)}</p>
              <p className="text-xs text-[#52525b] mt-0.5">
                Maximum principal supported by your borrower-safe EMI ceiling.
              </p>
              {safeCapacity.safeAmountRange && (
                <p className="text-[11px] text-[#71717a] mt-0.5">
                  Range: {formatLakhs(safeCapacity.safeAmountRange.low)}–{formatLakhs(safeCapacity.safeAmountRange.high)}
                </p>
              )}

              {/* Recommended Target */}
              <div className="mt-3 pt-2.5 border-t border-[#cde5d6] bg-white/80 rounded-lg p-2.5 border border-[#cde5d6]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-[#065f46]">Recommended target:</span>
                  <span className="text-base font-extrabold text-[#065f46]">{formatLakhs(safeCapacity.recommendedAmount)}</span>
                </div>
                <p className="text-[11px] text-[#71717a] mt-0.5 leading-tight">
                  90% of your safe ceiling, leaving additional headroom (← Negotiate toward this target).
                </p>
              </div>

              {isDontBorrow && (
                <div className="mt-2 p-1.5 bg-red-100/70 border border-red-200 rounded text-[11px] font-bold text-red-700 text-center">
                  Mathematical capacity only — not a recommendation.
                </div>
              )}
              {simulatedTenure !== defaultTenure && (
                <div className="mt-2 pt-2 border-t border-[#cde5d6] text-xs">
                  <span className="text-[#52525b]">What-If at {simulatedTenure}mo: </span>
                  <span className="font-bold text-[#065f46]">Ceiling {formatLakhs(simulatedScenario.safeCapacity.safeAmount)} · Target {formatLakhs(simulatedScenario.safeCapacity.recommendedAmount)}</span>
                </div>
              )}
              <Expandable title="How this was calculated">
                {safeCapacity.drivers.map((d, i) => <p key={i}>• {d}</p>)}
              </Expandable>
            </div>
          </div>


          {/* ── Requested Loan vs. Safe EMI Ceiling ── */}
          <div className="bg-white rounded-2xl border border-[#eae3d9] p-4 sm:p-5 shadow-xs space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#eae3d9] pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a2045] bg-[#faf4f8] px-2.5 py-1 rounded-md border border-[#e8d0e0] inline-block mb-1">
                  Requested Loan vs. Safe Ceiling
                </span>
                <h3 className="text-base font-bold text-[#18181b]">Your Requested Loan &amp; Affordability</h3>
              </div>
              <div className="text-xs text-[#71717a] bg-[#faf7f2] px-3 py-1.5 rounded-lg border border-[#eae3d9] self-start sm:self-auto">
                {simulatedTenure === defaultTenure && !profile.requestedTenureMonths ? (
                  <span>Assumed tenure for this estimate: <strong className="text-[#18181b]">{(defaultTenure / 12).toFixed(defaultTenure % 12 === 0 ? 0 : 1)} years</strong> ({defaultTenure}m) · <span className="font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded text-[10px]">ASSUMPTION</span> · </span>
                ) : (
                  <span>Tenure: <strong className="text-[#18181b]">{simulatedTenure} months</strong> · </span>
                )}
                Fair Rate: <strong className="text-[#5a2045]">{effectiveInterestRate.toFixed(1)}% p.a.</strong>
              </div>
            </div>

            {/* Section 1 & 4: Requested Loan Summary Card */}
            <div className="bg-[#faf7f2] rounded-xl p-4 border border-[#eae3d9]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[#71717a] font-medium">Your requested loan</p>
                  <p className="text-2xl font-black text-[#18181b] mt-0.5">{formatCurrency(requestedAmount, true)}</p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">Principal amount requested</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a] font-medium">Estimated EMI at {effectiveInterestRate.toFixed(1)}% for {simulatedTenure} months</p>
                  <p className="text-2xl font-black text-[#5a2045] mt-0.5">{formatEMI(requestedLoanCalculations.emi)}</p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">Actual monthly installment for this loan</p>
                </div>
                <div>
                  <p className="text-xs text-[#71717a] font-medium">Total repayment for your requested loan</p>
                  <p className="text-2xl font-black text-[#18181b] mt-0.5">{formatCurrency(requestedLoanCalculations.totalRepay, true)}</p>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Estimated interest: ~{formatCurrency(requestedLoanCalculations.interest, true)}
                  </p>
                </div>
              </div>

              {/* Section 7: Simple Visual Comparison */}
              <div className={`mt-3.5 pt-3 border-t border-[#eae3d9] flex items-center justify-between flex-wrap gap-2 text-xs font-semibold rounded-lg px-3 py-2 ${
                requestedLoanCalculations.isBelowCeiling
                  ? 'bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46]'
                  : 'bg-[#fffbeb] border border-[#fde68a] text-[#92400e]'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{requestedLoanCalculations.isBelowCeiling ? '✓' : '⚠'}</span>
                  <span>
                    {requestedLoanCalculations.isBelowCeiling
                      ? `✓ Requested EMI (${formatEMI(requestedLoanCalculations.emi)}) is below your estimated safe ceiling (${formatEMI(safeCapacity.safeEMI)}).`
                      : `⚠ Requested EMI (${formatEMI(requestedLoanCalculations.emi)}) is above your estimated safe ceiling (${formatEMI(safeCapacity.safeEMI)}) by ${formatEMI(requestedLoanCalculations.emi - safeCapacity.safeEMI)}.`}
                  </span>
                </div>
                <div className="text-[11px] font-bold shrink-0 bg-white/70 px-2 py-0.5 rounded border border-current">
                  Requested {formatEMI(requestedLoanCalculations.emi)} {requestedLoanCalculations.isBelowCeiling ? '<' : '>'} Ceiling {formatEMI(safeCapacity.safeEMI)}
                </div>
              </div>
            </div>

            {/* Section 3 & 8: Make the Four Numbers Distinct */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-[#18181b] uppercase tracking-wider">
                  The Four Monthly Numbers Compared
                </h4>
                <span className="text-[10px] text-[#71717a]">Distinct concepts — not interchangeable</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* 1. Requested Loan EMI */}
                <div className="min-w-0 bg-white rounded-xl border-2 border-[#e8d0e0] p-3 shadow-xs flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[11px] font-bold text-[#5a2045] truncate">Requested Loan EMI</p>
                      <span className="text-[9px] bg-[#faf4f8] text-[#5a2045] font-bold px-1.5 py-0.5 rounded border border-[#e8d0e0] shrink-0">Actual</span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-[#5a2045] tracking-tight truncate">
                      {formatEMI(requestedLoanCalculations.emi)}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#71717a] mt-1.5 leading-tight">
                    What you would actually pay for {formatLakhs(requestedAmount)} principal at {effectiveInterestRate.toFixed(1)}% ({simulatedTenure}m)
                  </p>
                </div>

                {/* 2. Borrower-Safe EMI Ceiling */}
                <div className="min-w-0 bg-[#f2f8f4] rounded-xl border-2 border-[#a7f3d0] p-3 shadow-xs flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[11px] font-bold text-[#065f46] truncate">Borrower-Safe Ceiling</p>
                      <span className="text-[9px] bg-[#ecfdf5] text-[#065f46] font-bold px-1.5 py-0.5 rounded border border-[#a7f3d0] shrink-0">Safe Limit</span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-[#065f46] tracking-tight truncate">
                      {formatEMI(safeCapacity.safeEMI)}
                    </p>
                  </div>
                  <p className="text-[10px] text-red-600 font-semibold mt-1.5 leading-tight">
                    Maximum monthly payment considered prudent (Do not cross)
                  </p>
                </div>

                {/* 3. Recommended EMI Ceiling */}
                <div className="min-w-0 bg-white rounded-xl border border-[#eae3d9] p-3 shadow-xs flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[11px] font-bold text-[#18181b] truncate">Recommended Target</p>
                      <span className="text-[9px] bg-[#faf7f2] text-[#71717a] font-bold px-1.5 py-0.5 rounded border border-[#eae3d9] shrink-0">90% Buffer</span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-[#18181b] tracking-tight truncate">
                      {formatEMI(safeCapacity.recommendedEMI)}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#71717a] mt-1.5 leading-tight">
                    Safe ceiling × 90% leaving additional headroom for unexpected costs
                  </p>
                </div>

                {/* 4. Lender Max EMI */}
                <div className="min-w-0 bg-white rounded-xl border border-[#eae3d9] p-3 shadow-xs flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[11px] font-bold text-[#71717a] truncate">Lender Max</p>
                      <span className="text-[9px] bg-[#faf7f2] text-[#71717a] font-bold px-1.5 py-0.5 rounded border border-[#eae3d9] shrink-0">FOIR Cap</span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-[#71717a] tracking-tight truncate">
                      {formatEMI(lenderCapacity.availableNewEMI)}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#71717a] mt-1.5 leading-tight">
                    Lender-side gross FOIR capacity formula ignoring living costs
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Explicit Explanation of Safe EMI Ceiling */}
            <div className="bg-[#f4e7f0]/60 border border-[#e8d0e0] rounded-xl p-3 sm:p-3.5 text-xs text-[#5a2045] leading-relaxed">
              <p className="font-bold mb-1 flex items-center gap-1.5 text-[#18181b]">
                <span>ℹ️</span> Understanding Your Safe EMI Ceiling
              </p>
              <p className="text-[#3f3f46]">
                <strong>Safe EMI ceiling is the maximum monthly loan payment we estimate you can comfortably carry. It is NOT the EMI for your requested loan.</strong>
              </p>
              <p className="text-[#71717a] mt-1">
                Why your safe ceiling is {formatEMI(safeCapacity.safeEMI)} and not higher: It reserves exactly {(safeCapacity.adjustedRetentionFactor * 100).toFixed(0)}% of your {formatCurrency(safeCapacity.disposableCashFlow, true)} disposable monthly surplus (after essentials &amp; existing debt) to leave a buffer for unexpected costs and reduce payment stress.
              </p>
            </div>


          </div>



          {/* Fair Rate + Effective Cost (side by side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[#eae3d9] p-4 shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-[#18181b]">Estimated Fair Rate Range</h3>
                <ConfidenceDot level={fairRate.confidence} />
              </div>
              <p className="text-2xl font-extrabold text-[#5a2045]">{formatRateBand(fairRate.fairRateLow, fairRate.fairRateHigh)}</p>
              <p className="text-xs text-[#71717a] mt-1">{productRoute.recommendedRoute} • benchmark base {fairRate.baseBandLow}%–{fairRate.baseBandHigh}%</p>

              {/* Drivers & Why */}
              <div className="mt-3 pt-3 border-t border-[#f4efe8]">
                <p className="text-xs font-semibold text-[#18181b] mb-1.5">Why:</p>
                <div className="space-y-1">
                  {fairRate.adjustments
                    .filter(a => a.value !== 0)
                    .map((a, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-[#3f3f46]">
                        <span className={a.value < 0 ? 'text-[#065f46] font-bold' : 'text-[#b45309] font-bold'}>
                          {a.value < 0 ? '✓' : '•'}
                        </span>
                        <span>{a.factor} ({a.value > 0 ? `+${a.value}` : a.value} pts)</span>
                      </div>
                    ))}
                </div>
              </div>

              <Expandable title="Detailed position mechanics">
                <p>Starting position: {fairRate.startingPosition}/100 (neutral midpoint)</p>
                {fairRate.adjustments.map((a, i) => (
                  <p key={i}>• {a.factor}: {a.value > 0 ? '+' : ''}{a.value} pts ({a.reason})</p>
                ))}
                <p>Final clamped position: {fairRate.finalPosition.toFixed(0)}/100 ± {fairRate.halfWidth} pts</p>
              </Expandable>

              {/* Unknown Information Handling (Widening Without Midpoint Penalty) */}
              {fairRate.unknownCount > 0 && (
                <div className="mt-3 bg-[#fffbeb] border border-[#fde68a] rounded-lg p-2.5 text-xs text-[#92400e]">
                  <p className="font-semibold flex items-center gap-1 text-[11px]">
                    <span>ℹ️</span> Rate range widened for unknown information
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Your rate range is wider because some lender-relevant information is unknown ({fairRate.unknownCount} factor{fairRate.unknownCount > 1 ? 's' : ''}, ±{fairRate.halfWidth} pts). Missing data does NOT increase your baseline rate midpoint.
                  </p>
                  {profile.creditScoreStatus === 'unknown' && (
                    <p className="mt-1 text-[11px] leading-relaxed text-[#78350f]">
                      • <strong>Credit score unknown:</strong> Not penalized as a low score; positioned neutrally within the applicable band. A verified score ≥700 could unlock lower bank-tier rates.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#eae3d9] p-4 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-[#18181b]">Effective Annualized Cost</h3>
                <span className="text-[10px] text-[#5a2045] font-semibold bg-[#faf4f8] px-2 py-0.5 rounded border border-[#e8d0e0]">
                  For your requested loan
                </span>
              </div>
              <p className="text-2xl font-extrabold text-[#18181b]">
                {requestedEffectiveCost.effectiveAnnualizedCostRange
                  ? `${formatPercent(requestedEffectiveCost.effectiveAnnualizedCostRange.low)}–${formatPercent(requestedEffectiveCost.effectiveAnnualizedCostRange.high)}`
                  : formatPercent(requestedEffectiveCost.effectiveAnnualizedCost)}
              </p>
              <p className="text-xs text-[#71717a] mt-1">
                Evaluated on your requested loan of <strong>{formatCurrency(requestedAmount, true)}</strong> ({simulatedTenure}m tenure)
              </p>
              <p className="text-xs text-[#71717a]">
                Nominal rate: {formatPercent(requestedEffectiveCost.nominalRate)} + processing fee (~{requestedEffectiveCost.processingFeePct.toFixed(1)}%)
              </p>
              <div className="mt-2 text-[11px] text-[#71717a] bg-[#faf7f2] p-2 rounded border border-[#eae3d9] leading-tight">
                <strong>Estimated Effective Annualized Borrowing Cost</strong> — NOT regulatory APR.
              </div>
              <Expandable title="What's included / excluded">
                {requestedEffectiveCost.includedItems.map((it, i) => <p key={i}>✓ {it}</p>)}
                {requestedEffectiveCost.excludedItems.map((it, i) => <p key={i} className="text-[#71717a]">✕ {it}</p>)}
              </Expandable>
            </div>
          </div>

          {/* ── If You Invest Instead (Illustrative SIP comparison — secondary & optional) ── */}
          <div className="bg-[#f2f8f4] rounded-xl border border-[#cde5d6] p-4 sm:p-5 shadow-xs">
            <button
              type="button"
              onClick={() => setShowSip(!showSip)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-[#065f46] text-white rounded-lg flex items-center justify-center text-xs font-bold">📈</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#065f46] group-hover:underline">
                    Illustrative SIP comparison (Optional)
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#047857]">
                    Does not affect borrowing eligibility or loan limits.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#065f46] px-2.5 py-1 rounded-md bg-white border border-[#a7f3d0] shrink-0">
                {showSip ? 'Hide comparison ▴' : 'View comparison ▾'}
              </span>
            </button>

            {showSip && (
              <div className="mt-4 pt-4 border-t border-[#cde5d6]">
                <p className="text-xs text-[#047857] leading-relaxed mb-4">
                  At an assumed annual return, what if you skip this debt and invest the monthly EMI into a disciplined SIP? Illustrative modeled difference under these assumptions. Not guaranteed; market returns can be lower or negative. Does not affect borrowing eligibility or loan limits.
                </p>

                {/* Expected Return Rate Selector */}
                <div className="bg-white rounded-xl p-4 border border-[#cde5d6] mb-4 shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-[#18181b]">Expected Annual Return Rate (p.a.):</span>
                    <span className="text-sm font-bold text-[#065f46] bg-[#ecfdf5] px-2.5 py-0.5 rounded-md border border-[#a7f3d0]">
                      {sipReturnPct}% per year
                    </span>
                  </div>

                  {/* Preset return buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    {[
                      { label: '7% FD / Debt', rate: 7 },
                      { label: '10% Balanced', rate: 10 },
                      { label: '12% Equity SIP', rate: 12 },
                      { label: '15% Growth', rate: 15 },
                    ].map(preset => (
                      <button
                        key={preset.rate}
                        onClick={() => setSipReturnPct(preset.rate)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center border cursor-pointer ${
                          sipReturnPct === preset.rate
                            ? 'bg-[#065f46] text-white border-[#065f46] shadow-xs'
                            : 'bg-[#faf7f2] text-[#52525b] border-[#eae3d9] hover:bg-[#f2efe9]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Fine-tune slider */}
                  <input
                    type="range"
                    min={4}
                    max={18}
                    step={0.5}
                    value={sipReturnPct}
                    onChange={e => setSipReturnPct(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#065f46]"
                  />
                  <div className="flex justify-between text-[11px] text-[#71717a] mt-1">
                    <span>4% (Conservative)</span>
                    <span>12% (Nifty 50 Historical)</span>
                    <span>18% (Aggressive)</span>
                  </div>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* Option A: Borrow */}
                  <div className="bg-white rounded-xl p-4 border border-red-200 shadow-xs">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-4 h-4 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold border border-red-200">✕</span>
                      <span className="text-xs font-bold text-red-800 uppercase tracking-wide">Path A: Take the Loan</span>
                    </div>
                    <p className="text-xs text-[#71717a] mb-0.5">Monthly loan payment ({formatLakhs(sipPrincipal)} at {simulatedTenure} mo):</p>
                    <p className="text-lg font-bold text-red-600 mb-3">{formatEMI(sipComparison.monthlyInvestment)}</p>
                    <div className="space-y-1.5 text-xs border-t border-red-100 pt-2 text-[#52525b]">
                      <div className="flex justify-between">
                        <span>Total cash paid:</span>
                        <span className="font-semibold text-[#18181b]">{formatCurrency(sipLoanCost.totalOutflow, true)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Interest lost forever:</span>
                        <span className="font-semibold">-{formatCurrency(sipLoanCost.totalInterest, true)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-dashed border-red-200">
                        <span>Net wealth created:</span>
                        <span className="font-bold text-[#71717a]">₹0</span>
                      </div>
                    </div>
                  </div>

                  {/* Option B: Invest */}
                  <div className="bg-white rounded-xl p-4 border border-emerald-300 shadow-xs">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-4 h-4 bg-emerald-100 text-[#065f46] rounded-full flex items-center justify-center text-xs font-bold border border-emerald-200">✓</span>
                      <span className="text-xs font-bold text-[#065f46] uppercase tracking-wide">Path B: Invest in SIP</span>
                    </div>
                    <p className="text-xs text-[#71717a] mb-0.5">Monthly deposit for {simulatedTenure} mo:</p>
                    <p className="text-lg font-bold text-[#065f46] mb-3">{formatEMI(sipComparison.monthlyInvestment)}</p>
                    <div className="space-y-1.5 text-xs border-t border-emerald-100 pt-2 text-[#52525b]">
                      <div className="flex justify-between">
                        <span>Total principal saved:</span>
                        <span className="font-semibold text-[#18181b]">{formatCurrency(sipComparison.totalInvested, true)}</span>
                      </div>
                      <div className="flex justify-between text-[#065f46]">
                        <span>Compounding returns:</span>
                        <span className="font-semibold">+{formatCurrency(sipComparison.wealthGain, true)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-dashed border-emerald-200 text-[#065f46]">
                        <span className="font-bold">Portfolio accumulated:</span>
                        <span className="font-extrabold text-base">{formatCurrency(sipComparison.futureValue, true)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wealth Gap Insight Callout */}
                <div className="bg-[#e6f4ec] text-[#064e3b] rounded-xl p-4 flex items-start gap-3 shadow-xs border border-[#a7f3d0]">
                  <div className="text-2xl mt-0.5">💡</div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#065f46] mb-0.5">The Opportunity Gap (Illustrative)</h4>
                    <p className="text-xs leading-relaxed text-[#064e3b]">
                      Illustrative modeled difference under these assumptions (at {sipReturnPct}% p.a.): investing this EMI builds an estimated <strong>{formatCurrency(sipComparison.futureValue, true)}</strong> portfolio while avoiding <strong>{formatCurrency(sipLoanCost.totalInterest, true)}</strong> in loan interest.
                      This shows an illustrative modeled difference of <span className="underline font-bold text-[#065f46] text-sm">{formatCurrency(sipComparison.netWealthDifference, true)}</span> over {simulatedTenure} months. Not guaranteed; market returns vary and this does not affect your borrowing recommendation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stress Test */}
          <div className="bg-white rounded-xl border border-[#eae3d9] p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[#18181b]">Stress Test — What Could Go Wrong?</h3>
              <ConfidenceDot level={stress.confidence} />
            </div>
            <div className="space-y-4">
              {[
                { label: 'Baseline', pct: stress.baselineRatio, cls: stress.baselineClassification, detail: `${formatEMI(stress.numerator)} / ${formatCurrency(income, true)} income` },
                { label: '−20% income shock', pct: stress.incomeShock.stressedRatioPct, cls: stress.incomeShock.classification, detail: stress.incomeShock.explanation },
                { label: '+2% rate shock', pct: stress.rateShock.stressedRatioPct, cls: stress.rateShock.classification, detail: stress.rateShock.explanation },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#18181b] font-medium">{item.label}</span>
                  </div>
                  <StressBar pct={item.pct} classification={item.cls} />
                  <p className="text-xs text-[#71717a] mt-1 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            {/* Scale legend */}
            <div className="mt-4 pt-3 border-t border-[#eae3d9] flex gap-3 flex-wrap">
              {[
                ['≤35%', 'Comfortable', 'text-emerald-800'],
                ['36–45%', 'Tight', 'text-amber-800'],
                ['46–55%', 'Stressed', 'text-orange-800'],
                ['>55%', 'Unsustainable', 'text-red-700'],
              ].map(([range, label, color]) => (
                <span key={label} className={`text-xs font-medium ${color}`}>{range}: {label}</span>
              ))}
            </div>
          </div>

          {/* Risk Signals */}
          {(decision.hardStopsTriggered.length > 0 || decision.softSignalsTriggered.length > 0) && (
            <div className="bg-white rounded-xl border border-[#eae3d9] p-5 shadow-xs">
              <h3 className="text-sm font-bold text-[#18181b] mb-3">Risk Signals</h3>
              {decision.hardStopsTriggered.map((s, i) => (
                <div key={i} className="flex gap-2 bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3 mb-2 text-sm text-[#991b1b]">
                  <span>🛑</span><span>{s}</span>
                </div>
              ))}
              {decision.softSignalsTriggered.map((s, i) => (
                <div key={i} className="flex gap-2 bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3 mb-2 text-sm text-[#92400e]">
                  <span>⚠</span><span>{s}</span>
                </div>
              ))}
              {decision.escalated && (
                <p className="text-xs text-amber-800 font-medium mt-1">
                  ≥2 soft signals → verdict escalated one notch toward caution.
                </p>
              )}
            </div>
          )}

          {/* Product Route & Collateral Alternatives */}
          <div className="bg-white rounded-xl border border-[#eae3d9] p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#18181b] mb-3">Product Routing & Alternatives</h3>

            <div className="mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#71717a]">Primary borrowing route:</span>
              <p className="text-base font-bold text-[#5a2045] mt-0.5">{productRoute.recommendedRoute}</p>
              <p className="text-sm text-[#3f3f46] mt-1">{productRoute.rationale}</p>
            </div>

            {productRoute.securedAlternative && (
              <div className="p-3.5 bg-[#fbf9f5] border border-[#e6decb] rounded-lg mb-3">
                <span className="text-[11px] font-bold text-[#854d0e] uppercase tracking-wider">Potential secured alternative:</span>
                <p className="text-sm font-bold text-[#18181b] mt-0.5">{productRoute.securedAlternative.product}</p>
                <p className="text-xs text-[#52525b] mt-1">{productRoute.securedAlternative.description}</p>
                <p className="text-[11px] text-[#71717a] mt-2 italic">
                  Note: Owning an eligible asset does not mean you should pledge it. A secured loan reduces interest rates, but your property or gold is pledged as collateral and at risk if payments are missed.
                </p>
              </div>
            )}

            {productRoute.securityWarning && (
              <p className="text-xs text-red-600 mt-2 font-medium">⚠ {productRoute.securityWarning}</p>
            )}
            {productRoute.tradeoffs.length > 0 && (
              <div className="mt-3 space-y-1">
                <span className="text-xs font-semibold text-[#52525b]">Key Tradeoffs:</span>
                {productRoute.tradeoffs.map((t, i) => <p key={i} className="text-xs text-[#71717a]">• {t}</p>)}
              </div>
            )}
          </div>

          {/* Rule 5: What We Know vs. What We Assumed (Compact Expandable) */}
          <div className="bg-white rounded-xl border border-[#eae3d9] p-3.5 sm:p-4 shadow-xs text-xs">
            <button
              type="button"
              onClick={() => setShowProvenance(!showProvenance)}
              className="w-full flex items-center justify-between cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📋</span>
                <span className="text-xs sm:text-sm font-bold text-[#18181b] group-hover:text-[#5a2045] transition-colors">
                  What we know vs. what we assumed
                </span>
                <span className="text-[10px] text-[#71717a] bg-[#faf7f2] px-2 py-0.5 rounded-full border border-[#eae3d9] hidden sm:inline">
                  Inputs &amp; Assumptions Audit
                </span>
              </div>
              <span className="text-xs font-semibold text-[#5a2045] flex items-center gap-1">
                {showProvenance ? 'Hide details ▴' : 'View details ▾'}
              </span>
            </button>

            {showProvenance && (
              <div className="mt-3 pt-3 border-t border-[#eae3d9] space-y-4">
                <p className="text-[#71717a] text-xs">
                  We base our calculations on your reported inputs and documented records, and explicitly disclose every financial assumption.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#52525b]">
                  <div className="bg-[#faf7f2] p-3 rounded-lg border border-[#eae3d9]">
                    <p className="font-bold text-[#18181b] mb-1.5 flex items-center gap-1">
                      <span>✓</span> Reported Inputs (What you told us):
                    </p>
                    <ul className="space-y-1 text-[11px]">
                      <li>• <strong>Income:</strong> {formatCurrency(profile.claimedTotalIncome, true)}/mo ({profile.incomeType === 'salaried' ? 'Salaried' : profile.incomeType === 'self_employed' ? 'Self-Employed' : 'Informal / Gig'})</li>
                      <li>• <strong>Requested Loan:</strong> {formatLakhs(profile.requestedAmount)} for {profile.loanPurpose.replace(/_/g, ' ')}</li>
                      <li>• <strong>Existing Debt:</strong> {formatCurrency(profile.existingEMI, true)}/mo declared EMIs</li>
                      <li>• <strong>Repayment Track:</strong> {profile.repaymentHistory === 'clean' ? 'Clean repayment history' : profile.recentBounce ? 'Recent bounce noted' : 'Unspecified (no clean record inferred)'}</li>
                    </ul>
                  </div>
                  <div className="bg-[#faf7f2] p-3 rounded-lg border border-[#eae3d9]">
                    <p className="font-bold text-[#18181b] mb-1.5 flex items-center gap-1">
                      <span>ℹ️</span> Documented Assumptions:
                    </p>
                    <ul className="space-y-1 text-[11px]">
                      <li>• <strong>Living Essentials:</strong> {profile.essentialExpensesIsDefaulted ? `Assumed at ${profile.incomeType === 'salaried' ? '50%' : '65%'} standard living benchmark` : `${formatCurrency(profile.essentialExpenses, true)}/mo (reported)`}</li>
                      <li>• <strong>Fair Rate Ceiling:</strong> {fairRate.fairRateHigh.toFixed(1)}% p.a. used as conservative barrier for sizing safe principal</li>
                      <li>• <strong>All-in Fees:</strong> ~{effectiveCost.processingFeePct}% processing fee amortized in effective annualized cost</li>
                      <li>• <strong>High-Cost Debt:</strong> {profile.highCostDebtEMIIsDefaulted ? 'Monthly payment assumed at 25% of outstanding balance' : 'None / User-provided'}</li>
                    </ul>
                  </div>
                </div>

                {/* Provenance Audit Table */}
                {output.provenanceSummary && output.provenanceSummary.length > 0 && (
                  <div className="pt-3 border-t border-[#eae3d9]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#18181b] text-xs">Number Provenance &amp; Lineage:</span>
                      <span className="text-[10px] text-[#71717a]">Lineage Breakdown</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {output.provenanceSummary.slice(0, 8).map(item => (
                        <div key={item.id} className="p-2 rounded-lg bg-[#faf7f2] border border-[#eae3d9] flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-semibold text-[#18181b] truncate">{item.label}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0 ${
                                item.tag === 'USER_ANSWER'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.tag === 'ASSUMPTION'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.tag === 'DERIVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs font-bold text-[#5a2045]">
                            <span>{item.value}</span>
                          </div>
                          <p className="text-[10px] text-[#71717a] mt-1 leading-tight">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="text-center py-4">
            <button
              onClick={onShowCard}
              className="bg-[#5a2045] hover:bg-[#481837] text-white font-semibold text-base px-8 py-3 rounded-xl shadow-xs transition-all hover:shadow active:scale-[0.98] cursor-pointer"
            >
              View Negotiation Card →
            </button>
            <p className="text-xs text-[#71717a] mt-2">Printable one-page summary to take to a lender</p>
          </div>
        </div>
      </div>
    </div>
  );
}
