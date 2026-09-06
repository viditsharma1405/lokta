# RULES.md — Lokta Borrower Copilot

> Every rule, threshold, parameter, and assumption in this specification is documented in a standardized table format:
> `| What | Value | Why | Source or my judgement |`
> Changes here must be strictly reflected in `src/rules/constants.ts` and vice versa.

---

### Rule Provenance Taxonomy

All rules, thresholds, and numbers in this specification fall into five distinct categories:
1. **FACT / External source**: Observable regulatory mandates or published benchmark rate cards (e.g. RBI Master Directions, bank benchmark cards).
2. **Assignment-derived**: Direct requirements or test thresholds specified in the assignment challenge brief (e.g. income shock −20%, rate shock +2pp).
3. **Mathematical identity**: Standard financial engineering and arithmetic formulas (e.g. standard EMI annuity factor, bisection IRR root-finding).
4. **MY JUDGEMENT / Simplification**: Design and risk-positioning heuristics chosen for a borrower-side copilot (e.g. 50%/40%/35% base retention, documentation recognition tiers, illustrative LTVs). **Not** regulatory mandates.
5. **USER INPUT**: Information reported directly by the borrower (e.g. claimed income, loan purpose, declared obligations, self-reported asset value).

---

## 1. Income Normalization

### Claimed Total Income

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Salaried Claimed Income** | Stated monthly take-home salary | Fixed contractual compensation verifiable via salary credits | USER INPUT |
| **Self-employed (Tenure ≥ 3yr)** | Midpoint of reported income range | Established business history suggests sustainable average earnings | MY JUDGEMENT |
| **Self-employed (Tenure < 3yr)** | Lower bound of reported income range | Unseasoned enterprise cash flow carries higher volatility | MY JUDGEMENT |
| **Informal / Gig Claimed Income** | Lower bound of reported income range | Irregular earnings; conservative floor protects against down months | MY JUDGEMENT |

**Impact**: Claimed total income establishes the baseline cash flow for borrower-safe capacity.

---

### Lender-Recognized Income (Documentation-Based, Uncertainty-Aware Model)

> **Important Disclosure**: These recognition rates are product judgements for a borrower-side self-assessment. They are **not** RBI-mandated lender income haircuts. RBI does not mandate an undocumented income haircut or cap.

```
lenderRecognizedIncome = documentedIncome + (undocumentedPortion × recognitionRate) + coApplicantIncome
```
where `undocumentedPortion = max(0, claimedTotalIncome − documentedIncome)`.

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Full Documentation Recognition** | 100% recognition (`rate = 1.0`) | Formal tax returns (ITR) or salary slips verify entire reported earnings | MY JUDGEMENT (Lending standard) |
| **Tier 1: Strong Corroboration** | 75% recognition on surplus (`range: 60%–80%`) | Partial records + stable income or business tenure ≥ 3 years corroborates cash flow | MY JUDGEMENT |
| **Tier 2: Moderate Corroboration** | 50% recognition on surplus (`range: 40%–60%`) | Established business or steady income with partial records or secured backing | MY JUDGEMENT |
| **Tier 3: Weak Corroboration** | 25% recognition on surplus (`range: 15%–35%`) | Irregular gig/informal work with no formal records; acknowledges seasonal variance | MY JUDGEMENT |
| **Tier 4: Uncertain / Unknown** | 15% recognition on surplus (`range: 0%–25%`) | "Confidence widens with silence." Unknown status widens spread instead of manufacturing precision | MY JUDGEMENT |

**Impact**: Determines FOIR debt-service capacity. Does not impose arbitrary ₹25,000 caps or blanket 10% multipliers.

---

### Borrower-Safe Eligible Income

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Borrower-Safe Income** | `claimedTotalIncome + coApplicantIncome` | The borrower knows their true cash flow; safe retention handles volatility separately | MY JUDGEMENT |

---

