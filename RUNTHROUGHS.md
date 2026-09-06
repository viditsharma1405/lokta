# RUNTHROUGHS.md — Lokta Borrower Copilot

> Detailed, mathematically verified persona run-throughs demonstrating the complete end-to-end user journey for three representative Indian borrowers:
> 1. **Priya Sharma** (Prime Salaried Software Engineer)
> 2. **Ravi Kumar** (Self-Employed Kirana Store Owner)
> 3. **Anita Devi** (Informal / Gig Worker with High-Cost Debt)
>
> Every section (A through O) contains exact outputs matching the production calculation engine and verified test suite.

---

## 1. Persona 1: Priya Sharma (Salaried IT Professional)

### Persona Background Facts
- **Age**: 29
- **Location**: Bengaluru
- **Occupation**: Salaried software engineer at a large MNC (5 years tenure)
- **Income**: Net monthly take-home salary of ₹1,10,000
- **Existing Debt**: Car loan EMI of ₹14,000/month (2 years remaining)
- **Credit Score**: 780 (Prime / Excellent)
- **Living Expenses**: Rent ₹28,000/month; total essential living expenses ₹48,000/month
- **Borrowing Need**: Considering ₹8,00,000 personal loan for a family wedding

### A. Input Answers
- **Earning Segment**: Salaried employee (`salaried`)
- **Monthly Take-Home Salary**: ₹1,10,000
- **Essential Monthly Living Expenses**: ₹48,000
- **Existing Monthly Loan EMIs**: ₹14,000 (Car loan)
- **High-Cost Debt**: None (`none`)
- **Income Predictability**: Highly predictable / stable (`stable`)
- **Cheque/ECS Bounce in Past 12 Months**: No (`no`)
- **Loan Purpose**: Personal / Family Event (`personal_event`)
- **Requested Loan Amount**: ₹8,00,000
- **Credit Score Range**: 750 or above (Prime / Excellent) (`800`)

### B. Exact Questions Shown (By Questionnaire Step)
**Step 1: Core Income & Need**
1. *What best describes your income?* → Salaried
2. *How long have you been with your current employer?* → More than 5 years (5+ yrs)
3. *What is your monthly take-home / typical monthly income?* → ₹1,10,000
4. *How stable is this income?* → Stable — predictable and consistent month to month
5. *What are you borrowing for?* → Personal event / Family need (wedding, emergency)
6. *How much are you considering borrowing?* → ₹8,00,000
7. *Would you be willing to pledge an asset as collateral for this loan?* → No

**Step 2: Cash Flow & Existing Debt**
8. *What existing EMIs do you currently pay each month?* → ₹14,000
9. *Approximately how much do you spend each month on essential household expenses?* → ₹48,000
10. *Do you currently have high-cost debt (around 30% APR or higher)?* → No — I have no high-cost debt
11. *Have you had an EMI/payment bounce or missed payment recently?* → No — all payments have been on time

**Step 3: Risk Profile, Household & Fine-Tuning**
12. *What is your credit score, if known?* → 750 or above (Prime / Excellent)
13. *What income documentation can you provide?* → Salary slips + Bank statements + Form 16 / ITR all available
14. *Will another person formally apply with you as a co-applicant?* → No — I am applying alone as a single borrower
15. *How many people financially depend on your income?* → 0
16. *How many months of essential expenses could you cover from savings?* → I don't know / Prefer not to say
17. *Do you expect a large unavoidable expense in the next 6–12 months?* → No — no major lump-sum expenses anticipated

### C. Adaptive Questions Shown & Triggers
- *How long have you been with your current employer?* → Triggered because `income_type === 'salaried'`. Answered: `gt_5yr`.
- *Would you be willing to pledge an asset as collateral for this loan?* → Triggered because `loan_purpose !== 'home_purchase'`. Answered: `none`.
- *(Note: The variable bonus/incentive share question is skipped because income stability was reported as "Stable".)*

