// ─────────────────────────────────────────────────────────────────────────────
// Product Route — determines the appropriate loan product
// ─────────────────────────────────────────────────────────────────────────────

import type { BorrowerProfile } from '../types/profile';
import type { ProductRouteResult } from '../types/calculations';

export function computeProductRoute(profile: BorrowerProfile): ProductRouteResult {
  const { loanPurpose, collateral } = profile;
  const isPledged = collateral.willingToPledge !== 'no' && collateral.willingToPledge !== 'not_sure';
  const hasCollateral = collateral.type !== 'none' && isPledged && (collateral.statedValue ?? 0) > 0;

  // 1. Home Purchase
  if (loanPurpose === 'home_purchase') {
    return {
      recommendedRoute: 'Home Loan',
      isSecured: true,
      alternativeRoutes: [],
      rationale: 'Home purchase is best served by a home loan — lowest rates, longest tenures, and the purchased property itself as collateral.',
      tradeoffs: [
        'Longer tenure means more total interest paid over time',
        'Property must be formally inspected and valued by an approved appraiser',
      ],
    };
  }

  // 2. Vehicle Purchase (Primary remains Two-Wheeler Loan; collateral gives secured alternative)
  if (loanPurpose === 'vehicle') {
    const alternativeRoutes: string[] = ['Personal Loan (unsecured — higher rate, no hypothecation)'];
    let securedAlternative: ProductRouteResult['securedAlternative'] = undefined;

    if (hasCollateral && collateral.type === 'gold') {
      securedAlternative = {
        product: 'Gold Loan',
        description: 'Lower interest rate (7%–12% bank) and instant disbursal by pledging gold ornaments instead of vehicle hypothecation.',
      };
      alternativeRoutes.unshift('Gold Loan (secured alternative — lower rate, gold pledged)');
    } else if (hasCollateral && (collateral.type === 'property_residential' || collateral.type === 'property_commercial')) {
      const propType = collateral.type === 'property_commercial' ? 'commercial' : 'residential';
      securedAlternative = {
        product: 'Loan Against Property (LAP)',
        description: `Property-backed financing using your ${propType} property — lower rate and longer repayment tenures.`,
      };
      alternativeRoutes.unshift(`LAP (secured alternative — ${propType} property pledged)`);
    } else if (collateral.willingToPledge === 'not_sure') {
      alternativeRoutes.unshift('Gold Loan / LAP (worth comparing if willing to pledge an asset for a lower rate)');
    }

    return {
      recommendedRoute: 'Two-Wheeler Loan',
      isSecured: true,
      securedAlternative,
      alternativeRoutes,
      rationale: 'A two-wheeler loan uses the vehicle being purchased as hypothecated collateral — offering lower interest rates than an unsecured personal loan.',
      tradeoffs: [
        'Vehicle is hypothecated to the lender until the loan is fully repaid',
        'Personal loan avoids hypothecation but carries a significantly higher interest rate',
      ],
    };
  }

  // 3. Business Expansion (LAP or Gold Loan can be primary secured route; unsecured business loan otherwise)
  if (loanPurpose === 'business_expansion') {
    if (hasCollateral && (collateral.type === 'property_commercial' || collateral.type === 'property_residential')) {
      const isComm = collateral.type === 'property_commercial';
      const routeName = isComm ? 'LAP (Commercial Property)' : 'LAP (Residential Property)';
      return {
        recommendedRoute: routeName,
        isSecured: true,
        alternativeRoutes: ['Business Loan (unsecured — higher rate, faster approval)', 'Personal Loan'],
        rationale: 'LAP typically offers the largest eligible principal at the lowest secured business borrowing rate. Your property collateral supports a larger sanction than cash-flow-only underwriting.',
        tradeoffs: [
          'Formal property valuation and legal title verification required before sanction',
          'Property is mortgaged — risk of foreclosure if monthly payments are missed',
          isComm
            ? 'Commercial properties have an LTV ceiling of 60% compared to 70% for residential'
            : 'Residential property LTV ceiling is 70%',
        ],
        securityWarning: 'Your property is at risk if you default. Do not borrow more than your safe capacity even though the lender may sanction more.',
      };
    }

    if (hasCollateral && collateral.type === 'gold') {
      return {
        recommendedRoute: 'Gold Loan (for business purpose)',
        isSecured: true,
        alternativeRoutes: ['Business Loan (unsecured)', 'LAP (if property available)'],
        rationale: 'A gold loan offers rapid disbursal and minimal paperwork at a competitive rate to fund business working capital.',
        tradeoffs: [
          'Gold ornaments are pledged in bank vaults until the loan is repaid',
          'Shorter tenure (typically 12 months) requires periodic renewal or bullet repayment',
        ],
      };
    }

    const bizAlternatives = ['Personal Loan (if formal business documents unavailable)'];
    if (collateral.willingToPledge === 'not_sure') {
      bizAlternatives.unshift('LAP / Gold Loan (potential secured alternative worth comparing if open to pledging an asset)');
    }

    return {
      recommendedRoute: 'Business Loan (Unsecured)',
      isSecured: false,
      alternativeRoutes: bizAlternatives,
      rationale: 'Unsecured business loan based on ITR and bank statement cash flows. Higher rate than LAP but requires no asset pledging.',
      tradeoffs: [
        'Higher interest rate (11%–28%) than property-backed secured alternatives',
        'Shorter tenures (12–36 months) typically required',
        'ITR / GST returns and business bank statements required for underwriting',
      ],
    };
  }

  // 4. Non-Business Purposes (personal_event, medical, education, renovation, other)
  // Primary product REMAINS Personal Loan; collateral surfaces an optional secured alternative
  let securedAlternative: ProductRouteResult['securedAlternative'] = undefined;
  const personalAlternatives: string[] = [];

  if (hasCollateral && collateral.type === 'gold') {
    securedAlternative = {
      product: 'Gold Loan',
      description: 'Lower rate (7%–12% bank / 12%–26% NBFC) and instant disbursal by pledging gold ornaments instead of taking an unsecured personal loan.',
    };
    personalAlternatives.push('Gold Loan (secured alternative — lower rate, gold pledged)');
  } else if (hasCollateral && (collateral.type === 'property_residential' || collateral.type === 'property_commercial')) {
    const propType = collateral.type === 'property_commercial' ? 'commercial' : 'residential';
    securedAlternative = {
      product: 'Loan Against Property (LAP)',
      description: `Substantially lower interest rate (9.5%–15%) and longer tenure by mortgaging your ${propType} property.`,
    };
    personalAlternatives.push(`LAP (secured alternative — ${propType} property pledged)`);
  } else if (collateral.willingToPledge === 'not_sure') {
    personalAlternatives.push('Gold Loan / LAP (worth comparing if willing to pledge an asset for a lower rate)');
  }

  return {
    recommendedRoute: 'Personal Loan',
    isSecured: false,
    securedAlternative,
    alternativeRoutes: personalAlternatives,
    rationale: 'Personal loan is the most straightforward product for this purpose with no collateral required.',
    tradeoffs: [
      'Higher interest rate (10%–30%) than secured asset-backed alternatives',
      'Rate significantly depends on your credit score and documentation',
    ],
  };
}
