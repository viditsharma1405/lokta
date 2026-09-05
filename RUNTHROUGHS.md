# RUNTHROUGHS.md — Lokta Borrower Copilot

> Detailed, mathematically verified persona run-throughs demonstrating the complete end-to-end user journey for three representative Indian borrowers:
> 1. **Priya Sharma** (Prime Salaried Software Engineer)
> 2. **Ravi Kumar** (Self-Employed Kirana Store Owner)
> 3. **Anita Devi** (Informal / Gig Worker with High-Cost Debt)
>
> Every section (A through O) contains exact, uninvented outputs matching the production calculation engine and verified test suite.

---

## 1. Persona 1: Priya Sharma (Salaried IT Professional)

### A. Input Answers
- **Earning Segment**: Salaried employee (`salaried`)
- **Monthly Take-Home Salary**: ₹1,10,000
- **Essential Monthly Living Expenses**: ₹48,000
- **Existing Monthly Loan EMIs**: ₹14,000 (Car loan)
- **High-Cost Debt**: None (`no_debt`)
- **Income Predictability**: Highly predictable / stable (`stable`)
- **Cheque/ECS Bounce in Past 12 Months**: No (`no`)
- **Loan Purpose**: Personal / Family Event (`personal_event`)
- **Requested Loan Amount**: ₹8,00,000
- **Desired Loan Tenure**: 36 months (`36`)
- **Credit Score Range**: Excellent (750+) (`750_plus`)

### B. Exact Questions Shown (Core)
1. *How do you earn your income?* → Salaried
2. *What is your net monthly take-home income?* → ₹1,10,000
3. *What are your monthly essential living expenses?* → ₹48,000
4. *What is your total ongoing monthly EMI across all existing loans?* → ₹14,000
5. *Do you have any active high-cost debt?* → No
6. *How predictable is your monthly income?* → Highly predictable
7. *Have you had any cheque or ECS/NACH mandate bounce in the past 12 months?* → No
8. *What is the primary purpose of this loan?* → Personal / Family Event
9. *How much would you like to borrow?* → ₹8,00,000
10. *What repayment period are you aiming for?* → 36 months
11. *What is your credit score range?* → Excellent (750+)

### C. Adaptive Questions Shown
- *How long have you been with your current employer?* → More than 5 years (`gt_5yr`)
- *Would you be willing to pledge an asset as collateral for this loan?* → No (`none`)
*(Note: Bonus/incentive volatility question skipped because income stability was reported as "Highly predictable".)*

### D. Assumptions Made
- **Fair Rate Ceiling as Principal Amortization Rate**: 12.34% p.a. (fairRateHigh) used as conservative rate to size safe principal capacity.
- **Base Retention Factor**: 50% for stable salaried income (My judgement).
- **Processing Fee Benchmark**: Midpoint of 1.75% for Personal Loan (Market observation).

### E. O1 — Verdict
- **Verdict**: **BORROW_LESS**
- **Reason**: Requested amount (₹8,00,000) exceeds the borrower-safe ceiling (₹7,19,059). A bank would approve up to ₹12,44,405, but ₹7,19,059 is the genuine safe limit for her cash flow.

### F. O2 — Lender-Likely Amount
- **Lender-Likely Amount**: **₹12,44,405**
- **Math**: 50% FOIR on ₹1,10,000 = ₹55,000 max total debt service. Minus ₹14,000 existing car EMI = ₹41,000 available monthly EMI. At 11.44% fair mid-rate for 36 months, ₹41,000 supports ₹12.44L.

### G. O2 — Borrower-Safe Amount
- **Borrower-Safe Ceiling**: **₹7,19,059** (supported by safe EMI ceiling of ₹24,000).
- **Recommended Target (90% Headroom)**: **₹6,47,154** (supported by recommended EMI of ₹21,600).

