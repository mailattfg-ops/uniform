/**
 * Utility to convert fabric measurement from the default 58" width specification
 * to a chosen fabric's actual width in Quotation Compiler.
 * 
 * Rules:
 * 1. Default product fabric consumption is assigned according to 58" width.
 * 2. If a selected fabric has 58" width, keep fabric length as it is.
 * 3. If fabric has different width:
 *    required_length = (required_length_58 * 58) / current_fabric_width
 * 4. Rounded up to the next decimal point (ceiling to 1 decimal place):
 *    e.g. 5.74m -> 5.8m, 5.01m -> 5.1m, 5.0m -> 5.0m.
 */

export function convertFabricMetersByWidth(
  baseMeters58: number | string | undefined | null,
  currentWidth: number | string | undefined | null
): string {
  if (baseMeters58 === undefined || baseMeters58 === null || baseMeters58 === '') {
    return '';
  }

  const meters = typeof baseMeters58 === 'string' ? parseFloat(baseMeters58) : Number(baseMeters58);
  if (isNaN(meters) || meters <= 0) {
    return String(baseMeters58);
  }

  if (currentWidth === undefined || currentWidth === null || currentWidth === '') {
    return String(baseMeters58);
  }

  const width = typeof currentWidth === 'string' ? parseFloat(currentWidth) : Number(currentWidth);
  if (isNaN(width) || width <= 0) {
    return String(baseMeters58);
  }

  // If 58" width, keep the length as it is without recalculation
  if (width === 58) {
    return String(baseMeters58);
  }

  // Formula: required length (of 58" fabric) * 58 / current fabric width
  const rawConverted = (meters * 58) / width;

  // Round to next decimal point (ceiling at 1 decimal place)
  // Use toFixed(6) first to eliminate floating-point precision artifacts (e.g., 5.70000000001)
  const rounded = Math.ceil(Number(rawConverted.toFixed(6)) * 10) / 10;
  return rounded.toFixed(1);
}
