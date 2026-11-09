/**
 * Unified Document Number Generator (Frontend Utility)
 * 
 * Format:
 * [PREFIX]-IU[Branch NO]-[last 2 digits of FY(26 for 2026)]/[month no][nth document]
 * 
 * Financial Year Cycle:
 * - Starts April 1 and ends March 31.
 * - Changes to next year ONLY after March.
 * - e.g. Nov 2026 -> 26, Jan 2027 -> 26, Mar 2027 -> 26, Apr 2027 -> 27.
 * 
 * Prefixes:
 * - Quotation: QT
 * - Customer Payment: CP
 * - Sales Order: SO
 * - Packing: PK
 * - Shipping: DC
 * - Proforma: PR
 * - Invoice: INV
 * - Expenses: EXP
 * - Journal: JV
 * - Credit Note: CN
 * - Purchase Order: PO
 */

export const DOCUMENT_PREFIXES = {
  QUOTATION: 'QT',
  CUSTOMER_PAYMENT: 'CP',
  SALES_ORDER: 'SO',
  PACKING: 'PK',
  SHIPPING: 'DC',
  PROFORMA: 'PR',
  INVOICE: 'INV',
  EXPENSES: 'EXP',
  JOURNAL: 'JV',
  CREDIT_NOTE: 'CN',
  PURCHASE_ORDER: 'PO'
} as const;

export type DocumentPrefix =
  | 'QT'
  | 'CP'
  | 'SO'
  | 'PK'
  | 'DC'
  | 'PR'
  | 'INV'
  | 'EXP'
  | 'JV'
  | 'CN'
  | 'PO'
  | string;

/**
 * Extracts 2-digit branch number from branch_id, branch_code, or branch object.
 * Defaults to '01'.
 */
export function extractBranchNo(branch?: any): string {
  if (!branch && branch !== 0) return '01';
  if (typeof branch === 'object' && branch !== null) {
    return extractBranchNo(branch.id || branch.code || branch.branch_id);
  }
  const digits = String(branch).replace(/\D/g, '');
  if (!digits) return '01';
  const num = parseInt(digits, 10);
  if (isNaN(num) || num <= 0) return '01';
  return String(num).padStart(2, '0');
}

/**
 * Calculates Indian Financial Year last 2 digits.
 * Changes to next year strictly after March 31st (i.e. starting April 1st).
 */
export function getFinancialYearYY(dateInput: Date | string | number = new Date()): string {
  const d = new Date(dateInput);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const month = validDate.getMonth() + 1; // 1 (Jan) - 12 (Dec)
  const fullYear = validDate.getFullYear();
  const fyStartYear = month >= 4 ? fullYear : fullYear - 1;
  return String(fyStartYear).slice(-2);
}

/**
 * Gets 2-digit calendar month number (01 - 12).
 */
export function getMonthNumber(dateInput: Date | string | number = new Date()): string {
  const d = new Date(dateInput);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  return String(validDate.getMonth() + 1).padStart(2, '0');
}

export interface FormatDocumentNumberOptions {
  prefix: DocumentPrefix;
  branch?: any;
  date?: Date | string | number;
  seq?: number | string;
}

/**
 * Formats a document number synchronously given components.
 * Pattern: [PREFIX]-IU[Branch NO]-[FY]/[MM][seq]
 */
export function formatDocumentNumber({
  prefix,
  branch,
  date = new Date(),
  seq = 1
}: FormatDocumentNumberOptions): string {
  const cleanPrefix = (prefix || 'DOC').toUpperCase();
  const branchNo = extractBranchNo(branch);
  const fyYY = getFinancialYearYY(date);
  const monthNo = getMonthNumber(date);
  const nth = Math.max(1, parseInt(String(seq).replace(/\D/g, '') || '1', 10));
  const nthFormatted = String(nth).padStart(2, '0');

  return `${cleanPrefix}-IU${branchNo}-${fyYY}/${monthNo}${nthFormatted}`;
}

