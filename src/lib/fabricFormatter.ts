/**
 * Universal Fabric Display Name Formatter
 * 
 * Formats fabric records according to the required standard:
 * "Garment type(shirting, bottom etc) - Brand - Quality - Shade (width)"
 * e.g., "SHIRTING - Raymond - Oxford Cotton - Sky Blue (58")"
 */

export function formatFabricDisplayName(fabric: any): string {
  if (!fabric) return '';
  if (typeof fabric === 'string') return fabric;

  const garmentType = (fabric.garment_category || fabric.garment_type || fabric.fabric_type || '').toString().trim();
  const brand = (fabric.brand_name || fabric.brand || '').toString().trim();
  const quality = (fabric.quality || fabric.quality_name || '').toString().trim();
  const shade = (fabric.shade || fabric.colour || fabric.color || '').toString().trim();

  // Combine present segments in strict order: Garment type - Brand - Quality - Shade
  const segments = [garmentType, brand, quality, shade].filter(Boolean);

  let baseText = '';
  if (segments.length > 0) {
    baseText = segments.join(' - ');
  } else {
    // Fallback if individual segment fields are unpopulated in legacy entries
    baseText = (fabric.name || fabric.item_name || fabric.code || 'Fabric').toString().trim();
  }

  // Append formatted width: (width")
  const rawWidth = fabric.width !== null && fabric.width !== undefined ? String(fabric.width).trim() : '';
  if (rawWidth) {
    const cleanWidth = rawWidth.endsWith('"') ? rawWidth : `${rawWidth}"`;
    return `${baseText} (${cleanWidth})`;
  }

  return baseText;
}