## 2. Essential Living Expenses

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Reported Living Expenses** | User-entered monthly figure | Direct borrower declaration of monthly household necessities | USER INPUT |
| **Salaried Default (Unsure)** | 55% of monthly income (`range: ±15pp`) | Typical living cost ratio observed for urban salaried households | MY JUDGEMENT (Assumption) |
| **Self-Employed / Gig Default** | 65% of monthly income (`range: ±15pp`) | Higher baseline operating and living volatility for non-salaried households | MY JUDGEMENT (Assumption) |

**Impact**: Subtracted from income to establish disposable cash flow. Higher expenses reduce safe EMI capacity rupee-for-rupee.

---

## 3. Existing Debt Obligations (EMIs)

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Reported Existing EMIs** | User-entered monthly payment (incl. ₹0) | Current monthly debt commitments directly servicing ongoing loans | USER INPUT |
| **Default When Unknown** | 10% of monthly income | Prevents assuming zero debt when the borrower indicates active but unquantified debt | MY JUDGEMENT (Assumption) |

**Impact**: Directly reduces available debt-service capacity for both lender-likely and borrower-safe calculations.

---

## 4. High-Cost Debt (HCD)

### Definition & Estimation

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **High-Cost Debt APR Threshold** | APR ≥ 30% | Credit cards, moneylender loans, and app-based debt carry predatory compounding | MY JUDGEMENT |
| **Reported Monthly HCD Payment** | User-entered monthly figure | Actual monthly repayment servicing high-cost debt | USER INPUT |
| **Estimated HCD Payment (Unknown)** | 25% of outstanding balance (`range: 15%–30%`) | Typical revolving minimum-due and short-tenure app repayment rates | MY JUDGEMENT (Assumption) |

### Hard Stops (Verdict = DONT_BORROW)

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Severe Debt Burden Hard Stop** | HCD monthly payment ≥ 30% of safe income | High-cost debt is actively cannibalizing essential cash flow | MY JUDGEMENT |
| **Compound Risk Hard Stop** | HCD payment ≥ 15% of income AND recent bounce | Active payment distress compounded by predatory interest debt | MY JUDGEMENT |
| **Payment Failure Hard Stop** | Recent bounce AND baseline stress = Unsustainable | Borrower is already in default or near-default distress | MY JUDGEMENT |

**Impact**: Hard stops immediately override mathematical borrowing capacity and enforce a `DONT_BORROW` recommendation.

---

## 5. FOIR (Fixed Obligation to Income Ratio)

> **Important Disclosure**: FOIR thresholds are borrower-side planning assumptions representing standard Indian lender debt-service limits, not statutory mandates.

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Salaried FOIR** | 50% of lender income | Established market underwriting standard for formal payroll earners | MY JUDGEMENT (Market norm) |
| **Self-Employed (ITR) FOIR** | 45% of lender income | Acknowledges business cash flow fluctuations despite formal tax filings | MY JUDGEMENT (Market norm) |
| **Self-Employed (Undocumented) FOIR**| 35% of lender income | Conservative debt ceiling for informal business earnings | MY JUDGEMENT (Market norm) |
| **Informal / Gig FOIR** | 35% of lender income | Conservative debt ceiling for irregular or gig earnings | MY JUDGEMENT (Market norm) |
| **Secured Product Override** | 60% of lender income | Higher debt tolerance permitted when loan is collateralized by property or gold | MY JUDGEMENT (Market norm) |

```
maxTotalDebtService = eligibleIncomeLender × FOIR
availableNewEMI = max(0, maxTotalDebtService − existingEMI − businessDebtEMI − highCostDebtEMI)
foirSupportedAmount = principalFromEMI(availableNewEMI, fairRateMid, tenure)
```

**Impact**: Directly determines the maximum repayment-capacity-supported principal amount.

---

## 6. Collateral & Illustrative LTV (Loan-to-Value)

### Conceptual Rules & Valuation Cleanup

1. **No Arbitrary Valuation Haircut**: A flat 20% haircut is **not** an industry-wide standard and has been **removed**.
2. **Borrower-Reported Value**: Collateral capacity is evaluated as:
   ```
   ltvSupportedAmount = borrowerReportedCollateralValue × illustrativeLTV
   ```