### H. Which Amount the Borrower Should Actually Use
- **Guidance**: Use **₹6,47,154** (or up to the **₹7,19,059** safe ceiling).
- **Explanation**: A bank may gladly approve ₹12.44 Lakhs because their underwriting check only tests whether the loan will default immediately. But borrowing ₹12.44L would commit 50% of Priya's gross income to debt payments, leaving almost no buffer for rent, emergencies, or investments.

### I. O3 — Fair Rate Band
- **Estimated Fair Rate Range**: **10.5% – 12.3% p.a.** (Midpoint: 11.44% p.a.)
- **Positioning**: Starts at neutral 50 → Credit ≥750 (-15), Clean repayment (-3), Stable income (-5), Good documentation (-3) = Final position 24/100 (Bank personal loan band 10.0%–16.0%).
- **Uncertainty Spread**: 0 unknown factors → half-width ±15 pts (±0.90%).

### J. Effective All-In Borrowing Cost / APR
- **Estimated Effective Cost**: **14.5% p.a.** (Range: 13.9%–15.1% p.a.)
- **Breakdown**: Nominal rate 12.34% + upfront processing fee of 1.75% (₹11,325) deducted from ₹6.47L principal yields net proceeds of ₹6.36L.

### K. O4 — Monthly EMI Ceiling
- **Safe EMI Ceiling**: **₹24,000/month**
- **Math**: Disposable surplus = ₹1,10,000 − ₹48,000 − ₹14,000 = ₹48,000. Applying 50% retention factor = ₹24,000/month.

### L. Recommended EMI
- **Recommended EMI**: **₹21,600/month** (`safeEMI × 0.90`).

### M. Tenure Trade-Off
- At 36 months, requested loan EMI is ₹26,357 (exceeds ₹24,000 safe ceiling by ₹2,357).
- Extending tenure to 48 months lowers EMI to ₹20,862 (comfortably below ceiling), but increases total interest paid from ₹1.49L to ₹2.01L (+₹52,000 interest penalty).

### N. Stress Result
- **Baseline Debt-Service Ratio**: 32.4% (**Comfortable**)
- **−20% Income Shock (to ₹88,000)**: 40.5% (**Tight**)
- **+2pp Rate Shock (to 13.4%)**: 32.7% (**Comfortable**)

### O. Negotiation Card Contents
- **Target Loan Principal**: ₹6,47,154 (Safe ceiling: ₹7,19,059)
- **Fair Interest Rate Target**: 10.5% – 11.4% (Walk away if > 12.3%)
- **Processing Fee Cap**: Max 1.75% (₹11,325)
- **Monthly EMI Limit**: Never sign an agreement with monthly payment > ₹24,000.

---

## 2. Persona 2: Ravi Kumar (Self-Employed Kirana Store Owner)

### A. Input Answers
- **Earning Segment**: Self-employed enterprise (`self_employed`)
- **Monthly Business Take-Home Cash Flow**: ₹60,000 (Midpoint of typical ₹40k–₹80k range)
- **Documented Income**: ₹35,000/month (ITR filed at ₹4.20 Lakhs/year)
- **Essential Monthly Living Expenses**: Unsure / skipped (Defaulted to 65% benchmark = ₹50,700)
- **Existing Monthly Loan EMIs**: ₹0
- **High-Cost Debt**: None (`no_debt`)
- **Income Predictability**: Predictable / established (`stable`)
- **Cheque/ECS Bounce in Past 12 Months**: No (`no`)
- **Loan Purpose**: Business expansion (`business_expansion`)
- **Requested Loan Amount**: ₹15,00,000
- **Desired Loan Tenure**: 84 months (`84` — standard 7-year LAP default)
- **Credit Score Range**: Thin file / no formal credit history (`thin_file`)

