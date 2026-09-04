import { useState, useMemo, useEffect, useRef } from 'react';
import type { Answers } from '../../questions/questionEngine';
import {
  Q_INCOME_TYPE,
  Q_MONTHLY_INCOME,
  Q_INCOME_STABILITY,
  Q_LOAN_PURPOSE,
  Q_REQUESTED_AMOUNT,
  Q_EXISTING_EMI,
  Q_ESSENTIAL_EXPENSES,
  EXPENSE_BUCKET_QUESTION,
  Q_HIGH_COST_DEBT,
  Q_HIGH_COST_DEBT_AMOUNT,
  Q_HIGH_COST_DEBT_MONTHLY,
  Q_RECENT_BOUNCE,
  Q_CREDIT_SCORE,
  Q_EMPLOYMENT_TENURE,
  Q_VARIABLE_INCOME_SHARE,
  Q_BUSINESS_TENURE,
  Q_DOCUMENTED_INCOME_SE,
  Q_DOCUMENTED_INCOME_ITR,
  Q_INFORMAL_RECORDS,
  Q_INFORMAL_SUPPORTED_AMOUNT,
  Q_COLLATERAL_AVAILABLE,
  Q_COLLATERAL_VALUE,
  Q_CO_APPLICANT,
  Q_CO_APPLICANT_INCOME,
  Q_DEPENDENTS,
  Q_OTHER_EARNER,
  Q_EMERGENCY_SAVINGS,
  Q_UPCOMING_LARGE_EXPENSE,
  DOCUMENTED_MONTHLY_INCOME_QUESTION,
  type QuestionDef,
} from '../../questions/questionDefs';

interface QuestionnaireProps {
  onComplete: (answers: Answers) => void;
}

