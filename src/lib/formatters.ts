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
export function formatDate(
  dateStr: string | null | undefined, 
  includeTime: boolean = false,
  includeSeconds: boolean = false
): string {
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

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    if (includeSeconds) {
      timeOptions.second = '2-digit';
    }

    const timeFormatted = d.toLocaleTimeString('en-IN', timeOptions);

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