### D. Demo Assumptions
- **Fair Rate Ceiling as Principal Sizing Rate**: 12.34% p.a. (`fairRateHigh`) used to conservatively size safe principal capacity.
- **Base Retention Factor**: 50% for stable salaried income.
- **Processing Fee Benchmark**: 1.75% midpoint benchmark for Personal Loan.
- **Standard Product Tenure**: Default tenure of 36 months for Personal Loan.

### E. O1 — Verdict
- **Verdict**: **BORROW_LESS**
- **Reason**: Requested amount (₹8,00,000) exceeds the borrower-safe ceiling (₹7,19,059). Our simplified lender-side estimate is ₹12,44,405, but ₹7,19,059 is the genuine safe limit for her cash flow.

### F. O2 — Lender-Likely Amount
- **Estimated Lender-Likely Amount**: **₹12,44,405**
- **Math**: 50% FOIR on ₹1,10,000 = ₹55,000 maximum total debt service. Minus ₹14,000 existing car EMI = ₹41,000 available monthly EMI. At the 11.44% fair mid-rate for 36 months, ₹41,000 supports ₹12.44L.

### G. O2 — Borrower-Safe Amount
- **Borrower-Safe Ceiling**: **₹7,19,059** (supported by safe EMI ceiling of ₹24,000/month).
- **Recommended Target (90% Headroom)**: **₹6,47,154** (supported by recommended EMI of ₹21,600/month).

### H. Which Amount the Borrower Should Actually Use
- **Guidance**: Use **₹6,47,154** (or up to the **₹7,19,059** safe ceiling).
- **Explanation**: Our simplified lender-side estimate indicates that a lender might consider up to ₹12.44 Lakhs under a standard 50% FOIR ceiling. However, committing to ₹12.44L would absorb 50% of Priya's gross earnings into fixed loan repayments, leaving minimal slack for living costs, rent increases, or emergency buffers. The borrower-safe amount preserves essential household breathing room.

### I. O3 — Fair Rate Band
- **Estimated Fair Rate Range**: **10.5% – 12.3% p.a.** (Midpoint: 11.44% p.a.)
- **Positioning**: Starts at neutral 50 → Credit ≥750 (-15), Clean repayment (-3), Stable income (-5), Good documentation (-3) = Final position 24/100 (Bank personal loan band 10.0%–16.0%).
- **Uncertainty Spread**: 0 unknown factors → half-width ±15 pts (±0.90%).

### J. Effective All-In Borrowing Cost / APR
- **Estimated Effective Cost**: **14.5% p.a.** (Range: 13.9%–15.1% p.a.)
- **Breakdown**: Nominal rate 12.34% + upfront processing fee benchmark of 1.75% (₹11,325) deducted from ₹6.47L principal yields net proceeds of ₹6.36L.

### K. O4 — Monthly EMI Ceiling
- **Safe EMI Ceiling**: **₹24,000/month**
- **Math**: Disposable surplus = ₹1,10,000 − ₹48,000 − ₹14,000 = ₹48,000. Applying 50% retention factor = ₹24,000/month.

### L. Recommended EMI
- **Recommended EMI**: **₹21,600/month** (`safeEMI × 0.90`).

### M. Static Tenure Trade-Off
- At 36 months, the requested ₹8,00,000 loan requires an EMI of ₹26,357 (exceeds the ₹24,000 safe ceiling by ₹2,357).
- Extending tenure to 48 months lowers the EMI to ₹20,862 (below the safe ceiling), but increases total interest paid from ₹1.49L to ₹2.01L (+₹52,000 total interest penalty).

### N. Stress Result
- **Baseline Debt-Service Ratio**: 32.4% (**Comfortable**)
- **−20% Income Shock (to ₹88,000)**: 40.5% (**Tight**)
- **+2pp Rate Shock (to 13.4%)**: 32.7% (**Comfortable**)