### B. Exact Questions Shown (Core)
1. *How do you earn your income?* → Self-employed
2. *What is your net monthly take-home income?* → ₹60,000
3. *What are your monthly essential living expenses?* → I'm not sure (Assumed 65%)
4. *What is your total ongoing monthly EMI across all existing loans?* → ₹0
5. *Do you have any active high-cost debt?* → No
6. *How predictable is your monthly income?* → Predictable / steady
7. *Have you had any cheque or ECS/NACH mandate bounce in the past 12 months?* → No
8. *What is the primary purpose of this loan?* → Business expansion
9. *How much would you like to borrow?* → ₹15,00,000
10. *What repayment period are you aiming for?* → 84 months
11. *What is your credit score range?* → No credit history / Thin file

### C. Adaptive Questions Shown
- *How long has your business been continuously operating?* → 14 years
- *Would you be willing to pledge an asset as collateral for this loan?* → Commercial property (`property_commercial`)
- *What is the estimated market value of your collateral asset?* → ₹45,00,000
- *What tax records do you have for this business?* → Income Tax Returns filed (`itr`)
- *Will a family member join as an explicit co-applicant?* → Yes (`yes`), wife earnings ₹18,000/month

### D. Assumptions Made
- **DEMO ASSUMPTION**: Ravi's wife's income (₹18,000/month) is factored as an explicit joint co-applicant in the baseline demo profile.
- **Living Expense Default**: Estimated at 65% of combined safe household income (₹78,000) = ₹50,700 (Uncertainty range ±15pp).
- **Illustrative Collateral LTV**: 60% illustrative LTV for commercial real estate (`₹45,00,000 × 60% = ₹27,00,000`).
- **Valuation Haircut**: 20% arbitrary haircut has been removed; capacity evaluates as borrower-reported value × illustrative LTV (clearly labeled as borrower estimate; actual lender appraisal may differ).
- **Base Retention Factor**: 40% for self-employed with ITR.

### E. O1 — Verdict
- **Verdict**: **BORROW_LESS**
- **Reason**: Requested amount (₹15,00,000) exceeds borrower-safe capacity (₹6,03,868). While a lender would sanction up to ₹21,42,934 backed by his commercial shop, borrowing ₹15L would jeopardize his business cash flow.

### F. O2 — Lender-Likely Amount
- **Lender-Likely Amount**: **₹21,42,934**
- **Math**: Lender-recognized income = ₹35,000 (ITR) + 75% of ₹25,000 undocumented surplus (₹18,750) + ₹18,000 co-applicant = ₹71,750 (capped at ₹63k tier baseline). 60% secured FOIR allows ₹37,800/month debt service. At 11.98% for 84 months, ₹37,800 supports ₹21.43 Lakhs. Collateral LTV ceiling is ₹27,00,000, so FOIR is binding.

### G. O2 — Borrower-Safe Amount
- **Borrower-Safe Ceiling**: **₹6,03,868** (supported by safe EMI ceiling of ₹10,920).
- **Recommended Target (90% Headroom)**: **₹5,43,482** (supported by recommended EMI of ₹9,828).

### H. Which Amount the Borrower Should Actually Use
- **Guidance**: Use **₹5,43,482** (or up to the **₹6,03,868** safe ceiling).
- **Explanation**: A bank or NBFC will gladly lend ₹21.4 Lakhs because they hold a mortgage on a ₹45 Lakh shop. If Ravi defaults, the lender sells the shop. But Ravi's business cash flow can only comfortably support an EMI of ~₹10,000.

### I. O3 — Fair Rate Band
- **Estimated Fair Rate Range**: **11.2% – 12.8% p.a.** (Midpoint: 11.98% p.a.)
- **Positioning**: Starts at 50 → Thin file (+3), Clean repayment (-3), Stable income (-5), Partial documentation (0) = Final position 45/100 (Bank LAP band 9.5%–15.0% unlocked by 14-yr business + tangible commercial property).
- **Spread**: 0 unknown factors → half-width ±15 pts (±0.82%).

### J. Effective All-In Borrowing Cost / APR
- **Estimated Effective Cost**: **14.1% p.a.** (Range: 14.0%–14.3% p.a.)
- **Breakdown**: Nominal rate 12.80% + upfront processing fee of 1.5% (₹8,152) on ₹5.43L principal.

