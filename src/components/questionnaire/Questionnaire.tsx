import { useState, useMemo, useEffect, useRef } from 'react';
import type { Answers } from '../../questions/questionEngine';
import {
  MUST_QUESTIONS,
  HIGH_COST_DEBT_QUESTIONS,
  SALARIED_QUESTIONS,
  SELF_EMPLOYED_QUESTIONS,
  INFORMAL_QUESTIONS,
  CROSS_CUTTING_QUESTIONS,
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
  const [answers, setAnswers] = useState<Answers>({
    income_type: 'salaried',
    income_stability: 'stable',
    variable_income_share: 0,
    high_cost_debt: 'none',
    recent_bounce: 'no',
    existing_emi: 0,
  });
  const [step, setStep] = useState<StreamlinedStep>(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    topRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [step]);

  const setValue = (id: string, val: string | number | null) => {
    setAnswers(prev => {
      const updated = { ...prev, [id]: val };
      if (id === 'income_stability') {
        if (val === 'stable') {
          updated.variable_income_share = 0;
        } else if (val === 'moderate' && (!prev.variable_income_share || Number(prev.variable_income_share) === 0)) {
          updated.variable_income_share = 15;
        } else if (val === 'unstable' && (!prev.variable_income_share || Number(prev.variable_income_share) === 0)) {
          updated.variable_income_share = 50;
        }
      }
      if (id === 'income_type') {
        if (val === 'salaried') {
          updated.income_stability = 'stable';
          updated.variable_income_share = 0;
        } else if (val === 'self_employed') {
          updated.income_stability_biz = 'stable';
        } else if (val === 'informal') {
          updated.income_stability_informal = 'stable';
        }
      }
      return updated;
    });
  };

  const hasHighCostDebt = String(answers.high_cost_debt ?? '') === 'has_debt';
  const monthlyIncomeNum = Number(answers.monthly_income ?? 0);

  // Step 1: Core Income & Loan Intent (Adaptive based on income type)
  const step1Questions = useMemo(() => {
    const list: QuestionDef[] = [
      MUST_QUESTIONS[0], // income_type
      MUST_QUESTIONS[1], // monthly_income
    ];

    if (answers.income_type === 'salaried') {
      const qStability = SALARIED_QUESTIONS.find(q => q.id === 'income_stability');
      if (qStability) list.push(qStability);

      if (answers.income_stability === 'moderate' || answers.income_stability === 'unstable') {
        const qVarShare = SALARIED_QUESTIONS.find(q => q.id === 'variable_income_share');
        if (qVarShare) list.push(qVarShare);
      }
    } else if (answers.income_type === 'self_employed') {
      const qBizStability = SELF_EMPLOYED_QUESTIONS.find(q => q.id === 'income_stability_biz');
      if (qBizStability) list.push(qBizStability);
    } else if (answers.income_type === 'informal') {
      const qInfStability = INFORMAL_QUESTIONS.find(q => q.id === 'income_stability_informal');
      if (qInfStability) list.push(qInfStability);
    }

    list.push(MUST_QUESTIONS[2]); // loan_purpose
    list.push(MUST_QUESTIONS[3]); // requested_amount

    return list;
  }, [answers.income_type, answers.income_stability]);

  // Step 2: Cash Flow & Risk Check (4 questions + conditional high-cost debt inline)
  const step2Questions = useMemo(() => [
    MUST_QUESTIONS[4], // existing_emi
    MUST_QUESTIONS[5], // essential_expenses
    MUST_QUESTIONS[6], // high_cost_debt
    MUST_QUESTIONS[7], // recent_bounce
  ], []);

  // Step 3 (Optional): Sharpening rate position and safety margin (3 questions + adaptive ITR)
  const step3Questions = useMemo(() => {
    const qCredit = SALARIED_QUESTIONS.find(q => q.id === 'credit_score');
    const qSavings = CROSS_CUTTING_QUESTIONS.find(q => q.id === 'emergency_savings');
    const qDocs = answers.income_type === 'self_employed'
      ? (SELF_EMPLOYED_QUESTIONS.find(q => q.id === 'documentation_status') ?? SALARIED_QUESTIONS.find(q => q.id === 'documentation_status'))
      : SALARIED_QUESTIONS.find(q => q.id === 'documentation_status');
    const list: QuestionDef[] = [qCredit, qSavings, qDocs].filter((q): q is QuestionDef => Boolean(q));

    if (answers.income_type === 'self_employed' && (answers.documentation_status === 'partial' || answers.documentation_status === 'full')) {
      const qItr = SELF_EMPLOYED_QUESTIONS.find(q => q.id === 'documented_income_itr');
      if (qItr) list.push(qItr);
    }
    return list;
  }, [answers.income_type, answers.documentation_status]);

  const canAdvanceStep1 = () => {
    return Boolean(
      answers.income_type &&
      answers.monthly_income &&
      answers.loan_purpose &&
      answers.requested_amount
    );
  };

  const canFinish = () => {
    return canAdvanceStep1();
  };

  const handleFinish = () => {
    onComplete(answers);
  };

  return (
    <div ref={topRef} className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18181b]">
          {step === 1 && 'Step 1: Income & Loan Need'}
          {step === 2 && 'Step 2: Monthly Cash Flow & Debt'}
          {step === 3 && 'Step 3: Fine-Tune Rates (Optional)'}
        </h2>
        <p className="text-xs sm:text-sm text-[#71717a] mt-1">
          {step === 1 && 'Tell us what you earn and what you are looking to borrow.'}
          {step === 2 && 'Check your existing obligations to see your safe room.'}
          {step === 3 && 'Optional: Add credit score and savings buffer to narrow your rate band.'}
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
            <span className="hidden sm:inline">1. Basic Need</span>
            <span className="sm:hidden">1. Need</span>
          </span>
          <span className={step >= 2 ? 'text-[#5a2045] font-bold' : ''}>
            <span className="hidden sm:inline">2. Cash Flow</span>
            <span className="sm:hidden">2. Cash Flow</span>
          </span>
          <span className={step === 3 ? 'text-[#5a2045] font-bold' : ''}>
            <span className="hidden sm:inline">3. Rate Tune (Optional)</span>
            <span className="sm:hidden">3. Fine-Tune</span>
          </span>
        </div>
      </div>

      {/* Step 1 Questions */}
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

      {/* Step 2 Questions */}
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

                {/* Inline Follow-up if high cost debt is selected */}
                {q.id === 'high_cost_debt' && hasHighCostDebt && (
                  <div className="bg-[#fffbeb] rounded-xl p-4 border border-[#fde68a] space-y-3 ml-2 sm:ml-4">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                      ⚠ High-Cost Debt Details
                    </p>
                    {HIGH_COST_DEBT_QUESTIONS.map(hcdQ => (
                      <QuestionCard
                        key={hcdQ.id}
                        question={hcdQ}
                        value={answers[hcdQ.id]}
                        onChange={val => setValue(hcdQ.id, val)}
                      />
                    ))}
                  </div>
                )}
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

              {/* Primary Next Step Button (Fine-Tune) */}
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-xl text-sm sm:text-base font-bold text-white bg-[#5a2045] hover:bg-[#4b1a39] shadow-xs transition-all text-center cursor-pointer"
              >
                Continue to Fine-Tune (Credit & Savings) →
              </button>
            </div>

            {/* Unhighlighted Small Skip Link */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish()}
                className="text-xs text-[#71717a] hover:text-[#5a2045] font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                Skip fine-tuning and see results now (⚡ Ready) →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 Questions (Optional) */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-[#faf4f8] border border-[#e8d0e0] rounded-xl p-3.5 text-xs text-[#5a2045] leading-relaxed">
            💡 <strong>These 3 questions are completely optional.</strong> You can answer them to refine your rate band and buffer, or skip straight to your results.
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