### O. Negotiation Card Contents
- **Target Loan Principal**: ₹6,47,154 (Safe ceiling: ₹7,19,059)
- **Fair Interest Rate Target**: 10.5% – 11.4% (Walk away if > 12.3%)
- **Processing Fee Cap**: Max 1.75% (₹11,325)
- **Monthly EMI Limit**: Do not commit to monthly payment > ₹24,000.

---

## 2. Persona 2: Ravi Kumar (Self-Employed Kirana Store Owner)

### Persona Background Facts
- **Age**: 42
- **Location**: Mysuru
- **Occupation**: Self-employed kirana store owner (business operating for 14 years)
- **Income**: Monthly cash income typically ranges between ₹40,000 and ₹80,000 (Monthly income entered: ₹60,000)
- **Tax Filing**: Annual ITR ₹4,20,000/year (normalized to ₹35,000/month documented)
- **Collateral**: Owns shop premises valued at approximately ₹45,00,000, unencumbered
- **Existing Debt**: No formal loan running
- **Credit Score**: Thin file / no formal credit bureau history
- **Household**: Wife earns ₹18,000/month (participating as co-applicant)
- **Borrowing Need**: Considering ₹15,00,000 for stock line expansion and a delivery vehicle

### A. Input Answers
- **Earning Segment**: Self-employed / Business owner (`self_employed`)
- **Monthly Income Entered**: ₹60,000
- **Documented Income**: ₹35,000/month (Annual ITR of ₹4,20,000)
- **Essential Monthly Living Expenses**: Skipped / unknown (Defaulted to 65% benchmark = ₹50,700)
- **Existing Monthly Loan EMIs**: ₹0
- **High-Cost Debt**: None (`none`)
- **Income Predictability**: Stable — predictable and consistent month to month (`stable`)
- **Cheque/ECS Bounce in Past 12 Months**: No (`no`)
- **Loan Purpose**: Business expansion / Working capital / Equipment (`business_expansion`)
- **Requested Loan Amount**: ₹15,00,000
- **Credit Score Range**: Thin file / No credit history (`thin_file`)
- **Collateral**: Commercial property (`property_commercial`), estimated value ₹45,00,000
- **Co-Applicant**: Yes (`yes`), contributing ₹18,000/month documented earnings
- **Variable Income Component**: 10–30% (`10_30`)

### B. Exact Questions Shown (By Questionnaire Step)
**Step 1: Core Income & Need**
1. *What best describes your income?* → Self-employed / Business owner
2. *How long have you been running this business?* → More than 5 years (5+ yrs)
3. *What is your monthly take-home / typical monthly income?* → ₹60,000
4. *How stable is this income?* → Stable — predictable and consistent month to month
5. *How much of your monthly income typically varies month to month?* → 10–30%
6. *What are you borrowing for?* → Business expansion / Working capital / Equipment
7. *How much are you considering borrowing?* → ₹15,00,000
8. *Would you be willing to pledge an asset as collateral for this loan?* → Commercial property
9. *What is the estimated market value of your collateral asset?* → ₹45,00,000

**Step 2: Cash Flow & Existing Debt**
10. *What existing EMIs do you currently pay each month?* → ₹0
11. *Approximately how much do you spend each month on essential household expenses?* → I don't know exact amount
12. *Do you currently have high-cost debt (around 30% APR or higher)?* → No — I have no high-cost debt
13. *Have you had an EMI/payment bounce or missed payment recently?* → No — all payments have been on time

**Step 3: Risk Profile, Household & Fine-Tuning**
14. *What is your credit score, if known?* → I have never borrowed before (Thin file / No credit history)
15. *How do you document your business income?* → Both ITR and bank statements / business records
16. *What is your annual income declared in your latest ITR (if filed)?* → ₹4,20,000/year
17. *How much of this monthly income can you support with records?* → ₹35,000/month
18. *Will another person formally apply with you as a co-applicant?* → Yes — a spouse or family member will formally co-apply
19. *Approximately how much monthly documented income will the co-applicant contribute?* → ₹18,000/month
20. *How many people financially depend on your income?* → 0
21. *How many months of essential expenses could you cover from savings?* → I don't know / Prefer not to say
22. *Do you expect a large unavoidable expense in the next 6–12 months?* → No — no major lump-sum expenses anticipated