function QuestionCard({
  question,
  value,
  onChange,
  onQuickFill,
  quickFillLabel,
}: {
  question: QuestionDef;
  value: string | number | null | undefined;
  onChange: (val: string | number | null) => void;
  onQuickFill?: () => void;
  quickFillLabel?: string;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const strVal = value === null || value === undefined ? '' : String(value);

  return (
    <div className="bg-white rounded-xl border border-[#eae3d9] p-4 sm:p-5 shadow-xs transition-all hover:border-[#d5cdc2]">
      <div className="flex justify-between items-start flex-wrap sm:flex-nowrap gap-2 mb-1">
        <label className="block text-sm sm:text-base font-semibold text-[#18181b] leading-snug">
          {question.label}
          {question.required && <span className="text-red-600 ml-1 font-bold">*</span>}
        </label>
        {quickFillLabel && onQuickFill && (
          <button
            type="button"
            onClick={onQuickFill}
            className="text-xs font-semibold text-[#5a2045] bg-[#f4e7f0] hover:bg-[#ebd8e5] border border-[#e8d0e0] px-2.5 py-1 rounded-md transition-all flex-shrink-0 cursor-pointer active:bg-[#ebd8e5]"
          >
            {quickFillLabel}
          </button>
        )}
      </div>

      {question.helpText && (
        <p className="text-xs sm:text-sm text-[#71717a] mb-3">{question.helpText}</p>
      )}

      {/* Select / Radio inputs */}
      {(question.type === 'select' || question.type === 'select_or_unknown') && question.options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {question.options.map(opt => (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs sm:text-sm transition-all active:scale-[0.99] ${
                strVal === opt.value
                  ? 'border-[#5a2045] bg-[#faf4f8] font-semibold text-[#5a2045] shadow-xs ring-1 ring-[#5a2045]'
                  : 'border-[#eae3d9] bg-[#faf7f2] hover:border-[#cfc6b8] text-[#18181b]'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={strVal === opt.value}
                onChange={() => onChange(opt.value)}
                className="accent-[#5a2045]"
              />
              <span className="leading-snug">{opt.label}</span>
            </label>
          ))}
          {question.allowUnknown && (
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs sm:text-sm transition-all sm:col-span-2 active:scale-[0.99] ${
                strVal === 'unknown'
                  ? 'border-[#71717a] bg-[#f2efe9] font-semibold text-[#18181b]'
                  : 'border-[#eae3d9] bg-[#faf7f2] hover:border-[#cfc6b8] text-[#71717a]'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value="unknown"
                checked={strVal === 'unknown'}
                onChange={() => onChange('unknown')}
                className="accent-[#71717a]"
              />
              <span className="italic">{question.unknownLabel ?? "I don't know / Not sure"}</span>
            </label>
          )}
        </div>
      )}

      {/* Numeric / Currency inputs */}
      {(question.type === 'currency' || question.type === 'number') && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {question.prefix && (
              <span className="text-[#18181b] font-bold text-sm bg-[#f2efe9] px-2.5 sm:px-3 py-2.5 rounded-lg border border-[#eae3d9] flex-shrink-0">
                {question.prefix}
              </span>
            )}
            <input
              type="text"
              inputMode="numeric"
              value={strVal === 'unknown' ? '' : strVal ? Number(strVal).toLocaleString('en-IN') : ''}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || /^\d+\.?\d*$/.test(raw)) {
                  onChange(raw === '' ? null : raw);
                }
              }}
              placeholder={question.placeholder}
              className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 text-base sm:text-lg font-semibold border border-[#eae3d9] rounded-lg focus:ring-2 focus:ring-[#5a2045] focus:border-[#5a2045] outline-none text-[#18181b] bg-white placeholder-[#a1a1aa]"
            />
            {question.suffix && (
              <span className="text-[#71717a] text-xs sm:text-sm bg-[#f2efe9] px-2.5 sm:px-3 py-2.5 rounded-lg border border-[#eae3d9] flex-shrink-0">
                {question.suffix}
              </span>
            )}
          </div>

          {question.type === 'currency' && question.allowUnknown && (
            <label className="inline-flex items-center gap-2 mt-2 cursor-pointer text-xs text-[#71717a] hover:text-[#18181b]">
              <input
                type="checkbox"
                checked={strVal === 'unknown'}
                onChange={e => onChange(e.target.checked ? 'unknown' : null)}
                className="accent-[#5a2045]"
              />
              <span className="italic">{question.unknownLabel ?? "I don't know exact amount"}</span>
            </label>
          )}
        </div>
      )}

      {/* Boolean inputs */}
      {question.type === 'boolean' && (
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => onChange('yes')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
              strVal === 'yes'
                ? 'border-[#5a2045] bg-[#faf4f8] text-[#5a2045] shadow-xs ring-1 ring-[#5a2045]'
                : 'border-[#eae3d9] bg-[#faf7f2] text-[#18181b] hover:border-[#cfc6b8]'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange('no')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${
              strVal === 'no'
                ? 'border-[#5a2045] bg-[#faf4f8] text-[#5a2045] shadow-xs ring-1 ring-[#5a2045]'
                : 'border-[#eae3d9] bg-[#faf7f2] text-[#18181b] hover:border-[#cfc6b8]'
            }`}
          >
            No
          </button>
        </div>
      )}

      {/* Why we ask this expander */}
      <div className="mt-2.5 pt-2 border-t border-[#eae3d9] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowWhy(!showWhy)}
          className="text-xs text-[#5a2045] hover:text-[#4b1a39] font-semibold flex items-center gap-1 cursor-pointer"
        >
          {showWhy ? '▾' : '▸'} Why we ask this
        </button>
        <span className="text-[11px] text-[#71717a] capitalize">Affects: {question.affects.join(', ')}</span>
      </div>
      {showWhy && (
        <p className="mt-2 text-xs text-[#52525b] bg-[#faf7f2] rounded-lg p-2.5 border border-[#eae3d9] leading-relaxed">
          {question.whyWeAsk}
        </p>
      )}
    </div>
  );
}

type StreamlinedStep = 1 | 2 | 3;

export default function Questionnaire({ onComplete }: QuestionnaireProps) {
  // Clean initial state — zero un-provided facts are pre-assumed
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState<StreamlinedStep>(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    topRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [step]);

  const setValue = (id: string, val: string | number | null) => {
    setAnswers(prev => {
      const updated = { ...prev, [id]: val };
      if (id === 'income_type') {
        // If income type changes, clear type-specific answers
        if (val === 'salaried') {
          delete updated.business_tenure;
          delete updated.collateral_available;
          delete updated.collateral_value;
          delete updated.documented_income_itr;
        } else if (val === 'self_employed') {
          delete updated.employment_tenure;
          delete updated.variable_income_share;
        } else if (val === 'informal') {
          delete updated.business_tenure;
          delete updated.employment_tenure;
          delete updated.documented_income_itr;
          delete updated.collateral_available;
          delete updated.collateral_value;
        }
      }
      return updated;
    });
  };

  const monthlyIncomeNum = Number(answers.monthly_income ?? 0);

  // ── Step 1 Questions: Core Income & Need + Adaptive Branches ───────────────
  const step1Questions = useMemo(() => {
    const list: QuestionDef[] = [Q_INCOME_TYPE];

    // Branch A: Salaried tenure
    if (answers.income_type === 'salaried') {
      list.push(Q_EMPLOYMENT_TENURE);
    }

    // Branch B: Self-employed business tenure
    if (answers.income_type === 'self_employed') {
      list.push(Q_BUSINESS_TENURE);
    }

    // Core Income & Stability
    list.push(Q_MONTHLY_INCOME);
    list.push(Q_INCOME_STABILITY);

    // Variable pay follow-up if salaried with fluctuating earnings
    if (
      answers.income_type === 'salaried' &&
      (answers.income_stability === 'moderate' || answers.income_stability === 'unstable')
    ) {
      list.push(Q_VARIABLE_INCOME_SHARE);
    }

    // Loan purpose & amount
    list.push(Q_LOAN_PURPOSE);
    list.push(Q_REQUESTED_AMOUNT);

    // Branch E: Business Purpose Collateral (Unlocks LAP/Gold routing)
    if (
      answers.income_type === 'self_employed' &&
      (answers.loan_purpose === 'business_expansion' ||
        answers.loan_purpose === 'vehicle' ||
        answers.loan_purpose === 'other')
    ) {
      list.push(Q_COLLATERAL_AVAILABLE);

      const col = answers.collateral_available;
      if (col === 'property_commercial' || col === 'property_residential' || col === 'gold') {
        list.push(Q_COLLATERAL_VALUE);
      }
    }

    return list;
  }, [
    answers.income_type,
    answers.income_stability,
    answers.loan_purpose,
    answers.collateral_available,
  ]);

  // ── Step 2 Questions: Cash Flow & Existing Debt ────────────────────────────
  const step2Questions = useMemo(() => {
    const list: QuestionDef[] = [
      Q_EXISTING_EMI,
      Q_ESSENTIAL_EXPENSES,
    ];

    // Coarse bucket follow-up if expenses are unknown
    if (answers.essential_expenses === 'unknown') {
      list.push(EXPENSE_BUCKET_QUESTION);
    }

    list.push(Q_HIGH_COST_DEBT);

    // Follow-ups if high-cost debt is reported
    if (answers.high_cost_debt === 'has_debt') {
      list.push(Q_HIGH_COST_DEBT_AMOUNT);
      list.push(Q_HIGH_COST_DEBT_MONTHLY);
    }

    list.push(Q_RECENT_BOUNCE);

    return list;
  }, [answers.essential_expenses, answers.high_cost_debt]);

  // ── Step 3 Questions: Risk Profile, Household & Fine-Tuning ────────────────
  const step3Questions = useMemo(() => {
    const list: QuestionDef[] = [Q_CREDIT_SCORE];

    // Adaptive documentation questions by borrower segment
    if (answers.income_type === 'self_employed') {
      list.push(Q_DOCUMENTED_INCOME_SE);
      list.push(Q_DOCUMENTED_INCOME_ITR);
    } else if (answers.income_type === 'informal') {
      list.push(Q_INFORMAL_RECORDS);
      if (answers.documentation_status === 'partial') {
        list.push(Q_INFORMAL_SUPPORTED_AMOUNT);
      }
    } else {
      // Salaried documentation status
      const qDocSalary: QuestionDef = {
        id: 'documentation_status',
        label: 'What income documentation can you provide?',
        helpText: 'Payslips, Form 16, and bank salary credits.',
        whyWeAsk: 'Full documentation confirms your income at 100% value without any underwriting haircut.',
        type: 'select',
        options: [
          { value: 'full', label: 'Salary slips + Bank statements + Form 16 / ITR all available' },
          { value: 'partial', label: 'Bank credits available, but no formal salary slips' },
          { value: 'none', label: 'Cash salary / No formal documentation' },
        ],
        allowUnknown: true,
        unknownLabel: 'Not sure what I have',
        affects: ['lenderCapacity', 'fairRate'],
        reason: 'Documented income receives full recognition.',
        group: 'credit',
      };
      list.push(qDocSalary);
      if (answers.documentation_status === 'partial') {
        list.push(DOCUMENTED_MONTHLY_INCOME_QUESTION);
      }
    }

    // Co-applicant confirmation and income
    list.push(Q_CO_APPLICANT);
    if (answers.co_applicant === 'yes') {
      list.push(Q_CO_APPLICANT_INCOME);
    }

    // Dependents and other earner
    list.push(Q_DEPENDENTS);
    if (Number(answers.dependents ?? 0) > 2) {
      list.push(Q_OTHER_EARNER);
    }

    // Emergency savings buffer
    list.push(Q_EMERGENCY_SAVINGS);

    // Upcoming large expense
    list.push(Q_UPCOMING_LARGE_EXPENSE);

    return list;
  }, [
    answers.income_type,
    answers.documentation_status,
    answers.co_applicant,
    answers.dependents,
  ]);

  const canAdvanceStep1 = () => {
    return Boolean(
      answers.income_type &&
      answers.monthly_income &&
      answers.loan_purpose &&
      answers.requested_amount
    );
  };

  const canAdvanceStep2 = () => {
    return (
      answers.existing_emi !== undefined &&
      answers.essential_expenses !== undefined &&
      answers.high_cost_debt !== undefined &&
      answers.recent_bounce !== undefined
    );
  };

  const handleFinish = () => {
    onComplete(answers);
  };

  return (
    <div ref={topRef} className="max-w-2xl mx-auto pb-12">
      {/* Header — Section 30 compliant */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#faf4f8] text-[#5a2045] text-xs font-semibold px-3 py-1 rounded-full border border-[#e8d0e0] mb-2">
          <span>⚡ Adaptive Borrower Copilot</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18181b]">
          Quick borrower assessment
        </h2>
        <p className="text-xs sm:text-sm text-[#71717a] mt-1.5 max-w-lg mx-auto">
          We'll ask a few core questions, then only the follow-ups that matter for your situation.
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-[#eae3d9] rounded-full h-2 mt-4 overflow-hidden">
          <div
            className="bg-[#5a2045] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] sm:text-xs text-[#71717a] mt-1.5 px-1 font-medium">
          <span className={step >= 1 ? 'text-[#5a2045] font-bold' : ''}>
            <span className="hidden sm:inline">1. Income & Needs</span>
            <span className="sm:hidden">1. Need</span>
          </span>
          <span className={step >= 2 ? 'text-[#5a2045] font-bold' : ''}>
            <span className="hidden sm:inline">2. Cash Flow & Debt</span>
            <span className="sm:hidden">2. Cash Flow</span>
          </span>
          <span className={step === 3 ? 'text-[#5a2045] font-bold' : ''}>
            <span className="hidden sm:inline">3. Household & Buffers (Optional)</span>
            <span className="sm:hidden">3. Fine-Tune</span>
          </span>
        </div>

        {/* Dynamic Branch Indicator */}
        {answers.income_type && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-[#faf4f8] text-[#5a2045] text-[11px] font-medium px-3 py-1 rounded-full border border-[#e8d0e0]">
            <span>⚡ Adaptive branch active:</span>
            <span>
              {answers.income_type === 'salaried'
                ? 'Salaried stream — corporate payroll standards; business vintage & ITR skipped.'
                : answers.income_type === 'self_employed'
                ? 'Business owner stream — business vintage, collateral (LAP), and ITR enabled.'
                : 'Informal/gig stream — digital receipts & bank credits enabled; ITR skipped.'}
            </span>
          </div>
        )}
      </div>

      {/* Step 1: Core Income & Need */}
      {step === 1 && (
        <div className="space-y-4">
          {step1Questions.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={val => setValue(q.id, val)}
            />
          ))}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canAdvanceStep1()}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer ${
                canAdvanceStep1()
                  ? 'bg-[#5a2045] text-white hover:bg-[#4b1a39]'
                  : 'bg-[#eae3d9] text-[#a1a1aa] cursor-not-allowed shadow-none'
              }`}
            >
              Continue to Cash Flow →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Cash Flow & Existing Obligations */}
      {step === 2 && (
        <div className="space-y-4">
          {step2Questions.map(q => {
            let quickLabel: string | undefined;
            let quickAction: (() => void) | undefined;

            if (q.id === 'existing_emi') {
              quickLabel = 'No existing loans (₹0)';
              quickAction = () => setValue('existing_emi', 0);
            } else if (q.id === 'essential_expenses' && monthlyIncomeNum > 0) {
              const half = Math.round(monthlyIncomeNum * 0.5);
              quickLabel = `Estimate 50% (₹${half.toLocaleString('en-IN')})`;
              quickAction = () => setValue('essential_expenses', half);
            }

            return (
              <div key={q.id} className="space-y-3">
                <QuestionCard
                  question={q}
                  value={answers[q.id]}
                  onChange={val => setValue(q.id, val)}
                  quickFillLabel={quickLabel}
                  onQuickFill={quickAction}
                />
              </div>
            );
          })}

          {/* Action Buttons for Step 2 */}
          <div className="pt-4 border-t border-[#eae3d9] space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-[#52525b] hover:bg-[#f2efe9] border border-[#eae3d9] cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!canAdvanceStep2()}
                className={`w-full sm:flex-1 py-3.5 px-6 rounded-xl text-sm sm:text-base font-bold shadow-xs transition-all text-center cursor-pointer ${
                  canAdvanceStep2()
                    ? 'text-white bg-[#5a2045] hover:bg-[#4b1a39]'
                    : 'bg-[#eae3d9] text-[#a1a1aa] cursor-not-allowed shadow-none'
                }`}
              >
                Continue to Household & Buffers →
              </button>
            </div>

            {/* Skip Link to See Immediate Results */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleFinish}
                disabled={!canAdvanceStep1()}
                className="text-xs text-[#71717a] hover:text-[#5a2045] font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                Skip fine-tuning and see results now (⚡ Ready) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Household, Risk & Fine-Tuning */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-[#faf4f8] border border-[#e8d0e0] rounded-xl p-3.5 text-xs text-[#5a2045] leading-relaxed">
            💡 <strong>These follow-ups sharpen your calculation.</strong> Any skipped answers will be treated as unknown, which broadens your uncertainty band without penalizing you with manufactured assumptions.
          </div>

          {step3Questions.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={val => setValue(q.id, val)}
            />
          ))}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#eae3d9]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-[#52525b] hover:bg-[#f2efe9] border border-[#eae3d9] cursor-pointer"
            >
              ← Back
            </button>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-[#71717a] hover:text-[#18181b] hover:bg-[#f2efe9] cursor-pointer text-center"
              >
                Skip & View Results
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full sm:w-auto px-8 py-3.5 sm:py-3 rounded-xl text-sm font-bold text-white bg-[#5a2045] hover:bg-[#4b1a39] shadow-xs cursor-pointer text-center active:scale-[0.99]"
              >
                Calculate Results →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