3. **Estimate Disclaimer**: This is explicitly labeled as a borrower-side estimate. Actual lender valuation, technical appraisal, and sanctioned LTV will differ.
4. **Estimated Lender Ceiling**: For secured borrowing, the estimated lender ceiling is:
   ```
   securedLenderAmount = min(foirSupportedAmount, ltvSupportedAmount)
   ```
   This is a simplified borrower-side heuristic, not a universal underwriting formula.

### Illustrative LTV Ratios

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Gold Loan (≤ ₹2L)** | 85% LTV | RBI Master Direction tiered regulatory ceiling | External fact (RBI 2026 tiered) |
| **Gold Loan (₹2L–₹10L)** | 80% LTV | RBI Master Direction tiered regulatory ceiling | External fact (RBI 2026 tiered) |
| **Gold Loan (> ₹10L)** | 75% LTV | RBI Master Direction tiered regulatory ceiling | External fact (RBI 2026 tiered) |
| **Residential Property (LAP)** | 70% LTV | Standard conservative mortgage LTV benchmark for housing collateral | MY JUDGEMENT (Market norm) |
| **Commercial Property (LAP)** | 60% LTV | Conservative end of standard 60%–65% commercial real estate underwriting | MY JUDGEMENT (Market norm) |
| **No Collateral** | N/A (Unsecured) | Unsecured borrowing relies entirely on repayment cash flow | USER INPUT |
| **Not Sure** | N/A (No LTV capacity) | Does not fabricate collateral capacity; falls back to FOIR capacity | MY JUDGEMENT |

### Separation Between Purpose and Collateral

- **Loan Purpose dictates the primary borrowing route**:
  - `home_purchase` → Home Loan (Secured by home)
  - `vehicle` → Two-Wheeler Loan (Secured by vehicle hypothecation)
  - `business_expansion` + property → LAP (Commercial or Residential Property)
  - `business_expansion` + gold → Gold Loan (for business)
  - `business_expansion` + no collateral / not sure → Business Loan (Unsecured)
  - Non-business purposes (`personal_event`, `medical`, `education`, etc.) → Personal Loan (Unsecured)
- **Collateral surfaces an optional secured alternative**:
  - Owning an asset does not mean the borrower must pledge it.
  - For personal and two-wheeler purposes, the primary route remains unsecured/vehicle loan; Gold Loan or LAP is surfaced as an optional alternative highlighting interest rate savings vs. foreclosure risks.

---

## 7. Borrower-Safe Capacity (Cash Flow Retention)

### Base Retention Factors

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Salaried, Stable Base Retention** | 50% of disposable surplus | High income predictability allows reserving half of surplus for debt service | MY JUDGEMENT |
| **Salaried, Variable Base Retention** | 40% of disposable surplus | Fluctuating incentive or bonus pay warrants higher cash cushion | MY JUDGEMENT |
| **Self-Employed (ITR Steady)** | 40% of disposable surplus | Business operating overhead requires retaining 60% of surplus | MY JUDGEMENT |
| **Self-Employed (Seasonal / Undoc)** | 30% of disposable surplus | Volatile revenue cycles require retaining 70% of surplus | MY JUDGEMENT |
| **Informal / Gig Base Retention** | 25% of disposable surplus | Severe vulnerability to work disruption requires retaining 75% of surplus | MY JUDGEMENT |

### Additive Retention Adjustments

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Variable Income Adjustment** | >30% variable component → −5 pp safe-retention adjustment | Higher month-to-month income variability warrants a larger affordability buffer | MY JUDGEMENT / borrower-side modelling assumption |
| **Emergency Savings < 1 Month** | −5 pp | Absence of liquid buffer makes borrower vulnerable to emergency shock | MY JUDGEMENT |
| **Emergency Savings > 6 Months** | +5 pp | Substantial liquid buffer allows slightly higher debt-service tolerance | MY JUDGEMENT |
| **> 2 Dependents (No Other Earner)**| −5 pp | High dependent load increases nondiscretionary cash expenditure risk | MY JUDGEMENT |
| **Recent EMI Bounce** | −10 pp | Recent payment strain indicates fragile cash flow | MY JUDGEMENT |
| **High-Cost Debt Present (Sub-critical)**| −10 pp | Ongoing high interest payments drain liquidity | MY JUDGEMENT |
| **Upcoming Large Expense** | −5 pp | Planned capital outflow temporarily compresses debt-service buffer | MY JUDGEMENT |
| **Retention Clamp Limits** | 10% (Floor) to 55% (Cap) | Ensures retention neither drops to zero nor exceeds prudent safety bounds | MY JUDGEMENT |

