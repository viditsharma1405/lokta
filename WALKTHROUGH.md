# 5-Minute Walkthrough

Recording:
[PASTE FINAL VIDEO LINK HERE]

---

## Suggested Video Presentation Timeline

### 0:00–0:30 — Problem & Product Thesis
- **The Core Problem**: Indian retail borrowers face severe information asymmetry. Lenders optimize for maximum eligibility and risk-adjusted loan sizing, whereas borrowers need cash flow safety.
- **Product Thesis**: Lokta Borrower Copilot is a 100% client-side, deterministic financial advisor that turns underwriting judgement into explicit, explainable rules. It introduces the critical distinction: **Lender-Likely Amount** (what they might approve) vs. **Borrower-Safe Amount** (what won't cause distress).

### 0:30–1:30 — Adaptive Questionnaire
- **Adaptive Branching**: Demonstrating that a salaried corporate engineer and a kirana shop owner do not see the same questions.
- **Streamlined Depth**: Starts with ~8–10 core cash flow questions; follow-ups only appear when an answer impacts calculations (e.g. self-employed documentation, high-cost debt breakdown, or collateral assets).
- **Unknown is Never Zero**: Demonstrating that selecting "I don't know" preserves `null` or uses an explicit, documented assumption—widening uncertainty without penalizing credit scores or fabricating precision.

### 1:30–3:00 — Results & Affordability Logic
- **The Affordability Gap**: Walking through Priya's results (Lender-likely ₹12.44L vs. Borrower-safe ₹7.19L).
- **Explainability**: Showing why her safe EMI ceiling is ₹24,000 (disposable surplus × 50% retention factor).
- **Estimated Fair Rate Range**: Demonstrating deterministic position-based pricing (10.5%–12.3%) and explaining positive drivers vs. risk signals.
- **Effective Annualized Cost (APR)**: Showing why nominal interest rates (12.3%) underestimate real cost once upfront processing fees are factored into net proceeds (14.5% APR).

### 3:00–4:00 — The Negotiation Card
- **Borrower Shield**: A one-page printable card designed for the borrower to carry into bank branches.
- **Actionable Limits**: Explicit walk-away interest rate, maximum safe loan principal, processing fee cap, and binding monthly payment ceiling.
- **Leverage Points**: Automatically surfacing borrower strengths (e.g., tenure, clean repayment, unencumbered collateral).

### 4:00–4:30 — Anita / Don't Borrow Example
- **Reaching "Don't Borrow"**: Loading Anita Devi's profile (informal gig income, recent payment bounce, and ₹35,000 high-cost debt).
- **Hard Stops in Action**: Demonstrating how high-cost debt burden (33.7% of safe income > 30% threshold) triggers an immediate `DONT_BORROW` verdict.
- **Mathematical Transparency**: Showing that even when the verdict is negative, mathematical capacities remain fully visible, framed clearly as *educational math, not a recommendation to borrow*.

### 4:30–5:00 — What I Would Build Next & What I Intentionally Cut
- **Summary of Product Decisions**: What was built deliberately vs. what was scoped out to preserve simplicity and deterministic trust.

---

## What I Would Build Next

*(Realistic future roadmap items — intentionally excluded from the current build to preserve client-side simplicity, zero-dependency trust, and defensible deterministic logic)*

1. **Richer Lender & Product Data Feeds**:
   - Integrate verified, regularly updated aggregator APIs or scraped public bank benchmark rate cards across PSU banks, private banks, and top NBFCs.
   - Expand product coverage to education loans, medical emergency credit lines, and green energy financing.

2. **Comprehensive Fee & Ancillary Cost Comparison**:
   - Account for GST on processing fees (18%), mandatory loan insurance premiums, documentation charges, and stamp duty variations across Indian states.
   - Provide side-by-side total outflow comparisons across competing lender quote sheets.

3. **Multi-Scenario Cash Flow & Prepayment Simulator**:
   - Model the impact of partial prepayments, annual bonus lumpsums, and floating benchmark rate resets on cumulative interest paid.
   - Allow borrowers to stress-test personal life events (e.g. child education, planned sabbatical) against long-tenure obligations.

4. **Robust Collateral Valuation Integration**:
   - Integrate circle-rate databases and localized property valuation indices to replace self-reported property estimates with verifiable zonal ranges.
   - Distinguish standard purity hallmarks (22k vs 18k) and prevailing MCX gold spot prices for precise gold loan LTV sizing.

5. **Local Language Accessibility (Indic Localization)**:
   - Provide full vernacular language support (Hindi, Tamil, Telugu, Marathi, Bengali) and voice-assisted input to empower non-English speaking semi-urban borrowers.

---

## What I Would Cut

*(Features and complexities that could be removed to create an even more ruthless, high-conversion, and focused borrower tool)*

1. **SIP Wealth Opportunity Comparison**:
   - *Why cut*: While contrasting loan interest with 12% compounding SIP wealth is an eye-opening educational exercise, it risks distracting borrowers from the immediate credit negotiation task. In a minimal version, removing the SIP calculator keeps 100% of attention on the four core outputs and the Negotiation Card.

2. **Granular Live Scenario Sliders in Results**:
   - *Why cut*: Allowing borrowers to freely adjust monthly income and existing EMIs on the results screen is great for edge-case exploration, but can lead borrowers to "fiddle" with numbers until they see an amount they like, defeating the discipline of self-assessment. Locking the results to answered inputs and requiring a structured questionnaire re-take enforces financial honesty.

3. **Dual Secured-vs-Unsecured Alternative Routing**:
   - *Why cut*: Displaying secondary alternative products (e.g. Gold Loan alternative alongside a Personal Loan) adds cognitive load to borrowers who are already anxious about credit. A simpler version would present only the single optimal route determined by the engine.

4. **Multi-Category Expense Breakdown**:
   - *Why cut*: Asking borrowers to separate rent, utilities, and lifestyle spending creates friction. Relying on a single total monthly expense figure paired with regional demographic benchmark floors produces equivalent calculation safety with significantly higher questionnaire completion rates.
