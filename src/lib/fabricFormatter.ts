/**
 * Universal Fabric Display Name Formatter
 * 
 * Formats fabric records according to the required standard:
 * "Brand Quality Shade (width)"
 * e.g., "Arvind Concord 5111 (36\")"
 */

export function formatFabricDisplayName(fabric: any): string {
  if (!fabric) return '';

  if (typeof fabric === 'string') {
    const trimmed = fabric.trim();

    // 1. Check if string has (width) at the end: e.g. "SHIRTING - Arvind Concord 5111(36")" or "... (36")"
    const widthMatch = trimmed.match(/^(.*?)\s*\(([^)]+)\)$/);
    let base = trimmed;
    let widthStr = '';
    if (widthMatch) {
      base = widthMatch[1].trim();
      const rawW = widthMatch[2].trim();
      widthStr = rawW.endsWith('"') ? rawW : `${rawW}"`;
    }

    // 2. Remove any leading "Garment - " or legacy "Garment - Brand - Quality - Shade" prefix from base
    if (base.includes(' - ')) {
      const parts = base.split(' - ').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // Strip the garment category (first segment)
        base = parts.slice(1).join(' ');
      }
    }

    if (widthStr) {
      return `${base} (${widthStr})`;
    }
    return base;
  }

  const brand = (fabric.brand_name || fabric.brand || '').toString().trim();
  const quality = (fabric.quality || fabric.quality_name || '').toString().trim();
  const shade = (fabric.shade || fabric.colour || fabric.color || '').toString().trim();

  // Combine Brand, Quality, Shade separated by spaces (Garment Category is excluded)
  const brandQualityShade = [brand, quality, shade].filter(Boolean).join(' ');

  let baseText = '';
  if (brandQualityShade) {
    baseText = brandQualityShade;
  } else {
    // Fallback if individual segment fields are unpopulated in legacy entries
    baseText = (fabric.name || fabric.item_name || fabric.code || 'Fabric').toString().trim();
    // If baseText already has width in parentheses at the end, extract it
    const m = baseText.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (m) {
      baseText = m[1].trim();
      const cleanW = m[2].trim().endsWith('"') ? m[2].trim() : `${m[2].trim()}"`;
      if (baseText.includes(' - ')) {
        const parts = baseText.split(' - ').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          baseText = parts.slice(1).join(' ');
        }
      }
      return `${baseText} (${cleanW})`;
    }
    // Remove "Garment - " prefix if present
    if (baseText.includes(' - ')) {
      const parts = baseText.split(' - ').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        baseText = parts.slice(1).join(' ');
      }
    }
  }

  // User requirement: give a space before (width) in item name
  const rawWidth = fabric.width !== null && fabric.width !== undefined ? String(fabric.width).trim() : '';
  if (rawWidth) {
    const cleanWidth = rawWidth.endsWith('"') ? rawWidth : `${rawWidth}"`;
    return `${baseText} (${cleanWidth})`;
  }

  return baseText;
}