**Variable Income Question Mapping**:
- `0–10%`: No adjustment (treated as stable month-to-month cash flow)
- `10–30%`: No adjustment (normal business / seasonal variation)
- `>30%` (More than 30%): −5 pp safe-retention adjustment (triggers volatility buffer)
- `Not sure`: Unknown (preserved without arbitrary penalty; widens confidence uncertainty)

### Presentation Headroom

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Recommended Headroom Multiplier** | 90% (`recommended = safe × 0.90`) | Leaves a final 10% safety margin for the borrower's target loan amount | MY JUDGEMENT |

```
disposableCashFlow = max(0, eligibleIncomeSafe − essentialExpenses − existingEMI − businessDebtEMI − highCostDebtEMI)
adjustedRetention = clamp(baseRetention + Σadjustments, 10%, 55%)
safeEMI = disposableCashFlow × adjustedRetention
recommendedEMI = safeEMI × 0.90
safeAmount = principalFromEMI(safeEMI, fairRateCeiling, defaultTenure)
recommendedAmount = principalFromEMI(recommendedEMI, fairRateCeiling, defaultTenure)
```

**Impact**: Ensures borrower-safe ceiling is strictly separate from recommended amount, protecting the borrower against default.

---

## 8. Estimated Fair Rate Range (Deterministic Position Model)

### Product Benchmark Rate Bands

> **Important Disclosure**: Market bands reflect observed Indian retail lending rates as of **Q1 2026**. They are market benchmarks used for educational self-assessment and borrower negotiation, **not** guaranteed lender quotes.

| What | Bank Tier Band | NBFC Tier Band | Why | Source or my judgement |
|---|---|---|---|---|
| **Personal Loan** | 10.0%–16.0% | 16.0%–30.0% | Retail unsecured personal borrowing benchmarks | Market observation (Q1 2026: SBI, HDFC, Bajaj Finance) |
| **Home Loan** | 8.5%–10.5% | 10.5%–14.0% | Long-term mortgage rates linked to repo benchmarks | Market observation (Q1 2026: SBI, HDFC, LIC HFL) |
| **Loan Against Property (LAP)** | 9.5%–15.0% | 15.0%–20.0% | Secured mortgage on residential or commercial property | Market observation (Q1 2026: SBI, ICICI, Bajaj Finserv) |
| **Gold Loan** | 7.0%–12.0% | 12.0%–26.0% | Loans backed by physical gold ornaments | Market observation (Q1 2026: SBI, BOB, Muthoot, Manappuram) |
| **Two-Wheeler Loan** | 9.0%–14.0% | 14.0%–22.0% | Retail two-wheeler vehicle hypothecation financing | Market observation (Q1 2026: HDFC Bank, TVS Credit, Hero FinCorp) |
| **Business Loan** | 11.0%–17.0% | 17.0%–28.0% | Unsecured MSME working capital & expansion credit | Market observation (Q1 2026: HDFC, Axis, Lendingkart) |

### Starting Position & Additive Adjustments (0–100 Scale)

