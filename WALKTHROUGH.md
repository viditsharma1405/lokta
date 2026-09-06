# 5-Minute Walkthrough

Recording:
https://drive.google.com/file/d/1uH_YQQx8m-xHrJNh19PWEjvgEijshZa9/view?usp=sharing


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