### C. Adaptive Questions Shown & Triggers
- *How long have you been running this business?* → Triggered because `income_type === 'self_employed'`. Answered: `8` (representing 14 years).
- *How much of your monthly income typically varies month to month?* → Triggered because `income_type === 'self_employed'`. Answered: `10_30` (10–30%).
- *Would you be willing to pledge an asset as collateral for this loan?* → Triggered because `loan_purpose !== 'home_purchase'`. Answered: `property_commercial`.
- *What is the estimated market value of your collateral asset?* → Triggered by selecting commercial property collateral. Answered: ₹45,00,000.
- *How do you document your business income?* → Triggered for self-employed borrower. Answered: `both`.
- *What is your annual income declared in your latest ITR?* and *How much can you support with records?* → Triggered by selecting documentation type `both`.
- *Will another person formally apply with you as a co-applicant?* → Core household question. Answered: `yes`.
- *Co-applicant income question* → Triggered by confirming a co-applicant. Answered: ₹18,000/month.

### D. Demo Assumptions
- **Monthly Income Entered**: ₹60,000 (entered as a single monthly figure; background persona fact reflects cash earnings fluctuating between ₹40k and ₹80k).
- **Demo assumption: variable income component = 10–30%**: Selected as 10–30% seasonal variation in kirana business takings. Because this is ≤30%, it does not trigger the −5pp safe retention buffer.
- **Demo assumption: co-applicant status**: Ravi's wife is factored as an explicit joint co-applicant with ₹18,000/month documented earnings.
- **Living Expense Default**: Estimated at 65% of combined safe household income (₹78,000) = ₹50,700 (Uncertainty range ±15pp).
- **Illustrative Collateral LTV**: 60% illustrative LTV for commercial real estate (`₹45,00,000 × 60% = ₹27,00,000`). Labeled as borrower estimate; actual lender appraisal and LTV may differ.
- **Base Retention Factor**: 40% for self-employed with records.
- **Standard Product Tenure**: Default tenure of 84 months (7 years) for Loan Against Property (LAP).

### E. O1 — Verdict
- **Verdict**: **BORROW_LESS**
- **Reason**: Requested amount (₹15,00,000) exceeds borrower-safe capacity (₹6,03,868). Our simplified lender-side estimate is ₹21,42,934 backed by his commercial property, but borrowing ₹15L would jeopardize his business cash flow.

### F. O2 — Lender-Likely Amount
- **Estimated Lender-Likely Amount**: **₹21,42,934**
- **Math**:
  - Lender-recognized income: ₹35,000 (ITR) + 75% of ₹25,000 undocumented cash (₹18,750) + ₹18,000 co-applicant = ₹71,750 (capped at ₹63k tier baseline).
  - 60% secured FOIR allows ₹37,800/month total debt service.
  - At 11.98% fair mid-rate for 84 months, ₹37,800 supports **₹21,42,934** (FOIR-supported amount).
  - Collateral-supported amount: ₹45,00,000 reported collateral × 60% illustrative LTV = **₹27,00,000**.
  - Binding constraint: `MIN(₹21,42,934, ₹27,00,000) = ₹21,42,934` (FOIR is binding).

### G. O2 — Borrower-Safe Amount
- **Borrower-Safe Ceiling**: **₹6,03,868** (supported by safe EMI ceiling of ₹10,920/month).
- **Recommended Target (90% Headroom)**: **₹5,43,482** (supported by recommended EMI of ₹9,828/month).