Model begins at neutral midpoint: `position = 50`. Each adjustment is applied at most once.

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Credit Score ≥ 750** | −15 pts | Prime bureau history qualifies for lowest-tier market pricing | MY JUDGEMENT |
| **Credit Score 700–749** | −7 pts | Good repayment track record qualifies for moderate rate discount | MY JUDGEMENT |
| **Credit Score 650–699** | 0 pts | Average credit standing; baseline neutral positioning | MY JUDGEMENT |
| **Credit Score 550–649** | +10 pts | Elevated bureau risk warrants moderate risk premium | MY JUDGEMENT |
| **Credit Score < 550** | +20 pts | Subprime credit profile carries substantial lender risk premium | MY JUDGEMENT |
| **Credit Score: Thin File** | +3 pts | Lack of formal history is minor uncertainty, not bad credit | MY JUDGEMENT |
| **Credit Score: Unknown** | 0 pts | Missing score does NOT increase midpoint; widens band instead | MY JUDGEMENT |
| **Repayment: Clean** | −3 pts | Verified history of on-time payments without bounces | MY JUDGEMENT |
| **Repayment: Recent Bounce** | +10 pts | Direct distress signal of past cash-flow failure | MY JUDGEMENT |
| **Repayment: Unknown** | 0 pts | Missing repayment history does NOT penalize midpoint | MY JUDGEMENT |
| **Stability: Stable** | −5 pts | High income predictability reduces cash flow volatility | MY JUDGEMENT |
| **Stability: Moderate** | −2 pts | Minor earnings seasonality or variability | MY JUDGEMENT |
| **Stability: Unstable** | +7 pts | Volatile cash flows increase lender default risk | MY JUDGEMENT |
| **Stability: Unknown** | 0 pts | Missing stability does NOT penalize midpoint | MY JUDGEMENT |
| **Documentation: Full** | −3 pts | Full formal ITR or salary slips confirm verified income | MY JUDGEMENT |
| **Documentation: Partial** | 0 pts | Partial records available; neutral positioning | MY JUDGEMENT |
| **Documentation: None** | +8 pts | Fully undocumented cash earnings increase underwriting risk | MY JUDGEMENT |
| **Documentation: Unknown** | 0 pts | Missing documentation status does NOT penalize midpoint | MY JUDGEMENT |
| **High-Cost Debt Present** | +7 pts | Active debt with APR ≥ 30% signals reliance on high-cost credit | MY JUDGEMENT |

### Unknown Handling & Uncertainty Half-Width

**Core Principle: Unknown ≠ Bad.**
Missing information widens uncertainty rather than pushing the midpoint upward:
```
unknownCount = count of unknown inputs among (credit, repayment, stability, documentation)
halfWidth = min(25, 15 + (5 × unknownCount))
```

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **0 Unknown Factors** | `halfWidth = ±15 pts` | High confidence; tight baseline uncertainty band | MY JUDGEMENT |
| **1 Unknown Factor** | `halfWidth = ±20 pts` | Moderate confidence; moderately widened range | MY JUDGEMENT |
| **2 Unknown Factors** | `halfWidth = ±25 pts` | Lower confidence; widened range | MY JUDGEMENT |
| **3+ Unknown Factors** | `halfWidth = ±25 pts` (Capped) | Range widened to maximum cap; confidence remains LOW | MY JUDGEMENT |

```
position = clamp(50 + Σadjustments, 0, 100)
span = upperRate − lowerRate
rate = lowerRate + (position / 100) × span
fairRateMid = rate
halfWidthRate = (halfWidth / 100) × span
fairRateLow = max(lowerRate, fairRateMid − halfWidthRate)
fairRateHigh = min(upperRate, fairRateMid + halfWidthRate)
```

The displayed rate range is strictly clamped within `[lowerRate, upperRate]`.

---

## 9. Effective Borrowing Cost (APR)

```
processingFeeAmount = principal × midpoint(processingFeeRange)
netProceeds = principal − processingFeeAmount
Solve for monthly rate r': netProceeds = EMI × [1 − (1 + r')^(−n)] / r'   (bisection)
effectiveAnnualizedCost = (1 + r')^12 − 1
```

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Included in Calculation** | Nominal interest rate, upfront processing fees | Determines true annualized borrowing cost based on net received funds | Mathematical identity |
| **Excluded from Calculation**| GST on fees (18%), insurance, foreclosure charges | Variable by institution and optional; explicitly disclosed to borrower | MY JUDGEMENT (Disclosure) |
| **Processing Fee Ranges** | Personal 1.0%–2.5%, Home 0.25%–0.5%, LAP 1.0%–2.0%, Gold 0.5%–1.5%, Two-Wheeler 1.0%–2.0%, Business 1.5%–3.0% | Market aggregator benchmarks | Market observation / MY JUDGEMENT |

