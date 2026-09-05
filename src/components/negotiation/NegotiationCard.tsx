import type { BorrowerProfile } from '../../types/profile';
import type { CopilotOutput } from '../../types/calculations';
import { formatCurrency, formatEMI, formatRateBand, formatPercent, formatLakhs } from '../../utils/currency';
import { computeLoanCostBreakdown, computeSIPComparison } from '../../engine/emi';
import { TENURE_DEFAULTS } from '../../rules/constants';
import { determineLoanTypeKey } from '../../engine/lenderCapacity';

interface NegotiationCardProps {
  profile: BorrowerProfile;
  output: CopilotOutput;
  personaName: string;
  onBack: () => void;
}

export default function NegotiationCardView({ profile, output, personaName, onBack }: NegotiationCardProps) {
  const { lenderCapacity, safeCapacity, fairRate, effectiveCost, stress, decision, productRoute } = output;
  const isDontBorrow = decision.verdict === 'DONT_BORROW';

  const loanTypeKey = determineLoanTypeKey(profile);
  const defaultTenure = TENURE_DEFAULTS[loanTypeKey] ?? 36;
  const recommendedPrincipal = safeCapacity.recommendedAmount > 0 ? safeCapacity.recommendedAmount : profile.requestedAmount;
  const cardLoanCost = computeLoanCostBreakdown(
    recommendedPrincipal,
    fairRate.fairRateMid,
    defaultTenure,
    effectiveCost.processingFeePct
  );
  const cardSIP = computeSIPComparison(
    safeCapacity.recommendedEMI > 0 ? safeCapacity.recommendedEMI : cardLoanCost.monthlyEMI,
    defaultTenure,
    12,
    cardLoanCost.totalInterest
  );

  const verdictLabel = {
    'BORROW': 'Borrow',
    'BORROW_LESS': 'Borrow Less',
    'DONT_BORROW': "Don't Borrow",
  }[decision.verdict] ?? decision.verdict;

  const verdictColor = {
    'BORROW': 'text-[#065f46] border-[#a7f3d0] bg-[#ecfdf5]',
    'BORROW_LESS': 'text-[#92400e] border-[#fde68a] bg-[#fffbeb]',
    'DONT_BORROW': 'text-[#991b1b] border-[#fecaca] bg-[#fef2f2]',
  }[decision.verdict] ?? '';

  // Build reasons
  const reasons: string[] = [];
  if (decision.hardStopsTriggered.length > 0) {
    reasons.push(...decision.hardStopsTriggered.map(s => s.split('.')[0] + '.'));
  }
  if (safeCapacity.safeAmount < profile.requestedAmount && lenderCapacity.lenderLikelyAmount >= profile.requestedAmount) {
    reasons.push('Requested amount exceeds your safe carrying capacity, even though a lender would likely approve.');
  }
  if (profile.essentialExpensesIsDefaulted) {
    reasons.push('Household expenses were estimated — please confirm for a sharper picture.');
  }
  if (profile.highCostDebtEMIIsDefaulted) {
    reasons.push('High-cost debt monthly payment was estimated at ₹' + Math.round(profile.highCostDebtEMI).toLocaleString('en-IN') + '/month (25% of outstanding).');
  }
  if (reasons.length === 0) {
    reasons.push(decision.reason);
  }

  // Build checklist
  const checklist: string[] = [
    'Negotiate the processing fee — most lenders will reduce it if asked.',
    'Ask whether the interest rate is fixed or floating.',
    'Ask for a complete fee schedule upfront (foreclosure, prepayment, late payment).',
  ];
  if (productRoute.isSecured) {
    checklist.push('Request formal property/collateral valuation before finalizing.');
  }
  if (profile.coApplicantIncome > 0) {
    checklist.push('Confirm whether co-applicant income can be formally included in the application.');
  }
  checklist.push('Confirm total EMI including all fees stays below your safe ceiling.');
  if (decision.verdict === 'BORROW_LESS') {
    checklist.push(`Ask if the lender offers the product at ₹${formatLakhs(safeCapacity.recommendedAmount)} instead of the full amount.`);
  }

  // Confidence summary
  const confSummary = [
    `Lender capacity: ${lenderCapacity.confidence}`,
    `Safe capacity: ${safeCapacity.confidence}`,
    `Fair rate: ${fairRate.confidence}`,
    `Decision: ${decision.confidence}`,
  ].join(' • ');

  return (
    <div>
      {/* Controls - not printed */}
      <div className="flex justify-between items-center mb-4 sm:mb-6 no-print gap-2">
        <button onClick={onBack} className="text-xs sm:text-sm text-[#5a2045] hover:text-[#4b1a39] font-semibold cursor-pointer py-2 px-1">
          ← Back to Results
        </button>
        <button
          onClick={() => window.print()}
          className="bg-[#5a2045] hover:bg-[#4b1a39] text-white font-semibold px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <span>🖨</span> <span>Print This Card</span>
        </button>
      </div>

      {/* The Card */}
      <div className="negotiation-card bg-white rounded-xl sm:rounded-2xl border border-[#eae3d9] p-4 sm:p-8 max-w-3xl mx-auto shadow-xs text-[#18181b]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#eae3d9] pb-4 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#18181b]">Negotiation Card</h2>
            <p className="text-xs text-[#71717a]">Lokta Borrower Copilot • Self-Assessment Summary</p>
            {personaName && <p className="text-xs text-[#5a2045] font-semibold mt-0.5">Demo: {personaName}</p>}
          </div>
          <div className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border-2 font-bold text-base sm:text-lg self-start sm:self-auto ${verdictColor}`}>
            {verdictLabel}
          </div>
        </div>

        {isDontBorrow && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3 mb-5 text-xs sm:text-sm text-[#991b1b] font-semibold text-center">
            ⚠ These are mathematical capacity estimates, not an invitation to borrow.
          </div>
        )}

        {/* Key Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-[#faf7f2] rounded-xl p-2.5 sm:p-3 border border-[#eae3d9]">
            <p className="text-[11px] sm:text-xs text-[#71717a] font-medium">Requested</p>
            <p className="text-base sm:text-lg font-bold text-[#18181b] mt-0.5">{formatLakhs(profile.requestedAmount)}</p>
          </div>
          <div className="bg-[#faf7f2] rounded-xl p-2.5 sm:p-3 border border-[#eae3d9]">
            <p className="text-[11px] sm:text-xs text-[#71717a] font-medium">Lender-Likely</p>
            <p className="text-base sm:text-lg font-bold text-[#18181b] mt-0.5">{formatLakhs(lenderCapacity.lenderLikelyAmount)}</p>
          </div>
          <div className="bg-[#faf7f2] rounded-xl p-2.5 sm:p-3 border border-[#eae3d9]">
            <p className="text-[11px] sm:text-xs text-[#71717a] font-medium">Safe Ceiling</p>
            <p className="text-base sm:text-lg font-bold text-[#065f46] mt-0.5">{formatLakhs(safeCapacity.safeAmount)}</p>
          </div>
          <div className="bg-[#faf7f2] rounded-xl p-2.5 sm:p-3 border border-[#eae3d9]">
            <p className="text-[11px] sm:text-xs text-[#71717a] font-medium">Recommended</p>
            <p className="text-base sm:text-lg font-bold text-[#065f46] mt-0.5">{formatLakhs(safeCapacity.recommendedAmount)}</p>
          </div>
        </div>

        {/* Rate & Cost */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-6 bg-[#faf7f2] border border-[#eae3d9] rounded-xl p-3 sm:p-4">
          <div>
            <p className="text-[11px] sm:text-xs text-[#71717a]">Fair Rate Band</p>
            <p className="text-sm sm:text-base font-bold text-[#5a2045] mt-0.5">{formatRateBand(fairRate.fairRateLow, fairRate.fairRateHigh)}</p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-[#71717a]">Effective Cost</p>
            <p className="text-sm sm:text-base font-bold text-[#18181b] mt-0.5">
              {effectiveCost.effectiveAnnualizedCostRange
                ? `${formatPercent(effectiveCost.effectiveAnnualizedCostRange.low)}–${formatPercent(effectiveCost.effectiveAnnualizedCostRange.high)}`
                : formatPercent(effectiveCost.effectiveAnnualizedCost)
              }
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-[#71717a]">Borrower-Safe Ceiling</p>
            <p className="text-sm sm:text-base font-bold text-[#065f46] mt-0.5">{formatEMI(safeCapacity.safeEMI)}</p>
          </div>
          <div>
            <p className="text-[11px] sm:text-xs text-[#71717a]">Stress Result</p>
            <p className="text-sm sm:text-base font-bold text-[#18181b] mt-0.5">{stress.baselineClassification}</p>
          </div>
        </div>

        {/* Investment Opportunity Cost */}
        <div className="mb-5 sm:mb-6">
          <div className="bg-[#f2f8f4] rounded-xl p-3.5 sm:p-4 border border-[#cde5d6]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-xs font-bold text-[#065f46] uppercase tracking-wide">Illustrative Opportunity-Cost Comparison (SIP)</span>
              <span className="text-xs font-semibold text-[#065f46]">{defaultTenure} mo</span>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-[#065f46]">{formatCurrency(cardSIP.futureValue, true)}</p>
            <p className="text-xs text-[#064e3b] mt-1 leading-relaxed">
              At an assumed 12% annual return, investing {formatEMI(cardSIP.monthlyInvestment)}/mo creates a {formatCurrency(cardSIP.futureValue, true)} portfolio (+{formatCurrency(cardSIP.wealthGain, true)} returns) instead of paying interest.
            </p>
            <p className="text-[11px] text-[#065f46] font-semibold mt-1">
              Not guaranteed; market returns can be lower or negative • Net wealth swing: {formatCurrency(cardSIP.netWealthDifference, true)} in your favour
            </p>
          </div>
        </div>

        {/* Product route */}
        <div className="mb-5">
          <p className="text-xs text-[#71717a] font-medium mb-1">Recommended Product</p>
          <p className="text-sm font-bold text-[#5a2045]">{productRoute.recommendedRoute}</p>
        </div>

        {/* Reasons */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#71717a] uppercase tracking-wider mb-2">Key Reasons</p>
          {reasons.slice(0, 4).map((r, i) => (
            <p key={i} className="text-xs sm:text-sm text-[#3f3f46] mb-1.5">• {r}</p>
          ))}
        </div>

        {/* Negotiation Checklist */}
        <div className="mb-5 bg-[#faf7f2] border border-[#eae3d9] rounded-xl p-3.5 sm:p-4">
          <p className="text-xs font-semibold text-[#5a2045] uppercase tracking-wider mb-2.5">Negotiation Checklist</p>
          {checklist.map((item, i) => (
            <label key={i} className="flex items-start gap-2.5 mb-2 text-xs sm:text-sm text-[#18181b] cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-[#5a2045] min-w-[15px] min-h-[15px]" />
              <span>{item}</span>
            </label>
          ))}
        </div>

        {/* Confidence */}
        <div className="text-[11px] sm:text-xs text-[#71717a] mb-3">{confSummary}</div>

        {/* Disclaimer */}
        <div className="text-[11px] sm:text-xs text-[#71717a] border-t border-[#eae3d9] pt-3 leading-relaxed">
          <strong>Disclaimer:</strong> This is a self-assessment, not a lender decision. No bureau data was pulled. No personal data is stored. Property valuation is not verified. Lender-specific pricing and underwriting discretion are not known. All numbers are estimates based on self-reported inputs. Use the safer number when deciding how much to borrow.
        </div>
      </div>
    </div>
  );
}