### K. O4 — Monthly EMI Ceiling
- **Safe EMI Ceiling**: **₹10,920/month**
- **Math**: Safe income ₹78,000 − ₹50,700 living expenses = ₹27,300 disposable surplus. 40% retention = ₹10,920/month.

### L. Recommended EMI
- **Recommended EMI**: **₹9,828/month** (`safeEMI × 0.90`).

### M. Tenure Trade-Off
- Requested ₹15 Lakhs at 84 months requires ₹26,712/month (nearly 2.5× the safe ceiling).
- Even extending to 120 months (10 years) only reduces EMI to ₹21,506/month — still nearly double safe capacity. Loan amount must be scaled down.

### N. Stress Result
- **Baseline Debt-Service Ratio**: 12.6% (**Comfortable**)
- **−20% Income Shock (to ₹62,400)**: 15.8% (**Comfortable**)
- **+2pp Rate Shock (to 14.0%)**: 13.0% (**Comfortable**)

### O. Negotiation Card Contents
- **Target Loan Principal**: ₹5,43,482 (Safe ceiling: ₹6,03,868)
- **Fair Interest Rate Target**: 11.2% – 12.0% (Walk away if > 12.8%)
- **Negotiation Leverage**: 14 years in same location, unencumbered commercial shop valued at ₹45L, consecutive ITR track record.
- **Monthly EMI Limit**: Do not commit to monthly payment > ₹10,920.

---

## 3. Persona 3: Anita Devi (Informal / Gig Worker with High-Cost Debt)

### A. Input Answers
- **Earning Segment**: Informal / Gig earner (`informal`)
- **Monthly Take-Home Cash Flow**: ₹26,000 (Lower bound of ₹26k–₹30k range)
- **Documented Income**: ₹0 (No formal payslips, no ITR)
- **Essential Monthly Living Expenses**: Unsure / skipped (Defaulted to 65% benchmark = ₹16,900)
- **Existing Formal Bank EMIs**: ₹0
- **High-Cost Debt**: Yes (`has_debt`), ₹35,000 outstanding balance
- **Income Predictability**: Fluctuating / seasonal (`fluctuating`)
- **Cheque/ECS Bounce in Past 12 Months**: Yes (`yes` — informal payment default)
- **Loan Purpose**: Vehicle purchase (`vehicle`)
- **Requested Loan Amount**: ₹1,50,000 (Electric scooter)
- **Desired Loan Tenure**: 36 months (`36`)
- **Credit Score Range**: Don't know / unknown (`unknown`)

### B. Exact Questions Shown (Core)
1. *How do you earn your income?* → Informal / Gig worker
2. *What is your net monthly take-home income?* → ₹26,000
3. *What are your monthly essential living expenses?* → I'm not sure (Assumed 65%)
4. *What is your total ongoing monthly EMI across all existing loans?* → ₹0
5. *Do you have any active high-cost debt?* → Yes
6. *How predictable is your monthly income?* → Fluctuating
7. *Have you had any cheque or ECS/NACH mandate bounce in the past 12 months?* → Yes
8. *What is the primary purpose of this loan?* → Vehicle purchase
9. *How much would you like to borrow?* → ₹1,50,000
10. *What repayment period are you aiming for?* → 36 months
11. *What is your credit score range?* → I don't know my score

### C. Adaptive Questions Shown
- *What is your approximate outstanding balance on this high-cost debt?* → ₹35,000
- *What is your monthly payment on this high-cost debt?* → I don't know (Estimated at 25% default = ₹8,750/month)
- *Do you have any written records of your earnings?* → Cash only (`cash_only`)
- *Would you be willing to pledge an asset as collateral for this loan?* → No (`none`)
- *How many financial dependents rely on your income?* → 2 (Children)
- *How many months of emergency expenses do you have saved?* → Less than 1 month (`lt_1m`)