---

## 10. Stress Testing

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Income Shock Scenario** | Income drops by 20% (`income × 0.80`) | Simulates sudden earnings disruption, medical event, or down revenue | Assignment-derived |
| **Rate Shock Scenario** | Interest rate increases by +2.0 percentage points | Simulates benchmark floating rate increases or reset penalties | Assignment-derived |
| **Comfortable Classification**| Stressed debt-service ratio ≤ 35% | Total debt payments remain well within safe cash flow limits | MY JUDGEMENT |
| **Tight Classification** | Stressed debt-service ratio 36%–45% | Debt payments manageable but leaves limited emergency surplus | MY JUDGEMENT |
| **Stressed Classification** | Stressed debt-service ratio 46%–55% | Debt payments severely compress essential living expenses | MY JUDGEMENT |
| **Unsustainable Classification**| Stressed debt-service ratio > 55% | High default probability; obligations consume most cash flow | MY JUDGEMENT |

---

## 11. Decision Logic

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Hard Stops Triggered** | Verdict = `DONT_BORROW` | High-cost debt burden or active default risk makes borrowing dangerous | MY JUDGEMENT |
| **Requested ≤ Safe Capacity** | Verdict = `BORROW` | Requested loan is within comfortable borrower-safe limits | MY JUDGEMENT |
| **Requested > Safe Capacity** | Verdict = `BORROW_LESS` | Requested loan exceeds safe capacity; advises reducing to safe ceiling | MY JUDGEMENT |
| **Soft Signal Escalation** | ≥ 2 soft signals escalates verdict one notch | Multiple compounding vulnerabilities warrant conservative positioning | MY JUDGEMENT |

**Display Guarantee**: All mathematical outputs (lender-likely amount, safe amount, fair rate, effective cost, EMI ceiling, stress results) remain fully visible even when verdict is `DONT_BORROW`.

---

## 12. Productive Return Isolation

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Productive Return Treatment** | Excluded from 100% of calculation functions | A borrower's future return expectation is an unverified prediction, not cash flow | MY JUDGEMENT (Issue 4 Frozen Rule) |

---

## 13. Default Tenures

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Personal Loan Default** | 36 months | Balanced market tenure avoiding excessive cumulative interest | MY JUDGEMENT (Market norm) |
| **Home Loan Default** | 180 months | Standard 15-year prime residential mortgage tenure | MY JUDGEMENT (Market norm) |
| **LAP Default** | 84 months | Standard 7-year loan against property repayment term | MY JUDGEMENT (Market norm) |
| **Gold Loan Default** | 12 months | Standard 1-year bullet/monthly gold loan tenure | MY JUDGEMENT (Market norm) |
| **Two-Wheeler Loan Default** | 36 months | Standard 3-year vehicle financing tenure | MY JUDGEMENT (Market norm) |
| **Business Loan Default** | 36 months | Standard 3-year term loan for MSME working capital | MY JUDGEMENT (Market norm) |

---

## 14. Total Outflow & Opportunity Cost

| What | Value | Why | Source or my judgement |
|---|---|---|---|
| **Total Repayment** | `EMI × tenureMonths` | Cumulative monthly payments over the loan lifetime | Mathematical identity |
| **Total Interest** | `totalRepayment − Principal` | Total interest paid above borrowed principal | Mathematical identity |
| **Cash Outflow Multiple** | `totalOutflow / Principal` | Highlights cumulative cash drain (e.g. ₹1.25 paid per ₹1 borrowed) | Mathematical identity |
| **SIP Equity Return Benchmark**| 12.0% p.a. | 15-year long-term historical average of Nifty 50 Index | FACT (NSE India Historical) |
| **SIP Debt Return Benchmark** | 7.0% p.a. | Standard bank fixed deposit return | FACT (Bank benchmarks) |