### H. Which Amount the Borrower Should Actually Use
- **Guidance**: Use **₹5,43,482** (or up to the **₹6,03,868** safe ceiling).
- **Explanation**: Our simplified lender-side estimate indicates that a lender could evaluate up to ₹21.4 Lakhs because the loan is backed by a ₹45 Lakh commercial property. In secured lending, lender underwriting relies on asset collateral recovery in a worst-case scenario. However, borrower safety depends on monthly cash flow. Ravi's disposable cash flow comfortably supports only an EMI of ~₹10,000, making ₹5.43L–₹6.04L the appropriate safe principal range.

### I. O3 — Fair Rate Band
- **Estimated Fair Rate Range**: **11.2% – 12.8% p.a.** (Midpoint: 11.98% p.a.)
- **Positioning**: Starts at 50 → Thin file (+3), Clean repayment (-3), Stable income (-5), Partial documentation (0) = Final position 45/100 (Bank LAP band 9.5%–15.0% unlocked by 14-year vintage + commercial property collateral).
- **Spread**: 0 unknown factors → half-width ±15 pts (±0.82%).

### J. Effective All-In Borrowing Cost / APR
- **Estimated Effective Cost**: **14.1% p.a.** (Range: 14.0%–14.3% p.a.)
- **Breakdown**: Nominal rate 12.80% + upfront processing fee benchmark of 1.5% (₹8,152) on ₹5.43L principal.

### K. O4 — Monthly EMI Ceiling
- **Safe EMI Ceiling**: **₹10,920/month**
- **Math**: Safe income ₹78,000 (Ravi ₹60k + wife ₹18k) − ₹50,700 living expenses = ₹27,300 disposable surplus. 40% retention = ₹10,920/month.

### L. Recommended EMI
- **Recommended EMI**: **₹9,828/month** (`safeEMI × 0.90`).

### M. Static Tenure Trade-Off
- Requested ₹15 Lakhs at 84 months requires ₹26,712/month (nearly 2.5× the safe ceiling).
- Even extending to 120 months (10 years) only reduces the monthly EMI to ₹21,506/month — still nearly double safe capacity. The loan principal must be scaled down to maintain affordability.

### N. Stress Result
- **Baseline Debt-Service Ratio**: 12.6% (**Comfortable**)
- **−20% Income Shock (to ₹62,400)**: 15.8% (**Comfortable**)
- **+2pp Rate Shock (to 14.0%)**: 13.0% (**Comfortable**)

### O. Negotiation Card Contents
- **Target Loan Principal**: ₹5,43,482 (Safe ceiling: ₹6,03,868)
- **Fair Interest Rate Target**: 11.2% – 12.0% (Walk away if > 12.8%)
- **Processing Fee Cap**: Max 1.5% (₹8,152)
- **Monthly EMI Limit**: Do not commit to monthly payment > ₹10,920.
- **Negotiation Leverage**: 14 years continuous operation in same location, unencumbered commercial shop valued at ₹45L, formal consecutive ITR track record.

---

## 3. Persona 3: Anita Devi (Informal / Gig Worker with High-Cost Debt)

### Persona Background Facts
- **Age**: 35
- **Location**: Hubballi
- **Occupation**: Informal delivery rider + home tailoring
- **Income**: Monthly cash income typically ranges between ₹26,000 and ₹30,000 (Monthly income entered: ₹26,000)
- **Documentation**: No formal payslips, no ITR, unrecorded cash earnings
- **Household**: Two children (dependents: 2); husband unemployed for 8 months
- **Existing Debt**: Three loan app balances totaling ₹35,000 outstanding at 30%+ APR
- **Repayment Distress**: One payment bounce recorded last month
- **Borrowing Need**: Considering ₹1,50,000 for an electric scooter

