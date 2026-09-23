/**
 * Forma Apparels — Shared Formatting Utilities
 * Provides consistent currency, date, and text formatting across all modules.
 */

/**
 * Format a numeric or string value as Indian Rupee (INR) currency.
 * e.g. formatCurrency(125000.5) -> "₹1,25,000.50"
 */
export function formatCurrency(amount: number | string | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || amount === '') {
    return includeSymbol ? '₹0.00' : '0.00';
  }
  const numericVal = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericVal)) {
    return includeSymbol ? '₹0.00' : '0.00';
  }

  const formatted = numericVal.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format an ISO date string into standard readable date (and optional time).
 * e.g. formatDate("2026-09-17T15:30:00Z") -> "17 Sep 2026"
 */
export function formatDate(dateStr: string | null | undefined, includeTime: boolean = false): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);

    const dateFormatted = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    if (!includeTime) return dateFormatted;

    const timeFormatted = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${dateFormatted} at ${timeFormatted}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Format quantities with unit suffix.
 * e.g. formatQuantity(150, "pcs") -> "150 pcs"
 */
export function formatQuantity(qty: number | string | null | undefined, unit: string = 'pcs'): string {
  if (qty === null || qty === undefined || qty === '') return `0 ${unit}`;
  const num = typeof qty === 'string' ? parseFloat(qty) : qty;
  if (isNaN(num)) return `0 ${unit}`;
  return `${num.toLocaleString('en-IN')} ${unit}`;
}

/**
 * Clean status string for display.
 * e.g. formatStatusLabel("Pending PO Handler") -> "Pending PO Review"
 */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status
    .replace('Pending PO Handler', 'Pending Review')
    .replace(/_/g, ' ')
    .trim();
}
