# Lokta Borrower Copilot

> A borrower-side self-assessment tool that turns lending judgement into rules a borrower can see.

**🌐 Live Demo:** [https://viditsharma1405.github.io/lokta/](https://viditsharma1405.github.io/lokta/)  
**📦 GitHub Repository:** [https://github.com/viditsharma1405/lokta](https://github.com/viditsharma1405/lokta)

## What This Is

A pure client-side financial assessment tool that answers five questions for any prospective borrower:

1. **Should I borrow at all?**
2. **How much might a lender approve?** (lender-likely amount)
3. **How much is actually safe for me?** (borrower-safe amount)
4. **What rate should I negotiate?** (fair rate band)
5. **What EMI should I not cross?** (EMI ceiling)

It then generates a one-page **Negotiation Card** the borrower can print and take to any lender.

## What This Is NOT

- ❌ A credit-scoring model
- ❌ A lender underwriting system
- ❌ A bureau integration (no credit report is pulled)
- ❌ An ML model or LLM-powered advisor
- ❌ A generic EMI calculator
- ❌ A tool that tries to maximize your loan amount

The tool deliberately optimizes for **borrower safety**, not maximum eligibility.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run persona tests (Priya, Ravi, Anita)
npx tsx src/tests/personaTests.ts

# Run edge-case tests
npx tsx src/tests/edgeCaseTests.ts

# Production build
npm run build
```

Visit `http://localhost:5173` and either start the questionnaire or load a demo persona.

## Architecture

```
src/
├── engine/              # Pure TypeScript calculation engine (no React/browser deps)
│   ├── emi.ts           # Standard EMI formula + inverse + effective rate solver
│   ├── income.ts        # Income normalization (Section 3)
│   ├── lenderCapacity.ts # FOIR + LTV → lender-likely amount (Section 4)
│   ├── safeCapacity.ts  # Retention factors → borrower-safe amount (Section 5)
│   ├── fairRate.ts      # Deterministic position model → rate band (Section 6)
│   ├── effectiveCost.ts # Processing fee → effective annualized cost (Section 7)
│   ├── stressTest.ts    # Income & rate shock scenarios (Section 8)
│   ├── decision.ts      # Hard stops + soft signals → verdict (Section 9)
│   ├── productRoute.ts  # Loan product routing
│   └── index.ts         # Pipeline orchestrator
├── rules/
│   └── constants.ts     # Every frozen constant with source labels
├── types/
│   ├── profile.ts       # BorrowerProfile type
│   ├── calculations.ts  # All calculation output types
│   └── results.ts       # Confidence, NegotiationCard types
├── questions/
│   ├── questionDefs.ts  # All question definitions with impact declarations
│   └── questionEngine.ts # Answers → BorrowerProfile normalization
├── data/
│   └── personas.ts      # Priya, Ravi, Anita pre-normalized profiles
├── components/
│   ├── common/          # Landing page
│   ├── questionnaire/   # Multi-stage adaptive questionnaire
│   ├── results/         # Results dashboard with all outputs
│   └── negotiation/     # Printable Negotiation Card
├── utils/
│   └── currency.ts      # ₹ formatting (lakhs/crores)
└── tests/
    ├── personaTests.ts  # 24 persona validation tests
    └── edgeCaseTests.ts # 26 edge case tests
```

### Design Principles

1. **Engine is pure TypeScript** — no React, no browser APIs, no side effects. Can be tested in Node or Deno.
2. **Every constant is source-labeled** — "My judgement", "External fact (RBI 2026)", "Assignment-derived".
3. **Every question has an impact declaration** — which outputs it affects and why.
4. **Two amounts, always** — lender-likely (their number) vs. borrower-safe (your number). The safe amount is always the one we recommend.
5. **Productive return never enters calculations** — stored for display framing only.
6. **DONT_BORROW shows math anyway** — but clearly labels it as "mathematical capacity, not a recommendation."
7. **No backend** — everything runs client-side. No data leaves the browser.

## Demo Personas

| Persona | Income | Profile | Verdict |
|---------|--------|---------|---------|
| **Priya** | ₹1.1L salaried, 5yr, CIBIL 780 | Personal loan ₹8L | BORROW_LESS |
| **Ravi** | ₹60K SE (ITR ₹35K), 14yr biz, shop ₹45L | LAP ₹15L | BORROW_LESS |
| **Anita** | ₹26K gig, ₹35K HCD, bounce | Two-wheeler ₹1.5L | DONT_BORROW |

## Rules

See [RULES.md](./RULES.md) for the complete rule-by-rule specification with sources, thresholds, and impact declarations.

## Key Design Decisions

### Why two amounts?

The lender-likely amount tells you what a lender would probably approve. The borrower-safe amount tells you what's genuinely safe for your cash flow. The gap between them is where most financial stress originates.

### Why does productive return not affect calculations?

Per the frozen rules (Issue 4), productive return never enters any calculation function. A borrower saying "this loan will generate income" is a prediction, not a fact. Using it numerically would create incentives to overstate return estimates and rationalize over-borrowing.

### Why are default tenures not maximized?

Longer tenure = lower EMI = passes the FOIR check more easily. But longer tenure = more total interest paid. Default tenures use market norms, not maximums.

### Why does DONT_BORROW still show amounts?

The borrower has a right to see the math. But the amounts are framed as "mathematical capacity only" — not as a recommendation to borrow. This prevents the tool from feeling like a gatekeeper while still being honest about the risk.

## Technology

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- No backend, no API keys, no database
- Works entirely offline after initial load