### A. Input Answers
- **Earning Segment**: Informal / Gig / Variable (`informal`)
- **Monthly Income Entered**: ₹26,000
- **Documented Income**: ₹0 (No formal payslips, no ITR)
- **Essential Monthly Living Expenses**: Skipped / unknown (Defaulted to 65% benchmark = ₹16,900)
- **Existing Formal Bank EMIs**: ₹0
- **High-Cost Debt**: Yes (`has_debt`), ₹35,000 outstanding balance
- **Income Predictability**: Highly variable / unpredictable earnings (`unstable`)
- **Cheque/ECS Bounce in Past 12 Months**: Yes (`yes`)
- **Loan Purpose**: Vehicle purchase (`vehicle`)
- **Requested Loan Amount**: ₹1,50,000
- **Credit Score Range**: I don't know my score (`unknown`)
- **Collateral**: None (`none`)
- **Co-Applicant**: No (`no`)
- **Variable Income Component**: More than 30% (`gt_30`)

### B. Exact Questions Shown (By Questionnaire Step)
**Step 1: Core Income & Need**
1. *What best describes your income?* → Informal / Gig / Variable
2. *What is your monthly take-home / typical monthly income?* → ₹26,000
3. *How stable is this income?* → Highly variable / unpredictable earnings
4. *How much of your monthly income typically varies month to month?* → More than 30%
5. *What are you borrowing for?* → Vehicle (Scooter / Car / Commercial delivery vehicle)
6. *How much are you considering borrowing?* → ₹1,50,000
7. *Would you be willing to pledge an asset as collateral for this loan?* → No

**Step 2: Cash Flow & Existing Debt**
8. *What existing EMIs do you currently pay each month?* → ₹0
9. *Approximately how much do you spend each month on essential household expenses?* → I don't know exact amount
10. *Do you currently have high-cost debt (around 30% APR or higher)?* → Yes — I have running high-cost loans or card debt
11. *What is your approximate total outstanding balance on this high-cost debt?* → ₹35,000
12. *Approximately how much do you pay toward this high-cost debt each month?* → I don't know exact amount
13. *Have you had an EMI/payment bounce or missed payment recently?* → Yes — missed or bounced a payment recently

**Step 3: Risk Profile, Household & Fine-Tuning**
14. *What is your credit score, if known?* → I don't know my score
15. *Do you have records that show your earnings?* → No formal records — cash wages / unrecorded income
16. *Will another person formally apply with you as a co-applicant?* → No — I am applying alone as a single borrower
17. *How many people financially depend on your income?* → 2
18. *How many months of essential expenses could you cover from savings?* → Less than 1 month (<1 mo) — No emergency buffer
19. *Do you expect a large unavoidable expense in the next 6–12 months?* → No — no major lump-sum expenses anticipated

### C. Adaptive Questions Shown & Triggers
- *How much of your monthly income typically varies month to month?* → Triggered because `income_type === 'informal'`. Answered: `gt_30` (More than 30%).
- *Would you be willing to pledge an asset as collateral for this loan?* → Triggered because `loan_purpose !== 'home_purchase'`. Answered: `none`.
- *High-cost debt amount and monthly payment follow-ups* → Triggered because `high_cost_debt === 'has_debt'`. Answered: balance ₹35,000; monthly payment unknown.
- *Do you have records that show your earnings?* → Triggered for informal worker. Answered: `none`.

### D. Demo Assumptions
- **Monthly Income Entered**: ₹26,000 (entered as a single monthly figure; background persona fact reflects informal earnings between ₹26k and ₹30k).
- **Demo assumption: variable income component = >30%**: Selected as >30% to represent high volatility in gig delivery and tailoring earnings. Triggers the −5pp safe retention buffer.
- **High-Cost Debt Monthly Repayment**: Assumed at 25% fallback rule of ₹35,000 balance = ₹8,750/month (Range: 15%–30%).
- **Living Expense Default**: Estimated at 65% benchmark of ₹26,000 = ₹16,900 (Uncertainty range ±15pp).
- **Clamped Retention Factor**: 25% base − 5% high variable income − 10% recent bounce = 10% (clamped at the 10% floor).
- **Unknown Credit Score**: Scored as 0 adjustment (not penalized to subprime); widens uncertainty half-width to ±20 pts.
- **Standard Product Tenure**: Default tenure of 36 months for Two-Wheeler Loan.

