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
 * Format an ISO date string or Date object into standard DD/MM/YYYY date (and optional Indian Standard Time).
 * e.g. formatDate("2026-09-28T07:18:20Z") -> "28/09/2026"
 * with includeTime: -> "28/09/2026, 12:48 PM"
 */
export function formatDate(
  dateStr: string | Date | null | undefined, 
  includeTime: boolean = false,
  includeSeconds: boolean = false
): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    // Format strictly as DD/MM/YYYY in Indian Standard Time (Asia/Kolkata)
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const dateFormatted = formatter.format(d); // Always "DD/MM/YYYY"

    if (!includeTime) return dateFormatted;

    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true
    });
    const timeFormatted = timeFormatter.format(d);

    return `${dateFormatted}, ${timeFormatted}`;
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

export interface FormattedMetricItem {
  label: string;
  value: string; // e.g. "S (76–81 cm)" or "32 In"
  standardSize?: string; // e.g. "S"
  assignedDimension?: string; // e.g. "76–81 cm"
  unit?: string;
  isStandardSize: boolean;
}

export interface GarmentMetricsDisplay {
  garmentName: string;
  strategy: 'us_size_chart' | 'manual';
  chartName?: string;
  chartUnit?: string;
  metrics: FormattedMetricItem[];
  summaryText: string;
}

/**
 * Format a single metric label & value, resolving US size charts against
 * embedded assigned_dimensions or the global sizeCharts list.
 */
export function formatGarmentMetric(
  label: string,
  val: any,
  garmentObj?: any,
  sizeCharts?: any[]
): FormattedMetricItem {
  const isSizeChart =
    garmentObj?.strategy === 'us_size_chart' ||
    Boolean(garmentObj?.chart_id) ||
    Boolean(garmentObj?.selected_size);

  if (isSizeChart) {
    const sizeVal = typeof val === 'object' && val !== null ? '' : String(val ?? '').trim();

    // 1. Check if assigned_dimensions was already embedded
    let assigned = garmentObj?.assigned_dimensions?.[label];
    let unit = garmentObj?.chart_unit || '';

    // 2. If not embedded, search in sizeCharts list
    if (!assigned && sizeCharts && garmentObj?.chart_id) {
      const chart = sizeCharts.find((c: any) => c.id === garmentObj.chart_id);
      if (chart) {
        unit = chart.unit || unit;
        const group = chart.metric_groups?.find(
          (g: any) => g.label?.toLowerCase() === label?.toLowerCase()
        );
        const match = group?.data?.find(
          (d: any) => String(d.size).toLowerCase() === sizeVal.toLowerCase()
        );
        if (match?.value) {
          assigned = `${match.value}${chart.unit ? ' ' + chart.unit : ''}`;
        }
      }
    }

    // 3. Instant standard chart fallback if sizeCharts is not yet loaded
    if (!assigned) {
      const standardChartSpecs: Record<string, Record<string, string>> = {
        'chest (to fit)': { 'xs': '32-34 in', 's': '35-37 in', 'm': '38-40 in', 'l': '41-43 in', 'xl': '44-46 in', 'xxl': '47-49 in' },
        'body length': { 'short': '26-27 in', 'standard': '28-29 in', 'long': '30-31 in' },
        'waist (to fit)': { 'xs': '71–76 cm', 's': '76–81 cm', 'm': '81–86 cm', 'l': '86–91 cm', 'xl': '91–96 cm', 'xxl': '96–101 cm' },
        'leg length': { 'short': '74–76 cm', 'standard': '79–81 cm', 'long': '84–86 cm', 'extra long': '89–91 cm' }
      };
      const labelLower = label.toLowerCase().trim();
      const sizeLower = sizeVal.toLowerCase().trim();
      assigned = standardChartSpecs[labelLower]?.[sizeLower];
      if (!assigned) {
        if (labelLower.includes('waist') && (sizeLower === 's' || sizeLower === 'small')) assigned = '76–81 cm';
        else if (labelLower.includes('waist') && (sizeLower === 'm' || sizeLower === 'medium')) assigned = '81–86 cm';
        else if (labelLower.includes('leg length') && sizeLower.includes('long')) assigned = '84–86 cm';
        else if (labelLower.includes('chest') && (sizeLower === 'm' || sizeLower === 'medium')) assigned = '38-40 in';
        else if (labelLower.includes('chest') && (sizeLower === 's' || sizeLower === 'small')) assigned = '36-38 in';
        else if (labelLower.includes('body length') && sizeLower.includes('standard')) assigned = '28-29 in';
      }
    }

    const displayValue = assigned && sizeVal
      ? `${sizeVal} (${assigned})`
      : sizeVal || assigned || '--';

    return {
      label,
      value: displayValue,
      standardSize: sizeVal,
      assignedDimension: assigned,
      unit,
      isStandardSize: true
    };
  }

  // Manual bespoke measurement
  const strVal = typeof val === 'object' && val !== null ? '' : String(val ?? '').trim();
  return {
    label,
    value: strVal || '--',
    isStandardSize: false
  };
}

