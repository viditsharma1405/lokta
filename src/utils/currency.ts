/** Currency and number formatting utilities for ₹ display */

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    if (Math.abs(amount) >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatEMI(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}/mo`;
}

export function formatRate(rate: number, decimals = 1): string {
  return `${rate.toFixed(decimals)}%`;
}

export function formatRateBand(low: number, high: number): string {
  return `${low.toFixed(1)}% – ${high.toFixed(1)}%`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatLakhs(amount: number): string {
  const lakhs = amount / 100000;
  if (lakhs >= 10) return `₹${lakhs.toFixed(1)}L`;
  return `₹${lakhs.toFixed(2)}L`;
}
