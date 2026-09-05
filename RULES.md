# RULES.md — Lokta Borrower Copilot

> Every rule in this file has a **Value**, **Why**, **Source / My judgement**, and an **Impact declaration**.
> Changes here must be reflected in `src/rules/constants.ts`, and vice versa.

### Rule Provenance Taxonomy
All rules, thresholds, and numbers in this specification fall into five distinct categories:
1. **External fact**: Observable regulatory mandates or published market observations (e.g. RBI Master Directions, bank benchmark rate cards).
2. **Assignment-derived**: Direct requirements or test thresholds specified in the assignment prompt (e.g. income shock −20%, rate shock +2pp).
3. **Mathematical identity**: Standard financial engineering and arithmetic formulas (e.g. standard EMI annuity factor, bisection IRR root-finding).
4. **Product judgement**: Design and risk-positioning heuristics chosen for a borrower-side copilot (e.g. 50%/40%/35% base retention, undocumented tiered haircuts). **Not** regulatory mandates.
5. **User input**: Information provided directly by the borrower (e.g. claimed income, purpose, declared obligations).

---

## 1. Income Normalization

### Claimed Total Income

| Segment | Rule | Source |
|---------|------|--------|
| Salaried | Use stated monthly salary | FACT (user input) |
| Self-employed, tenure ≥ 3yr | Midpoint of income range | My judgement |
| Self-employed, tenure < 3yr | Lower bound of income range | My judgement |
| Gig / informal | Lower bound of income range | My judgement |

**Impact**: Claimed total income feeds into safe capacity. A higher estimate inflates the safe amount.

### Lender-Recognized Income (Documentation-Based, Uncertainty-Aware Model)

> **Important**: These recognition factors are product judgements for a borrower-side self-assessment. They are not RBI-mandated lender income haircuts. RBI does not mandate an undocumented income haircut or cap.

Instead of an arbitrary income cap (such as ₹25,000/month) or a blanket 10% multiplier on claimed earnings, the engine evaluates lender-side capacity based on documented evidence, income stability, business/employment tenure, and documentation status:

```
lenderRecognizedIncome = documentedIncome + (undocumentedPortion × recognitionFactor) + coApplicantIncome
```
where `undocumentedPortion = max(0, claimedTotalIncome - documentedIncome)`.

#### Recognition Tiers for the Undocumented Portion:

1. **Fully Documented (`undocumentedPortion = 0`)**:
   - **What**: 100% recognition of documented income (`0%` haircut).
   - **Value**: Full recognition (`rate = 1.0`).
   - **Why**: The borrower has provided formal documents (ITR, salary slips, audited records) matching or exceeding claimed cash flow.
   - **Source**: Product judgement / lending standard.
   - **Impact**: Maximum lender capacity; HIGH confidence.

2. **Tier 1 — Strong Corroboration / Highly Stable**:
   - **What**: 75% recognition on the undocumented surplus (`range: 60%–80%`).
   - **Value**: `rate = 0.75`.
   - **Why**: Secondary evidence (bank statements, GST/invoices, or established business tenure ≥3 years with steady earnings) corroborates that unrecorded cash flows are real, persistent, and recurrent.
   - **Source**: Product judgement.
   - **Impact**: High recognition on surplus cash flow; MEDIUM/HIGH confidence.

3. **Tier 2 — Moderate Corroboration / Established Stable Income**:
   - **What**: 50% recognition on the undocumented surplus (`range: 40%–60%`).
   - **Value**: `rate = 0.50`.
   - **Why**: For established businesses (≥3 years) or steady earners with partial records, lenders conservatively recognize about half of unrecorded cash flow. Backed loans (secured LAP or gold) also fall here.
   - **Source**: Product judgement.
   - **Impact**: Balanced recognition for informal established businesses (e.g. ₹90k claimed, ₹60k documented → ₹75k lender income; or ₹3L claimed, ₹0 documented → ₹1.5L estimate); MEDIUM confidence.

