# Lokta Borrower Copilot

> A borrower-side financial self-assessment tool that turns lending judgement into transparent, explainable rules a borrower can see.

**🌐 Live Demo:** [https://viditsharma1405.github.io/lokta/](https://viditsharma1405.github.io/lokta/)  
**📦 GitHub Repository:** [https://github.com/viditsharma1405/lokta](https://github.com/viditsharma1405/lokta)

---

## Product Thesis

When evaluating loan products, prospective borrowers often face significant information asymmetry regarding credit limits, pricing benchmarks, and true cash-flow affordability.

Lokta Borrower Copilot helps borrowers answer four fundamental questions:
1. **Should I borrow?** (Actionable verdict: `BORROW`, `BORROW_LESS`, or `DONT_BORROW`)
2. **How much might a lender consider?** (Simplified lender-side estimate based on repayment and collateral constraints)
3. **How much should I safely borrow?** (Borrower-safe amount reserving protective household buffers)
4. **What rate and EMI should I negotiate?** (Market rate benchmarks, all-in effective cost, and safe EMI limits)

### Lender-Likely vs. Borrower-Safe Capacity

A central concept in Lokta is the distinction between lender capacity and borrower safety:

> *A lender-side estimate reflects a simplified view of what may be supportable under the model’s repayment and collateral constraints. Borrower-safe capacity is intentionally more conservative and includes household buffers.*

While an institutional underwriting check primarily evaluates whether an obligation fits standard debt-service ratios (e.g., 50% FOIR) or collateral coverage, borrower safety focuses on whether monthly payments leave sufficient surplus for essential living expenses, healthcare, emergencies, and household resilience.

---

## System Architecture

```
User Input
    ↓
Adaptive Questionnaire
    ↓
Borrower Profile
    ↓
Deterministic Rules Engine
    ↓
Results Dashboard
    ↓
Negotiation Card
```

The system is powered by a deterministic, client-side calculation pipeline:
- **No Machine Learning (ML)**
- **No Large Language Models (LLMs)**
- **No Backend Server**
- **No Database**
- **No Credit Bureau Pull**
- **100% Borrower-Provided Inputs**
- **Deterministic Rules & Explainable Formulas**

The rules engine includes:
- **Lender Capacity**: Deterministic FOIR limits (50% salaried, 45%/35% self-employed, 35% informal, 60% secured) and tiered recognition of unevidenced income.
- **Safe Capacity**: Disposable cash flow after essentials, baseline retention factors (25%–50%), and risk-adjusted buffers.
- **Fair Rate**: Deterministic 0–100 positioning within market rate bands; unknown factors widen uncertainty rather than penalizing rates.
- **Effective Cost**: Root-solved annualized cost (APR) factoring in upfront processing fee deductions.
- **EMI & Static Tenure Trade-Off**: Standard amortization math comparing payments and total interest across typical tenure options.
- **Stress Test**: Dual macro scenarios (−20% income reduction and +2pp interest rate rise) to evaluate repayment resilience.
- **Decision Engine**: Hard stops for severe debt distress, soft signals, and actionable borrowing verdicts.
- **Product Routing**: Automated mapping to relevant credit categories (Personal, Business, LAP, Two-Wheeler, Gold) based on loan purpose and collateral.

---

## Adaptive Questionnaire

The questionnaire adapts dynamically based on the borrower's earning segment and circumstances:

- **Salaried Borrowers**: Collects monthly take-home income, employment tenure, and variable pay (bonuses/commissions) if earnings fluctuate.
- **Self-Employed Borrowers**: Collects monthly income, business operating tenure, documentation type (ITR, bank records, or cash), variable-income component, and relevant asset collateral or co-applicant details.
- **Gig / Informal Borrowers**: Collects monthly income, supporting digital evidence (bank deposits or app payout statements), high-cost debt details, and variable-income component.

The questionnaire asks only for single monthly income values (it does not ask for income ranges or separate lower/typical/higher bounds).

---

## Variable Income

For self-employed and gig/informal borrowers, the questionnaire asks:

> *"How much of your monthly income typically varies month to month?"*  
> Options: `0–10%` | `10–30%` | `More than 30%` | `Not sure`

A variable component above 30% triggers a modest safe-affordability buffer (−5 percentage-point retention adjustment) so that lean months are protected.

> *This is a borrower-side modelling assumption, not an RBI-mandated threshold.*

---

## Collateral & Secured Lending

For borrowers with qualifying assets (residential/commercial real estate or gold):

$$\text{Collateral-Supported Amount} = \text{Borrower-Reported Collateral Value} \times \text{Illustrative LTV}$$

For secured credit products:

$$\text{Estimated Lender Ceiling} = \min(\text{Repayment-Capacity-Supported Amount}, \text{Collateral-Supported Amount})$$

> *This is a simplified borrower-side underwriting heuristic, not a universal lender formula. Actual lender valuation and applicable LTV may differ.*

---

## Documentation Deliverables

- [RULES.md](./RULES.md) — Comprehensive rule-by-rule specification detailing formulas, values, rationale, and provenance categorization (`| What | Value | Why | Source or my judgement |`).
- [RUNTHROUGHS.md](./RUNTHROUGHS.md) — Complete end-to-end user journeys (Sections A through O) for Priya, Ravi, and Anita reflecting the live questionnaire and exact computed outputs.
- [WALKTHROUGH.md](./WALKTHROUGH.md) — Presentation guide, video walkthrough structure, and roadmap.

---

## Limitations

1. **Borrower-Reported Inputs**: All calculations rely on self-reported information and are not independently verified against documents or bank statements.
2. **Self-Reported Credit Score**: The model does not pull credit bureau records; credit score ranges are entered by the user.
3. **Market-Level Benchmark Rates**: Quoted interest rate bands represent illustrative market-level benchmarks (observed Q1 2026 Indian credit averages), not lender-specific contractual offers.
4. **Borrower-Reported Collateral**: Collateral values are self-reported estimates. Actual lender valuation, legal title verification, and institutional LTV policies will vary.
5. **Lender Underwriting Policies Vary**: Financial institutions apply differing internal risk matrices, debt-burden ratios, and eligibility guidelines.
6. **Effective Borrowing Cost Scope**: Effective annualized cost calculations include nominal interest and upfront processing fees, but exclude state stamp duty, optional insurance premiums, GST on fees, and foreclosure charges.
7. **Decision Aid, Not a Credit Approval System**: The application is a borrower-side decision support tool, not a lender credit approval engine.

---

## Validation

The test suite covers persona scenarios, edge cases, and rule-hardening cases:

```bash
# Run test suite
npm test

# Run linter
npm run lint

# Production build & TypeScript check
npm run build
```

---

## Deployment

The application is deployed as a static Single Page Application (SPA) on GitHub Pages:
- **Live URL:** [https://viditsharma1405.github.io/lokta/](https://viditsharma1405.github.io/lokta/)
- **Build Tool:** Vite + React + TypeScript
- **Hosting:** GitHub Pages via GitHub Actions automated deployment