### E. O1 — Verdict
- **Verdict**: **DONT_BORROW**
- **Hard Stops Triggered**:
  1. *SEVERE: High-cost debt monthly burden is 33.7% of your income (threshold: 30%). This alone makes new borrowing inadvisable.*
  2. *COMPOUND: High-cost debt burden ≥15% of income AND a payment bounced recently. Two independent distress signals together.*
- **Action Suggestion**: Prioritize clearing or consolidating the ₹35,000 high-cost debt before taking on any new borrowing.

### F. O2 — Lender-Likely Amount
- **Estimated Lender-Likely Amount**: **₹0**
- **Math**: Lender recognizes ₹6,500/month (conservative 25% weak recognition on undocumented gig earnings). 35% informal FOIR permits ₹2,275/month maximum total debt service. Existing high-cost debt payment of ₹8,750 consumes the entire debt service allocation, leaving ₹0 in new lending headroom.

### G. O2 — Borrower-Safe Amount
- **Borrower-Safe Ceiling**: **₹916**
- **Recommended Target (90% Headroom)**: **₹825**
- *(Note: Displayed for mathematical transparency only; framed as mathematical capacity, NOT an invitation to borrow).*

### H. Which Amount the Borrower Should Actually Use
- **Guidance**: **₹0 (DO NOT BORROW)**.
- **Explanation**: Anita is facing critical debt distress. After essential household groceries and utilities (₹16,900) and servicing high-cost debt (₹8,750), her remaining uncommitted monthly cash flow is only ₹350. Adding any new monthly loan obligation would lead to immediate payment default and severe household deprivation.

### I. O3 — Fair Rate Band
- **Estimated Fair Rate Range**: **19.0% – 22.0% p.a.** (Midpoint: 20.56% p.a.)
- **Positioning**: Starts at 50 → Credit unknown (0), Recent bounce (+10), Unstable income (+7), No documentation (+8), High-cost debt (+7) = Final position 82/100 (NBFC Two-Wheeler band 14.0%–22.0%).
- **Spread Widening**: 1 unknown factor (credit score) widens uncertainty half-width to ±20 pts (±1.60%) without shifting the midpoint upward.

### J. Effective All-In Borrowing Cost / APR
- **Estimated Effective Cost**: **25.7% p.a.** (Nominal rate 22.0% + 1.5% processing fee benchmark).

### K. O4 — Monthly EMI Ceiling
- **Safe EMI Ceiling**: **₹35/month**
- **Math**: Disposable cash flow = ₹26,000 − ₹16,900 − ₹8,750 = ₹350. Clamped 10% retention factor = ₹35/month.

### L. Recommended EMI
- **Recommended EMI**: **₹31.50/month** (`safeEMI × 0.90`).

### M. Static Tenure Trade-Off
- A requested ₹1,50,000 two-wheeler loan requires an EMI of ~₹5,730/month for 36 months (or ~₹4,980 for 48 months).
- With only ₹350/month in uncommitted cash, tenure adjustments cannot bridge a ₹5,000 monthly deficit.

### N. Stress Result
- **Baseline Debt-Service Ratio**: 33.8% on existing debt alone (**Comfortable** mathematically, but vulnerable due to near-zero liquidity).
- **−20% Income Shock (to ₹20,800)**: 42.2% (**Tight**).

### O. Negotiation Card Contents
- **Clear Warning Header**: "Recommendation: Resolve High-Cost Debt First Before Borrowing"
- **Banner**: "⚠ These are mathematical capacity estimates, not an invitation to borrow."
- **Key Risk Drivers**:
  - High-cost debt payment (₹8,750/mo) consumes 33.7% of total monthly income.
  - Recent payment bounce recorded in the last 12 months.
  - Less than 1 month of emergency savings.
- **Financial Prescription**: Prioritize paying off the ₹35,000 high-cost debt immediately to unlock ₹8,750 in monthly cash flow before taking on a vehicle loan.