4. **Tier 3 — Weak Corroboration / Volatile Income**:
   - **What**: 25% recognition on the undocumented portion (`range: 15%–35%`).
   - **Value**: `rate = 0.25`.
   - **Why**: For irregular gig or informal workers with variable earnings and no records (e.g. Anita), lenders heavily discount claimed cash flow acknowledging down months may impair repayment.
   - **Source**: Product judgement.
   - **Impact**: Conservative estimate (e.g. Anita's ₹26k claimed → ₹6,500; ₹3L claimed → ₹75,000); LOW confidence.

5. **Tier 4 — Completely Unsupported & Highly Uncertain / Unknown Documentation**:
   - **What**: 15% baseline recognition with wide uncertainty band (`range: 0%–25%`).
   - **Value**: `rate = 0.15` (range: 0% to 25%).
   - **Why**: "Confidence widens with silence." When the borrower doesn't know their documentation or evidence is entirely missing, the model widens uncertainty rather than manufacturing false precision.
   - **Source**: Product judgement.
   - **Impact**: Widest lender capacity band; strictly LOW confidence; prompt clearly explains that documentation is missing.

| Documentation Status | Corroborating Evidence / Stability | Tier | Recognition Rate | Range | Confidence | Source |
|----------------------|------------------------------------|------|------------------|-------|------------|--------|
| Fully Documented | Formal ITR / Salary Slips | Full | 100% on total | None | HIGH | Product judgement |
| Partially Documented | Partial records + stable / tenure ≥3yr | Strong | 75% on surplus | 60%–80% | HIGH | Product judgement |
| Partially Documented | Established business / steady income | Moderate | 50% on surplus | 40%–60% | MEDIUM | Product judgement |
| Undocumented (e.g. ₹3L, ₹9L) | Established business / steady | Moderate | 50% on claimed | 40%–60% | MEDIUM/LOW | Product judgement |
| Undocumented (e.g. Anita, gig) | Volatile / irregular / no records | Weak | 25% on claimed | 15%–35% | LOW | Product judgement |
| Unknown ("I don't know") | Unknown / uncorroborated | Uncertain | 15% on claimed | 0%–25% | LOW | Product judgement |

**Impact**: Lender-recognized income determines FOIR-based capacity (`maxTotalDebtService = lenderRecognizedIncome × FOIR`). Neither a blanket 10% nor an arbitrary ₹25,000 ceiling is applied.

### Eligible Income — Safe (Borrower)

```
eligibleIncomeSafe = claimedTotalIncome + coApplicantIncome
```

No haircut applied. The borrower knows their own cash flow.

**Source**: My judgement.
**Impact**: Safe income determines disposable cash flow → safe EMI → safe amount.

---

## 2. Essential Expenses

| Scenario | Rule | Source |
|----------|------|--------|
| User provides a number | Use as-is | USER_ANSWER |
| Unknown (salaried) | 55% of income; show range ±15pp | My judgement |
| Unknown (SE/informal) | 65% of income; show range ±15pp | My judgement |

**Impact**: Expenses are subtracted from income before calculating safe EMI. Higher expenses → lower safe amount.

---

## 3. Existing EMI

| Scenario | Rule | Source |
|----------|------|--------|
| User provides a number (incl. ₹0) | Use as-is | USER_ANSWER |
| Unknown | 10% of income (never ₹0 if unknown) | My judgement |

**Impact**: Existing EMI reduces available capacity for both lender and safe calculations.

---

## 4. High-Cost Debt

### Definition

Debt with APR ≥ 30% (app-based loans, moneylender debt, revolving credit card debt).

**Source**: My judgement (threshold).

### Monthly Payment Estimation

| Scenario | Rule | Source |
|----------|------|--------|
| User provides monthly payment | Use as-is | USER_ANSWER |
| Unknown | outstanding × 25%; show range 15%–30% | My judgement |

### Hard Stops

| Condition | Verdict | Source |
|-----------|---------|--------|
| **SEVERE**: HCD monthly burden ≥ 30% of safe income | DONT_BORROW | My judgement |
| **COMPOUND**: HCD burden ≥ 15% AND recent bounce | DONT_BORROW | My judgement |
| Recent bounce AND baseline stress = Unsustainable | DONT_BORROW | My judgement |

**Impact**: Hard stops override all other calculations. Verdict is forced to DONT_BORROW.

---

## 5. FOIR (Fixed Obligation to Income Ratio)

| Segment | FOIR | Source |
|---------|------|--------|
| Salaried | 50% | My judgement |
| Self-employed (ITR) | 45% | My judgement |
| Self-employed (undocumented) | 35% | My judgement |
| Informal | 35% | My judgement |
| **Secured product** (overrides all above) | 60% | My judgement |

```
maxTotalDebtService = eligibleIncomeLender × FOIR
availableNewEMI = max(0, maxTotalDebtService − existingEMI − businessDebtEMI − highCostDebtEMI)
lenderLikelyAmount = principalFromEMI(availableNewEMI, fairRateMid, tenure)
```

**Impact**: FOIR directly caps the lender-likely amount.

---

## 6. Collateral & LTV (Loan to Value)

### Collateral Types & Regulatory LTV Ratios

A borrower may have gold, residential property, commercial property, no collateral, or be unsure about pledging.

| Collateral Asset Type | Applicable LTV Ceiling | Valuation Haircut | Source or My Judgement |
|-----------------------|------------------------|-------------------|------------------------|
| **Gold Jewellery / Ornaments (≤ ₹2L)** | 85% | 20% | External fact (RBI 2026 tiered) |
| **Gold Jewellery / Ornaments (₹2L–₹10L)** | 80% | 20% | External fact (RBI 2026 tiered) |
| **Gold Jewellery / Ornaments (> ₹10L)** | 75% | 20% | External fact (RBI 2026 tiered) |
| **Residential Property (House / Flat)** | 70% | 20% | External fact (market research) |
| **Commercial Property (Shop / Office / Warehouse)** | 60% | 20% | External fact (iServeFinancial conservative benchmark) |
| **No Collateral** | N/A (Unsecured) | N/A | My judgement |
| **Not Sure** | N/A (No LTV capacity applied) | N/A | My judgement |

### Collateral Valuation Haircut & Calculation

All self-reported collateral valuations receive an initial **20% haircut** before regulatory LTV limits are applied, acknowledging that borrower estimates are self-reported and unverified:

```
eligibleCollateralValue = estimatedCollateralValue × (1 − 0.20)
ltvSupportedAmount = eligibleCollateralValue × applicableLTV
```

For secured lender capacity:
```
securedLenderAmount = min(foirSupportedAmount, ltvSupportedAmount)
```

**Source (Haircut)**: My judgement (self-reported values are unverified and subject to lender appraisal haircuts).

### When LTV is Applicable
- LTV capacity is ONLY computed and applied when:
  1. A collateral type is explicitly selected (`property_residential`, `property_commercial`, or `gold`).
  2. The borrower explicitly confirms willingness to pledge (`willingToPledge === 'yes'`).
  3. An estimated collateral market value is provided (`statedValue !== null` and `> 0`).

### Treatment of Unknown / Unsure Collateral
- If the borrower selects "Not sure", no collateral type is locked in (`willingToPledge = 'not_sure'`).
- Do NOT fabricate LTV capacity.
- Lender capacity falls back to FOIR-only capacity.
- Confidence is reduced to `MEDIUM` or `LOW` due to uncorroborated collateral inputs.

### Separation Between Primary Product and Secured Alternatives
- **Loan purpose dictates the primary borrowing route**:
  - `home_purchase` → Home Loan (Secured by home)
  - `vehicle` → Two-Wheeler Loan (Secured by vehicle hypothecation)
  - `business_expansion` + property → LAP (Commercial or Residential Property)
  - `business_expansion` + gold → Gold Loan (for business)
  - `business_expansion` + no collateral / not sure → Business Loan (Unsecured)
  - Non-business purposes (`personal_event`, `medical`, `education`, `other`) → Personal Loan (Unsecured)
- **Collateral surfaces an optional secured alternative**:
  - Pledging an asset is never assumed or forced merely because the borrower possesses it.
  - If a personal-loan or vehicle-loan applicant indicates available collateral, the tool presents the secured option (Gold Loan or LAP) as an **alternative comparison**, highlighting lower interest rates against asset foreclosure risks.

---

## 7. Safe Capacity (Retention Factors)

### Base Retention Factors

| Segment | Factor | Source |
|---------|--------|--------|
| Salaried, stable | 50% | My judgement |
| Salaried, variable | 40% | My judgement |
| Self-employed, ITR, steady | 40% | My judgement |
| Self-employed, seasonal/undocumented | 30% | My judgement |
| Informal / gig | 25% | My judgement |

### Adjustments (applied additively)

| Condition | Adjustment | Source |
|-----------|-----------|--------|
| Variable income > 30% | −5 pp | My judgement |
| Emergency savings < 1 month | −5 pp | My judgement |
| Emergency savings > 6 months | +5 pp | My judgement |
| > 2 dependents, no other earner | −5 pp | My judgement |
| Recent EMI bounce | −10 pp | My judgement |
| High-cost debt present (below hard-stop) | −10 pp | My judgement |
| Upcoming large expense | −5 pp | My judgement |

**Clamp**: Floor = 10%, Cap = 55%.

### Calculation

```
disposableCashFlow = max(0, eligibleIncomeSafe − essentialExpenses − existingEMI − businessDebtEMI − highCostDebtEMI)
adjustedRetention = clamp(base + Σadjustments, 10%, 55%)
safeEMI = disposableCashFlow × adjustedRetention
recommendedEMI = safeEMI × 90%        ← applied EXACTLY ONCE
safeAmount = principalFromEMI(safeEMI, fairRateCeiling, defaultTenure)
recommendedAmount = principalFromEMI(recommendedEMI, fairRateCeiling, defaultTenure)
```

**Impact**: The retention factor is the most impactful rule in the safe capacity layer.

---

## 8. Fair Rate (Position Model)

### Base Rate Bands (Market Benchmarks)

> **Important Disclosure on Rate Data**: These market bands reflect observed Indian retail lending ranges as of **Q1 2026**. They are market benchmarks used for educational self-assessment and borrower negotiation, **not** guaranteed lender quotes. Actual quotes depend on individual lender underwriting, risk-based pricing matrices, and bureau checks.

| What (Product Band) | Bank Tier | NBFC Tier | Why | Source or My Judgement |
|---------------------|-----------|-----------|-----|------------------------|
| **Personal Loan** (Unsecured) | 10.0%–16.0% | 16.0%–30.0% | Benchmark range for salaried & prime retail unsecured credit | Market observation (Q1 2026: SBI, HDFC, Bajaj Finance) |
| **Home Loan** (Secured) | 8.5%–10.5% | 10.5%–14.0% | Long-term mortgage rates linked to RBI repo rate benchmarks | Market observation (Q1 2026: SBI, HDFC, LIC Housing) |
| **Loan Against Property (LAP)** | 9.5%–15.0% | 15.0%–20.0% | Secured mortgage on residential/commercial property collateral | Market observation (Q1 2026: SBI, ICICI, Bajaj Finserv) |
| **Gold Loan** (Secured) | 7.0%–12.0% | 12.0%–26.0% | Rapid disbursal secured loans backed by physical gold ornaments | Market observation (Q1 2026: SBI, BOB, Muthoot, Manappuram) |
| **Two-Wheeler Loan** | 9.0%–14.0% | 14.0%–22.0% | Retail vehicle financing secured by vehicle hypothecation | Market observation (Q1 2026: HDFC Bank, TVS Credit, Hero FinCorp) |
| **Business Loan** (Unsecured MSME) | 11.0%–17.0% | 17.0%–28.0% | Cash-flow-based underwriting for business working capital/expansion | Market observation (Q1 2026: HDFC, Axis, Lendingkart) |

### Tier Selection Logic (Bank vs. NBFC)

- **Bank Tier**: Selected when `creditScore ≥ 700` OR (`creditScoreStatus === 'thin_file'` AND `businessTenure ≥ 3yr` AND unencumbered property/gold collateral with explicit pledge confirmation `willingToPledge === 'yes'`).
- **NBFC Tier**: Selected otherwise. Insufficient or missing documentation alone does NOT classify a borrower into an ultra-high penalty rate; the borrower is positioned neutrally (50) within the NBFC band unless actual risk signals justify moving it upward.
- **Classification**: *Product judgement* applied deterministically for conservative negotiation positioning.

### Starting Position & Adjustments (0–100 Scale)

The model begins at neutral midpoint: `position = 50`. Each material factor is evaluated and adjusted at most once:

| What (Factor) | Value | Why | Source or My Judgement |
|---------------|-------|-----|------------------------|
| **Credit Score ≥ 750** | −15 pts | Prime bureau history warrants prime rate positioning | My judgement |
| **Credit Score 700–749** | −7 pts | Good repayment track record warrants moderate rate discount | My judgement |
| **Credit Score 650–699** | 0 pts | Average credit standing; baseline neutral positioning | My judgement |
| **Credit Score 550–649** | +10 pts | Elevated bureau risk warrants moderate risk premium | My judgement |
| **Credit Score < 550** | +20 pts | Subprime credit profile carries substantial lender risk premium | My judgement |
| **Credit Score: Thin File** | +3 pts | Lack of formal history is minor uncertainty, not bad credit | My judgement |
| **Credit Score: Unknown** | 0 pts | Missing score does NOT increase rate midpoint; widens band instead | My judgement |
| **Repayment: Clean** | −3 pts | Verified history of on-time payments without bounces | My judgement |
| **Repayment: Recent Bounce** | +10 pts | Direct distress signal of cash-flow stress or payment failure | My judgement |
| **Repayment: Unknown** | 0 pts | Unknown history does NOT penalize midpoint; widens band instead | My judgement |
| **Stability: Stable** | −5 pts | High income predictability (e.g. established employment / business) | My judgement |
| **Stability: Moderate** | −2 pts | Minor earnings seasonality or variability | My judgement |
| **Stability: Unstable** | +7 pts | Volatile cash flows increase lender default risk | My judgement |
| **Stability: Unknown** | 0 pts | Missing stability does NOT penalize midpoint; widens band instead | My judgement |
| **Documentation: Full** | −3 pts | Full ITR / audited financials / salary slips | My judgement |
| **Documentation: Partial** | 0 pts | Bank statements or informal ledgers available | My judgement |
| **Documentation: None** | +8 pts | Fully undocumented cash earnings increase underwriting risk | My judgement |
| **Documentation: Unknown** | 0 pts | Missing documentation status does NOT penalize midpoint | My judgement |
| **High-Cost Debt Present** | +7 pts | Active debt with APR ≥ 30% signals reliance on high-cost borrowing | My judgement |

*Important*: Each adjustment is applied at most once. No double-counting of distress across multiple fields.

### Unknown Handling & Uncertainty Half-Width

**Core Principle: Unknown ≠ Bad.**
Missing information must NOT be treated as bad credit. Unknown inputs never push the midpoint upward. Instead, they widen the uncertainty half-width around the midpoint:

- `unknownCount` = count of unknown inputs among (`creditScoreStatus`, `repaymentHistory`, `incomeStability`, `documentationStatus`).
- `halfWidth = min(25, 15 + (5 × unknownCount))`

| Unknown Factors Count | Half-Width (Position Points) | Interpretation |
|-----------------------|------------------------------|----------------|
| **0 Unknowns** | ±15 pts | High confidence; tight baseline uncertainty band |
| **1 Unknown** | ±20 pts | Medium confidence; moderately widened range |
| **2 Unknowns** | ±25 pts | Medium/Low confidence; widened range |
| **3+ Unknowns** | ±25 pts (Capped) | Low confidence; range widened to maximum cap |

### Rate Mapping Calculation

```
position = clamp(50 + Σadjustments, 0, 100)
span = upperRate − lowerRate
rate = lowerRate + (position / 100) × span

fairRateMid = rate
halfWidthRate = (halfWidth / 100) × span
fairRateLow = max(lowerRate, fairRateMid − halfWidthRate)
fairRateHigh = min(upperRate, fairRateMid + halfWidthRate)
```

The displayed rate range is guaranteed to never escape the underlying product band `[lowerRate, upperRate]`.

**Impact**: Fair rate determines the negotiation range shown to the borrower, the rate for requested loan EMI, and the conservative ceiling rate for sizing safe principal capacity.

---

## 9. Effective Cost

```
EMI = standard EMI formula
processingFee = principal × midpoint(feeRange)
netProceeds = principal − processingFee
Solve for r': netProceeds = EMI × [1 − (1+r')^(−n)] / r'   (bisection)
effectiveAnnualizedCost = (1 + r')^12 − 1
```

**Included**: Processing fee, nominal interest.
**Excluded**: GST on fee, foreclosure charges, insurance, timing differences.

**Source**: My judgement (fee ranges from aggregator observation).

---

## 10. Stress Test

| Scenario | Shock | Source |
|----------|-------|--------|
| Income shock | income × 80% | Assignment-derived |
| Rate shock | rate + 2 percentage points | Assignment-derived |

### Classification

| Ratio | Classification | Source |
|-------|---------------|--------|
| ≤ 35% | Comfortable | My judgement |
| 36%–45% | Tight | My judgement |
| 46%–55% | Stressed | My judgement |
| > 55% | Unsustainable | My judgement |

```
numerator = recommendedEMI + existingEMI + businessDebtEMI + highCostDebtEMI
baselineRatio = numerator / eligibleIncomeSafe × 100
```

---

## 11. Decision Logic

1. **Hard stops** → DONT_BORROW (see Section 4 above)
2. **Amount comparison**:
   - requested ≤ safe → BORROW
   - requested ≤ lender → BORROW_LESS
   - requested > lender → BORROW_LESS
3. **Soft signals** (≥ 2 escalates verdict one notch):
   - Emergency savings < 1 month
   - Recent EMI bounce (below hard-stop threshold alone)
   - Income-shock stress = Stressed or Unsustainable
   - Requested > 1.5× safe capacity
   - High-cost debt present below hard-stop threshold
4. **DONT_BORROW**: all amounts shown as "mathematical capacity only" — not recommendations.

---

## 12. Productive Return (Issue 4)

Productive return **NEVER enters any calculation function**. It is stored in `BorrowerProfile.isProductiveLoan` for display-only purposes (Negotiation Card framing text). This is a deliberate design decision to prevent the borrower from rationalizing over-borrowing.

**Source**: My judgement.

---

## 13. Confidence

Per-output, never blended:
- **HIGH**: 0 missing material inputs
- **MEDIUM**: 1–2 missing material inputs
- **LOW**: 3+ missing OR any heavily-weighted input missing

**Source**: My judgement.

---

## 14. Default Tenures

| Product | Default Tenure | Source |
|---------|---------------|--------|
| Personal Loan | 36 months | My judgement |
| Home Loan | 180 months | My judgement |
| LAP | 84 months | My judgement |
| Gold Loan | 12 months | My judgement |
| Two-Wheeler | 36 months | My judgement |
| Business Loan | 36 months | My judgement |

---

## 15. Total Cost of Borrowing (Cash Outflow)

```
totalRepayment = EMI × tenureMonths
totalInterest = totalRepayment − Principal
estimatedProcessingFee = Principal × (processingFeePct / 100)
totalOutflow = totalRepayment + estimatedProcessingFee
costMultiple = totalOutflow / Principal
```

| Component | Rule | Source |
|-----------|------|--------|
| Total Repayment | Standard monthly amortization sum | Mathematical identity |
| Total Interest | Total repayment minus principal | Mathematical identity |
| Processing Fee | Product fee midpoint (e.g. 1.0%–2.0%) | Aggregator observation / My judgement |
| Cost Multiple | Total cash paid per ₹1 borrowed (e.g. 1.25x) | Mathematical identity |

**Impact**: Shows the borrower the true total cost of borrowing beyond monthly EMIs, preventing "EMI myopia" where borrowers underestimate the cumulative drain of interest and fees.

---

## 16. Opportunity Cost — "If Invest Instead"

Evaluates the wealth path if the borrower forgives the loan and invests the equivalent monthly EMI into a disciplined Systematic Investment Plan (SIP).

```
i = annualReturnPct / 100 / 12
n = tenureMonths
futureValue = monthlyEMI × [ ((1 + i)^n − 1) / i ] × (1 + i)
wealthGain = futureValue − (monthlyEMI × n)
netWealthDifference = wealthGain + totalInterestPaid
```

| Return Benchmark | Expected Return | Source |
|------------------|----------------|--------|
| Fixed Deposit / Debt | 7.0% p.a. | External fact (RBI / bank rates) |
| Balanced / Hybrid | 10.0% p.a. | Market historical benchmark |
| Equity SIP (Nifty 50 Index) | 12.0% p.a. | 15-year long-term historical average (NSE India) |
| Aggressive Growth | 15.0% p.a. | Market historical benchmark |

**Impact**: Empowers the borrower to answer Question 1 ("Should I borrow at all?") by contrasting the wealth-destroying effect of compound interest paid to lenders against the wealth-building effect of compound interest earned in an investment portfolio.

---

## 17. Known Limitations

1. **Property valuation**: Self-reported, unverified. Haircut applied but not sufficient for underwriting.
2. **Business loan bands**: Weakest-sourced (fewer aggregator data points).
3. **Two-wheeler bands**: Fewer aggregator data points than home/personal.
4. **Processing fees**: Approximate ranges from aggregator observation.
5. **No bureau integration**: Credit score is self-reported.
6. **No lender-specific pricing**: Rate bands are market-level, not institution-specific.
7. **Productive return**: Excluded from calculations by design (see Section 12).
8. **Investment returns**: Market returns are non-guaranteed estimates and subject to volatility.
9. **Lender recognition model**: The lender-recognition model is an illustrative borrower-side heuristic, not a lender underwriting policy. Product judgements are applied conservatively on unevidenced portions.