### D. Assumptions Made
- **High-Cost Debt Monthly Repayment**: Assumed at 25% of ₹35,000 balance = ₹8,750/month (Range: 15%–30%).
- **Living Expense Default**: Estimated at 65% of ₹26,000 = ₹16,900.
- **Retention Factor Floor**: 25% base − 5% high variable − 10% recent bounce = 10% (clamped at floor).
- **Unknown Credit Score**: Scored as 0 adjustment (not penalized to 300); widens uncertainty band by ±20 pts.

### E. O1 — Verdict
- **Verdict**: **DONT_BORROW**
- **Hard Stops Triggered**:
  1. *SEVERE: High-cost debt burden (33.7% of safe income) exceeds the 30% critical threshold.*
  2. *COMPOUND: High-cost debt burden is 33.7% and you reported a recent EMI bounce.*
- **Action Suggestion**: Clear the ₹35,000 high-cost debt first before considering vehicle financing.

### F. O2 — Lender-Likely Amount
- **Lender-Likely Amount**: **₹0**
- **Math**: Lender recognizes ₹6,500/month (25% weak recognition on unverified gig earnings). 35% informal FOIR permits ₹2,275 max debt service. Existing high-cost debt payment of ₹8,750 consumes the entire allocation, leaving ₹0 new headroom.

### G. O2 — Borrower-Safe Amount
- **Borrower-Safe Ceiling**: **₹916**
- **Recommended Target (90% Headroom)**: **₹825**
- *(Displayed for mathematical transparency only; framed as mathematical capacity, NOT a borrowing recommendation).*

### H. Which Amount the Borrower Should Actually Use
- **Guidance**: **₹0 (DO NOT BORROW)**.
- **Explanation**: Anita is already in critical financial distress. Monthly surplus after groceries, rent, and high-cost debt is only ₹350. Adding any monthly loan payment will cause immediate default and severe deprivation for her family.

### I. O3 — Fair Rate Band
- **Estimated Fair Rate Range**: **19.0% – 22.0% p.a.** (Midpoint: 20.56% p.a.)
- **Positioning**: Starts at 50 → Credit unknown (0), Recent bounce (+10), Unstable income (+7), No documentation (+8), High-cost debt (+7) = Final position 82/100 (NBFC Two-Wheeler band 14.0%–22.0%).
- **Spread Widening**: 1 unknown factor (credit score) widens uncertainty half-width to ±20 pts (±1.60%) without shifting midpoint upward.

### J. Effective All-In Borrowing Cost / APR
- **Estimated Effective Cost**: **25.7% p.a.** (Nominal 22.0% + 1.5% processing fee).

### K. O4 — Monthly EMI Ceiling
- **Safe EMI Ceiling**: **₹35/month**
- **Math**: Disposable cash flow = ₹26,000 − ₹16,900 − ₹8,750 = ₹350. 10% clamped retention = ₹35/month.

### L. Recommended EMI
- **Recommended EMI**: **₹31.50/month**.

### M. Tenure Trade-Off
- Requested ₹1,50,000 two-wheeler loan requires an EMI of ~₹5,730/month for 36 months (or ~₹4,980 for 48 months).
- Anita has only ₹350/month in total uncommitted cash. No tenure adjustment can bridge a ₹5,000 monthly deficit.

### N. Stress Result
- **Baseline Debt-Service Ratio**: 33.8% on existing debt alone (**Comfortable** mathematically, but vulnerable).
- **−20% Income Shock (to ₹20,800)**: 42.2% (**Tight**).

### O. Negotiation Card Contents
- **Clear Warning Header**: "Recommendation: Resolve High-Cost Debt First Before Borrowing"
- **Risk Drivers**:
  - High-cost debt payment (₹8,750/mo) consumes 33.7% of total monthly income.
  - Recent payment bounce recorded in the last 12 months.
  - Less than 1 month of emergency savings.
- **Financial Prescription**: Prioritize paying off the ₹35,000 high-cost debt immediately to free up ₹8,750 in monthly cash flow before taking on a vehicle loan.