/**
 * Parse and format all metrics for a garment object.
 * Returns structured items with both standard US size and assigned dimensions,
 * strictly filtering out technical keys (chart_id, strategy, etc).
 */
export function extractGarmentDisplayMetrics(
  garmentName: string,
  garmentData: any,
  sizeCharts?: any[]
): GarmentMetricsDisplay {
  if (!garmentData || typeof garmentData !== 'object') {
    return {
      garmentName,
      strategy: 'manual',
      metrics: [],
      summaryText: String(garmentData || '--')
    };
  }

  const strategy: 'us_size_chart' | 'manual' =
    garmentData.strategy === 'us_size_chart' ||
    Boolean(garmentData.chart_id) ||
    Boolean(garmentData.selected_size)
      ? 'us_size_chart'
      : 'manual';

  const metrics: FormattedMetricItem[] = [];

  if (strategy === 'us_size_chart' && garmentData.selected_size && typeof garmentData.selected_size === 'object') {
    Object.entries(garmentData.selected_size).forEach(([label, sizeVal]) => {
      metrics.push(formatGarmentMetric(label, sizeVal, garmentData, sizeCharts));
    });
  } else {
    const techKeys = new Set([
      'strategy',
      'chart_id',
      'chart_name',
      'chart_unit',
      'selected_size',
      'assigned_dimensions',
      '_garment',
      '_target_dress',
      '_fabric'
    ]);

    Object.entries(garmentData).forEach(([label, val]) => {
      if (!techKeys.has(label) && !label.startsWith('_') && val !== undefined && val !== null && val !== '') {
        metrics.push(formatGarmentMetric(label, val, garmentData, sizeCharts));
      }
    });
  }

  const summaryText = metrics.length > 0
    ? metrics.map(m => `${m.label}: ${m.value}`).join(' | ')
    : 'Standard Fitting';

  return {
    garmentName,
    strategy,
    chartName: garmentData.chart_name,
    chartUnit: garmentData.chart_unit,
    metrics,
    summaryText
  };
}

/**
 * Capitalizes the first letter of a string (if it's a letter), leaving the rest unchanged.
 * e.g. "urgent uniform requirements" -> "Urgent uniform requirements"
 */
export function capitalizeFirstLetter(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes the first letter of each word (Title Case).
 * e.g. "orchid hospital private limited" -> "Orchid Hospital Private Limited"
 * e.g. "kizhakkethala, down hill" -> "Kizhakkethala, Down Hill"
 */
export function capitalizeWords(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/\b([a-z])/g, (char) => char.toUpperCase());
}

/**
 * Format a Date object or ISO string into "DD Mon YYYY" format.
 * e.g. "2026-10-05" -> "05 Oct 2026"
 */
export function formatDateDoc(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Convert number to Indian Rupee Words (Indian numbering system)
 * e.g. 102375 -> "Rupees One Lakh Two Thousand Three Hundred Seventy Five Only"
 */
export function numberToWordsINR(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return 'Rupees Zero Only';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val) || val <= 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const ones = a[n % 10];
    return ones ? `${tens} ${ones}` : tens;
  };

  const convertThreeDigits = (n: number): string => {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (hundreds > 0) parts.push(`${a[hundreds]} Hundred`);
    if (rest > 0) parts.push(convertTwoDigits(rest));
    return parts.join(' ');
  };

  const rounded = Math.round(val * 100) / 100;
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100);

  // Indian format: Crores, Lakhs, Thousands, Hundreds/Tens/Units
  const crore = Math.floor(integerPart / 10000000);
  const remainderCrore = integerPart % 10000000;
  const lakh = Math.floor(remainderCrore / 100000);
  const remainderLakh = remainderCrore % 100000;
  const thousand = Math.floor(remainderLakh / 1000);
  const remainderThousand = remainderLakh % 1000;

  const words: string[] = [];
  if (crore > 0) words.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh > 0) words.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) words.push(`${convertTwoDigits(thousand)} Thousand`);
  if (remainderThousand > 0) words.push(convertThreeDigits(remainderThousand));

  const rupeesStr = words.length > 0 ? words.join(' ') : 'Zero';
  let result = `Rupees ${rupeesStr}`;

  if (decimalPart > 0) {
    result += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }
  return `${result} Only`;
}
