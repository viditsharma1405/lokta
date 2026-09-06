# Lokta Borrower Copilot

> A borrower-side financial self-assessment tool that turns lending judgement into transparent, explainable rules a borrower can see.

**🌐 Live Demo:** [https://viditsharma1405.github.io/lokta/](https://viditsharma1405.github.io/lokta/)  
**📦 GitHub Repository:** [https://github.com/viditsharma1405/lokta](https://github.com/viditsharma1405/lokta)

---

## What the Product Does

Lokta Borrower Copilot is a client-side financial copilot designed to solve the critical information asymmetry in Indian retail lending. Lenders optimize for loan size and institutional risk-return, often approving amounts that lead to payment stress or default. 

Lokta answers five fundamental questions for any prospective borrower:
1. **Should I borrow at all?** (Actionable verdict: `BORROW`, `BORROW_LESS`, or `DONT_BORROW`)
2. **How much might a lender approve?** (Lender-likely amount based on FOIR and illustrative LTV)
3. **How much is actually safe for my cash flow?** (Borrower-safe amount reserving a protective buffer)
4. **What interest rate should I negotiate?** (Estimated fair rate range mapped to market product bands)
5. **What monthly payment should I never cross?** (Safe monthly EMI ceiling)

It synthesizes these outputs into a printable one-page **Negotiation Card** that the borrower can take into bank or NBFC branches.

---

## Core System Architecture

1. **Deterministic Rules-Based Financial Engine**: Pure TypeScript calculation pipeline with zero external runtime dependencies, no network requests, no databases, and no probabilistic black-box models. Every number is explainable.
2. **Adaptive Questionnaire**: Starts with ~8–10 core cash flow questions and branches dynamically based on employment segment (salaried, self-employed, informal), documentation evidence, high-cost debt, and collateral.
3. **Lender-Likely vs. Borrower-Safe Distinction**: Clearly contrasts what a financial institution would lend against what a household budget can safely absorb.
4. **Estimated Fair Rate Range & All-In Effective Cost**: Employs a deterministic 0–100 position model within observed Q1 2026 Indian benchmark bands, combined with an iterative bisection IRR root solver to compute true annualized borrowing cost (APR) including upfront processing fees.
5. **Macro Cash-Flow Stress Testing**: Simulates dual-shock scenarios (−20% income drop and +2pp benchmark interest rate rise) to classify debt service resilience into *Comfortable*, *Tight*, *Stressed*, or *Unsustainable*.
6. **Negotiation Card**: Provides clear, actionable walk-away numbers (maximum safe principal, target rate, fee cap, and maximum monthly EMI).

---

## Documentation Deliverables

- [RULES.md](./RULES.md) — Comprehensive rule-by-rule specification with values, rationale, and provenance categorization (`| What | Value | Why | Source or my judgement |`).
- [RUNTHROUGHS.md](./RUNTHROUGHS.md) — Complete end-to-end user journeys (Sections A through O) for Priya, Ravi, and Anita.
- [WALKTHROUGH.md](./WALKTHROUGH.md) — 5-minute video presentation guide, suggested timeline, and realistic future roadmap.

---

## Run Locally

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` to explore the application or load pre-configured persona assessments.

---

## Validation & Test Suite

The project includes an extensive automated test suite covering regulatory math, persona baselines, edge cases, and regression verifications:

```bash
# Run test suite (369 passing tests across Persona, Edge Case, and Hardening suites)
npm test

# Run linter (oxlint)
npm run lint

# Production build & TypeScript check (tsc -b && vite build)
npm run build
```

---

## Key Design Decisions

- **Why No ML or LLMs?** Financial safety calculations require 100% deterministic, audit-proof arithmetic. A borrower making life-altering borrowing decisions deserves reproducible math, not non-deterministic token generation or halluncinated rates.
- **Why No Bureau Integration?** Pulling bureau reports creates a hard inquiry that can lower a borrower's credit score. Lokta operates as a self-assessment tool before approaching lenders.
- **Why No Login, Database, or Backend?** Complete borrower privacy. Financial details remain strictly client-side in browser memory and never leave the device.
- **Why Are Safe and Lender Amounts Separate?** Lenders check whether a loan will default immediately under maximum debt-service limits (e.g. 50%–60% FOIR). The borrower-safe amount checks what payment leaves enough buffer for groceries, medical emergencies, and school fees. The gap between these two numbers is where financial distress begins.
- **Why Does Unknown Information Widen Bands Instead of Penalizing?** "Unknown ≠ Bad". An unverified credit score or missing tax return should widen uncertainty (lower confidence) rather than automatically pushing rates to subprime levels.
- **Why Does All-In Effective Cost Matter?** A nominal 12% loan with a 2% processing fee deducted upfront results in an effective APR significantly higher than the advertised headline rate.
- **Why Use Adaptive Questions?** Salaried corporate employees, kirana store owners, and gig delivery workers have fundamentally different cash flow structures. Asking irrelevant questions adds cognitive friction without improving decision quality.

---

## Limitations

1. **Self-Reported Inputs Are Not Verified**: The application evaluates self-reported figures. If entered inputs are inaccurate, the calculated capacity will reflect those inaccuracies.
2. **Lender Underwriting Discretion**: Actual bank and NBFC underwriting criteria, credit policies, and risk-pricing matrices vary across institutions and over time.
3. **Illustrative Collateral Valuation & LTV**: Real property and gold valuations require licensed technical appraisals and legal scrutiny. Illustrative LTV caps (70% residential, 60% commercial, tiered gold) are educational heuristics.
4. **Market Rate Bands Are Benchmarks**: Quoted rate bands represent observed Q1 2026 Indian retail credit averages, not binding contractual quotes.
5. **Effective Cost / APR Estimates**: Excludes state stamp duty, optional insurance premiums, GST on fees, and prepayment/foreclosure penalties that vary by lender.
