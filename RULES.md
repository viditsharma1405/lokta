# RULES.md — Lokta Borrower Copilot

> Every rule in this file has a **source** and an **impact declaration**.
> Changes here must be reflected in `src/rules/constants.ts`, and vice versa.

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

> **Important**: The documentation treatment is a product judgement for this borrower-side assessment, not an RBI-mandated haircut. RBI does not mandate a blanket 10% undocumented income rule.

Instead of a blanket linear percentage on claimed income, the engine uses an uncertainty-aware model based on factual documentation evidence:

1. **Fully Documented Income (`undocumentedPortion = 0`)**:
   - **What**: 100% of documented income is recognized (`lenderRecognizedIncome = documentedIncome + coApplicantIncome`).
   - **Value**: Full recognition (0% haircut).
   - **Why**: The borrower has provided complete proof (ITR / salary slips / bank statements) matching or exceeding claimed cash flow.
   - **Source**: Product judgement / lending fact.

2. **Partially Documented Income (`documentedIncome > 0 && undocumentedPortion > 0`)**:
   - **What**: Documented base is recognized at 100%; only the unverified surplus portion (`undocumentedPortion = claimedTotalIncome - documentedIncome`) receives conservative treatment.
   - **Value**:
     - Unsecured: 10% of undocumented surplus (capped at ₹25,000/mo).
     - Secured (backed by collateral, e.g. LAP): 40% of undocumented surplus.
   - **Why**: The documented core establishes verified creditworthiness; unverified cash surplus is discounted conservatively.
   - **Source**: Product judgement.

3. **Completely Undocumented Income (`documentedIncome = 0`)**:
   - **What**: Does NOT use a blanket 10% multiplication on claimed income. Instead, uses a conservative base surrogate with an informal benchmark ceiling, and flags lender capacity confidence as `LOW`.
   - **Value**:
     - Unsecured: 35% baseline surrogate (aligned with informal FOIR 35%), strictly capped at ₹25,000/month (aligned with the RBI microfinance household threshold of ₹3,00,000/year).
     - Secured: 40% baseline surrogate, capped at ₹60,000/month.
   - **Why**: For typical informal earnings (e.g. ₹20k–₹35k), informal/MFI lenders evaluate realistic cash flow surrogates rather than driving income to poverty-line levels (e.g. ₹2,600 or ₹3,000). For high claimed cash incomes (e.g. ₹9,00,000/month), unverified cash cannot scale without formal tax/bank documents.
   - **Source**: Product judgement.

| Documentation Status | Loan Type | Recognition Formula | Ceiling Cap | Confidence | Source |
|----------------------|-----------|---------------------|-------------|------------|--------|
| Fully Documented | Any | `100% × documentedIncome` | None | HIGH | Product judgement |
| Partially Documented | Unsecured | `documentedIncome + 10% × undocumentedPortion` | ₹25,000 on surplus | MEDIUM | Product judgement |
| Partially Documented | Secured | `documentedIncome + 40% × undocumentedPortion` | ₹25,000 on surplus | MEDIUM / HIGH | Product judgement |
| Completely Undocumented | Unsecured | `min(₹25,000, 35% × claimedTotalIncome)` | ₹25,000/mo | LOW | Product judgement |
| Completely Undocumented | Secured | `min(₹60,000, 40% × claimedTotalIncome)` | ₹60,000/mo | LOW / MEDIUM | Product judgement |

**Impact**: Lender-recognized income determines FOIR-based capacity (`maxTotalDebtService = lenderRecognizedIncome × FOIR`).

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

## 6. LTV (Loan to Value)

| Collateral | LTV | Source |
|------------|-----|--------|
| Gold ≤ ₹2L | 85% | External fact (RBI 2026) |
| Gold ₹2L–₹10L | 80% | External fact (RBI 2026) |
| Gold > ₹10L | 75% | External fact (RBI 2026) |
| LAP (residential) | 70% | External fact (market research) |
| LAP (commercial) | 60% | External fact (iServeFinancial) |

All self-reported collateral values receive a **20% haircut** before LTV is applied.

```
adjustedCollateralValue = statedValue × (1 − 0.20)
ltvSupportedAmount = adjustedCollateralValue × LTV
lenderLikelyAmount = min(foirSupported, ltvSupported)
```

**Source** (haircut): My judgement.
**Impact**: LTV can be the binding constraint — a lower collateral value or LTV ratio reduces the lender-likely amount.

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

### Base Rate Bands

| Product | Bank Tier | NBFC Tier | Source |
|---------|-----------|-----------|--------|
| Personal Loan | 10%–16% | 16%–30% | External fact (market research) |
| Home Loan | 8.5%–10.5% | 10.5%–14% | External fact |
| LAP | 9.5%–15% | 15%–20% | External fact |
| Gold Loan | 7%–12% | 12%–26% | External fact |
| Two-Wheeler | 9%–14% | 14%–22% | External fact |
| Business Loan | 11%–17% | 17%–28% | External fact (weakest-sourced) |

**Tier selection**: Bank tier if credit score ≥ 700 OR (thin-file + long tenure + collateral). NBFC tier otherwise.

### Position Adjustments (0–100 scale, starting at 50)

| Factor | Value | Source |
|--------|-------|--------|
| Credit score ≥ 750 | −20 | My judgement |
| Credit score 700–749 | −10 | My judgement |
| Credit score 650–699 | 0 | My judgement |
| Credit score 550–649 | +15 | My judgement |
| Credit score < 550 | +30 | My judgement |
| Thin file | +5 | My judgement |
| Clean repayment | −5 | My judgement |
| Recent bounce | +20 | My judgement |
| Stable income | −10 | My judgement |
| Moderate stability | −5 | My judgement |
| Unstable income | +10 | My judgement |
| Full documentation | −5 | My judgement |
| No documentation | +15 | My judgement |
| High-cost debt present | +10 | My judgement |

**Band width**: base ±15 + (10 × number of unknown material factors). Cap = 50.

### Calculation

```
finalPosition = clamp(50 + Σadjustments, 0, 100)
fairRateLow = lowerRate + (finalPosition − halfWidth) / 100 × span
fairRateHigh = lowerRate + (finalPosition + halfWidth) / 100 × span
```

**Impact**: Fair rate determines both the rate band shown to the borrower AND the EMI→Principal conversion.

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
