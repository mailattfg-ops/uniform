/**
 * Universal Fabric Display Name Formatter
 * 
 * Formats fabric records according to the required standard:
 * "Garmenttype - BrandQualityShade(width)"
 * e.g., "SHIRTING - Arvind Concord 5111(36\")"
 */

export function formatFabricDisplayName(fabric: any): string {
  if (!fabric) return '';
  if (typeof fabric === 'string') {
    const trimmed = fabric.trim();
    // Check if it's in the legacy 4-part hyphenated format: "Garment - Brand - Quality - Shade (width)"
    const matchWithWidth = trimmed.match(/^([^-]+)\s*-\s*([^-]+)\s*-\s*([^-]+)\s*-\s*([^(]+?)\s*\(([^)]+)\)$/);
    if (matchWithWidth) {
      const [, garment, brand, quality, shade, width] = matchWithWidth;
      const bqs = [brand.trim(), quality.trim(), shade.trim()].filter(Boolean).join(' ');
      const cleanWidth = width.trim().endsWith('"') ? width.trim() : `${width.trim()}"`;
      return `${garment.trim()} - ${bqs}(${cleanWidth})`;
    }
    // Check without width: "Garment - Brand - Quality - Shade"
    const matchNoWidth = trimmed.match(/^([^-]+)\s*-\s*([^-]+)\s*-\s*([^-]+)\s*-\s*([^()]+)$/);
    if (matchNoWidth) {
      const [, garment, brand, quality, shade] = matchNoWidth;
      const bqs = [brand.trim(), quality.trim(), shade.trim()].filter(Boolean).join(' ');
      return `${garment.trim()} - ${bqs}`;
    }
    // Check if string ends with space before parenthesis: "... (width)" -> "...(width)"
    const spaceWidthMatch = trimmed.match(/^(.*?)\s+\(([^)]+)\)$/);
    if (spaceWidthMatch) {
      const [, base, width] = spaceWidthMatch;
      const cleanWidth = width.trim().endsWith('"') ? width.trim() : `${width.trim()}"`;
      return `${base.trim()}(${cleanWidth})`;
    }
    return trimmed;
  }

  const garmentType = (fabric.garment_category || fabric.garment_type || fabric.fabric_type || '').toString().trim();
  const brand = (fabric.brand_name || fabric.brand || '').toString().trim();
  const quality = (fabric.quality || fabric.quality_name || '').toString().trim();
  const shade = (fabric.shade || fabric.colour || fabric.color || '').toString().trim();

  // Combine Brand, Quality, Shade separated by spaces
  const brandQualityShade = [brand, quality, shade].filter(Boolean).join(' ');

  let baseText = '';
  if (garmentType && brandQualityShade) {
    baseText = `${garmentType} - ${brandQualityShade}`;
  } else if (garmentType) {
    baseText = garmentType;
  } else if (brandQualityShade) {
    baseText = brandQualityShade;
  } else {
    // Fallback if individual segment fields are unpopulated in legacy entries
    baseText = (fabric.name || fabric.item_name || fabric.code || 'Fabric').toString().trim();
    // If baseText already has width in parentheses at the end, normalize it without duplicate width
    const m = baseText.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (m) {
      const cleanWidth = m[2].trim().endsWith('"') ? m[2].trim() : `${m[2].trim()}"`;
      return `${m[1].trim()}(${cleanWidth})`;
    }
  }

  // Append formatted width directly: (width") with no space before (
  const rawWidth = fabric.width !== null && fabric.width !== undefined ? String(fabric.width).trim() : '';
  if (rawWidth) {
    const cleanWidth = rawWidth.endsWith('"') ? rawWidth : `${rawWidth}"`;
    return `${baseText}(${cleanWidth})`;
  }

  return baseText;
}
