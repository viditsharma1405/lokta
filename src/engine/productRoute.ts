// ─────────────────────────────────────────────────────────────────────────────
// Product Route — determines the appropriate loan product
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { ProductRouteResult } from '../types/calculations';

export function computeProductRoute(profile: BorrowerProfile): ProductRouteResult {
  const { loanPurpose, collateral } = profile;
  const hasCollateral = collateral.type !== 'none' && collateral.statedValue !== null && collateral.statedValue > 0;

  if (loanPurpose === 'home_purchase') {
    return {
      recommendedRoute: 'Home Loan',
      isSecured: true,
      alternativeRoutes: [],
      rationale: 'Home purchase is best served by a home loan — lowest rates, longest tenures, and property as collateral.',
      tradeoffs: [
        'Longer tenure means more total interest paid',
        'Property must be valued by an approved appraiser',
      ],
    };
  }

  if (loanPurpose === 'vehicle') {
    return {
      recommendedRoute: 'Two-Wheeler Loan',
      isSecured: true,
      alternativeRoutes: ['Personal Loan (higher rate, no hypothecation)'],
      rationale: 'A two-wheeler loan uses the vehicle as collateral — lower rate than a personal loan.',
      tradeoffs: [
        'Vehicle is hypothecated until loan is cleared',
        'Personal loan avoids hypothecation but at higher rate',
      ],
    };
  }

  if (loanPurpose === 'business_expansion') {
    if (hasCollateral && collateral.type === 'gold') {
      return {
        recommendedRoute: 'Gold Loan (for business purpose)',
        isSecured: true,
        alternativeRoutes: ['Business Loan (unsecured)', 'LAP (if property available)'],
        rationale: 'Gold loan gives the fastest disbursal and lowest paperwork at a competitive rate.',
        tradeoffs: ['Gold is pledged and cannot be used until loan is repaid', 'Shorter tenures (typically 12 months) require refinancing or repayment'],
      };
    }
    if (hasCollateral && (collateral.type === 'property_commercial' || collateral.type === 'property_residential')) {
      const routeName = collateral.type === 'property_commercial' ? 'LAP (Commercial Property)' : 'LAP (Residential Property)';
      return {
        recommendedRoute: routeName,
        isSecured: true,
        alternativeRoutes: ['Business Loan (unsecured — higher rate)', 'Personal Loan'],
        rationale: 'LAP typically offers the largest eligible amount at the lowest secured rate. Your shop/property as collateral supports a larger sanction than unsecured routes.',
        tradeoffs: [
          'Formal property valuation required before sanction',
          'Property is mortgaged — risk of loss if EMI is missed',
          collateral.type === 'property_commercial'
            ? 'Commercial properties typically have lower LTV (60%) than residential (70%)'
            : 'Residential LTV is 70%',
        ],
        securityWarning: 'Your property is at risk if you default. Do not borrow more than your safe capacity even though the lender may allow more.',
      };
    }
    return {
      recommendedRoute: 'Business Loan (Unsecured)',
      isSecured: false,
      alternativeRoutes: ['Personal Loan (if business documents unavailable)'],
      rationale: 'Unsecured business loan based on ITR/bank statement. Higher rate than LAP but no collateral risk.',
      tradeoffs: [
        'Higher interest rate than secured alternatives',
        'Shorter tenures typically required',
        'ITR / GST documentation usually required',
      ],
    };
  }

  if (hasCollateral && collateral.type === 'gold') {
    return {
      recommendedRoute: 'Gold Loan',
      isSecured: true,
      alternativeRoutes: ['Personal Loan'],
      rationale: 'Gold loan offers the lowest rate and fastest disbursal for this type of need.',
      tradeoffs: ['Gold is pledged — cannot access ornaments until repayment', 'Short tenure (typically 12 months)'],
    };
  }

  // Default: personal loan
  return {
    recommendedRoute: 'Personal Loan',
    isSecured: false,
    alternativeRoutes: hasCollateral ? ['LAP (if property available)'] : [],
    rationale: 'Personal loan is the most straightforward product for this purpose with no collateral required.',
    tradeoffs: [
      'Higher interest rate than secured alternatives',
      'Rate significantly depends on your credit score and documentation',
    ],
  };
}
