export interface JobCardPrintData {
  id: number;
  job_card_no: string;
  order_id: number;
  item_name: string;
  design_number: string;
  quantity: number;
  status: string;
  po_handler_action: string;
  hold_reason?: string;
  measurement_readiness?: string;
  created_at: string;
  size_breakdown?: any;
  orders?: {
    order_no: string;
    quotations?: {
      quotation_no: string;
      title?: string;
      organizations?: { name: string };
    };
  };
  child_pieces?: ChildJobCardData[];
}

// Code 39 patterns for inline vector SVG barcode generation (PRD M9.5)
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100',
  'A': '100001001', 'B': '001001001', 'C': '101001000', 'D': '000011001',
  'E': '100011000', 'F': '001011000', 'G': '000001101', 'H': '100001100',
  'I': '001001100', 'J': '000011100', 'K': '100000011', 'L': '001000011',
  'M': '101000010', 'N': '000010011', 'O': '100010010', 'P': '001010010',
  'Q': '000000111', 'R': '100000110', 'S': '001000110', 'T': '000010110',
  'U': '110000001', 'V': '011000001', 'W': '111000000', 'X': '010010001',
  'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010',
  '*': '010010100'
};

export function generateInlineBarcodeSVG(value: string, height = 55, barWidth = 2): string {
  if (!value) return '';
  let cleanValue = value.toUpperCase().trim();
  if (!cleanValue.startsWith('*')) cleanValue = '*' + cleanValue;
  if (!cleanValue.endsWith('*')) cleanValue = cleanValue + '*';

  const wideWidth = barWidth * 2.5;
  let xOffset = 15;
  let rectsHtml = '';

  for (let c = 0; c < cleanValue.length; c++) {
    const char = cleanValue[c];
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) continue;

    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === '1';
      const width = isWide ? wideWidth : barWidth;

      if (isBar) {
        rectsHtml += `<rect x="${xOffset}" y="0" width="${width}" height="${height}" fill="#000000" />`;
      }
      xOffset += width;
    }
    xOffset += barWidth; // inter-character space
  }

  const totalWidth = xOffset + 15;
  return `
    <svg width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; max-width: 100%;">
      ${rectsHtml}
    </svg>
  `;
}

export function isValidAttachmentFabric(
  name?: string | null,
  code?: string | null,
  id?: string | number | null
): boolean {
  if (id && String(id).trim() !== '' && String(id) !== 'null' && String(id) !== 'undefined') return true;
  if (name && typeof name === 'string') {
    const clean = name.toLowerCase().trim();
    if (
      clean &&
      clean !== 'null' &&
      clean !== 'undefined' &&
      clean !== 'optional...' &&
      clean !== 'optional' &&
      clean !== 'none' &&
      clean !== 'n/a' &&
      !clean.includes('attachment fabric') &&
      !clean.includes('att1-std') &&
      !clean.includes('att2-std')
    ) {
      return true;
    }
  }
  if (code && typeof code === 'string') {
    const clean = code.toLowerCase().trim();
    if (
      clean &&
      clean !== 'null' &&
      clean !== 'undefined' &&
      clean !== 'optional' &&
      clean !== 'none' &&
      clean !== 'n/a' &&
      !clean.includes('att1-std') &&
      !clean.includes('att2-std')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Isolates and extracts only the measurements relevant to this Job Card's specific dress/garment.
 * E.g., if Job Card is for a T-shirt, extracts chest, shoulder, top length, etc.
 * If Job Card is for pants, extracts waist, bottom length, hip, etc.
 */
export function extractDressMeasurements(
  rawMeas: Record<string, any> | undefined | null,
  jc: JobCardPrintData
): { label: string; value: string }[] {
  if (!rawMeas || typeof rawMeas !== 'object') return [];

  const cardNames = [
    jc.size_breakdown?.product_name,
    jc.item_name,
    jc.size_breakdown?.product_type_name,
    jc.size_breakdown?.category
  ]
    .filter(Boolean)
    .map(s => String(s).toLowerCase().trim());

  const topKeywords = ['shirt', 't-shirt', 'tshirt', 't shirt', 'polo', 'shirting', 'top', 'kurti', 'blazer', 'coat', 'jacket', 'hoodie', 'sweater', 'vest', 'waistcoat'];
  const bottomKeywords = ['pant', 'pants', 'trouser', 'trousers', 'suiting', 'bottom', 'skirt', 'salwar', 'short', 'shorts', 'track pant', 'cargo'];

  const isCardTop = cardNames.some(cn => topKeywords.some(kw => cn.includes(kw)));
  const isCardBottom = cardNames.some(cn => bottomKeywords.some(kw => cn.includes(kw)));

  const topMetricNames = new Set([
    'chest', 'bust', 'shoulder', 'sleeve', 'sleeve length', 'top length', 'length',
    'collar', 'neck', 'armhole', 'bicep', 'cuff', 'front cross', 'back cross', 'height', 'body length'
  ]);
  const bottomMetricNames = new Set([
    'waist', 'hip', 'bottom length', 'inseam', 'outseam', 'thigh', 'knee', 'bottom hem', 'hem', 'rise', 'crotch', 'leg length', 'height'
  ]);

  // Check if rawMeas contains nested garment objects (e.g. { "Polo T-shirt (1-4J101)": {...}, "pants (1-5K012)": {...} })
  const entries = Object.entries(rawMeas).filter(([k]) => !k.startsWith('_'));
  const nestedEntries = entries.filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));

  let targetData: Record<string, any> = {};

  if (nestedEntries.length > 0) {
    // 1. Direct match by product/garment name
    let matchedGroup: Record<string, any> | null = null;
    for (const [groupName, groupData] of nestedEntries) {
      const gNameLower = groupName.toLowerCase().trim();
      const directMatch = cardNames.some(cn => gNameLower.includes(cn) || cn.includes(gNameLower));
      if (directMatch) {
        matchedGroup = groupData;
        break;
      }
    }

    // 2. Category alignment (Top vs Bottom)
    if (!matchedGroup) {
      for (const [groupName, groupData] of nestedEntries) {
        const gNameLower = groupName.toLowerCase().trim();
        const isGroupTop = topKeywords.some(kw => gNameLower.includes(kw));
        const isGroupBottom = bottomKeywords.some(kw => gNameLower.includes(kw));

        if (isCardTop && isGroupTop && !isGroupBottom) {
          matchedGroup = groupData;
          break;
        }
        if (isCardBottom && isGroupBottom && !isGroupTop) {
          matchedGroup = groupData;
          break;
        }
      }
    }

    if (!matchedGroup && nestedEntries.length === 1) {
      matchedGroup = nestedEntries[0][1];
    }

    if (matchedGroup) {
      targetData = matchedGroup;
    }
  } else {
    targetData = rawMeas;
  }

  // Flatten and filter measurements
  const result: { label: string; value: string }[] = [];

  // Fallback standard chart mappings (ensures historical records show dimensions)
  const standardChartSpecs: Record<string, Record<string, string>> = {
    'chest (to fit)': { 'xs': '32-34 in', 's': '35-37 in', 'm': '38-40 in', 'l': '41-43 in', 'xl': '44-46 in', 'xxl': '47-49 in' },
    'body length': { 'short': '26-27 in', 'standard': '28-29 in', 'long': '30-31 in' },
    'waist (to fit)': { 'xs': '71–76 cm', 's': '76–81 cm', 'm': '81–86 cm', 'l': '86–91 cm', 'xl': '91–96 cm', 'xxl': '96–101 cm' },
    'leg length': { 'short': '74–76 cm', 'standard': '79–81 cm', 'long': '84–86 cm', 'extra long': '89–91 cm' }
  };

  // 1. Process US Size Chart selected_size if present
  if (targetData.selected_size && typeof targetData.selected_size === 'object') {
    Object.entries(targetData.selected_size).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      const kLower = k.toLowerCase().trim();

      // Strictly isolate by garment category if card is clearly a Top or a Bottom
      if (isCardTop && !isCardBottom) {
        if (bottomMetricNames.has(kLower) || bottomKeywords.some(kw => kLower.includes(kw))) return;
      } else if (isCardBottom && !isCardTop) {
        if (topMetricNames.has(kLower) || topKeywords.some(kw => kLower.includes(kw))) return;
      }

      const strSize = String(v).trim();
      const assigned = targetData.assigned_dimensions?.[k] || standardChartSpecs[kLower]?.[strSize.toLowerCase()];
      const displayVal = assigned ? `${strSize} (${assigned})` : strSize;

      result.push({
        label: k,
        value: displayVal
      });
    });
  }

  // 2. Process manual/bespoke metrics
  Object.entries(targetData).forEach(([k, v]) => {
    if (
      k.startsWith('_') ||
      k === 'strategy' ||
      k === 'chart_id' ||
      k === 'chart_name' ||
      k === 'chart_unit' ||
      k === 'selected_size' ||
      k === 'assigned_dimensions' ||
      v === undefined ||
      v === null ||
      v === ''
    ) {
      return;
    }

    const kLower = k.toLowerCase().trim();

    // Strictly isolate by garment category if card is clearly a Top or a Bottom
    if (isCardTop && !isCardBottom) {
      if (bottomMetricNames.has(kLower) || bottomKeywords.some(kw => kLower.includes(kw))) {
        return;
      }
    } else if (isCardBottom && !isCardTop) {
      if (topMetricNames.has(kLower) || topKeywords.some(kw => kLower.includes(kw))) {
        return;
      }
    }

    // Format value
    const strVal = String(v).trim();
    const hasUnit = strVal.endsWith('"') || strVal.toLowerCase().endsWith('in') || strVal.toLowerCase().endsWith('cm');
    const formattedVal = hasUnit ? strVal : `${strVal}"`;

    result.push({
      label: k,
      value: formattedVal
    });
  });

  return result;
}

export function compileJobCardHTML(jc: JobCardPrintData): string {
  const orgName = jc.orders?.quotations?.organizations?.name || jc.orders?.quotations?.title || 'Institutional Client';
  const orderNo = jc.orders?.order_no || `ORD-${jc.order_id}`;
  const quoteNo = jc.orders?.quotations?.quotation_no || '—';
  const barcodeSVG = generateInlineBarcodeSVG(jc.job_card_no, 50, 1.8);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Product Measurements & Sizing Breakdown (PRD M9.6, M11.1, M11.2)
  const childPieces = jc.child_pieces || [];
  const hasEntities = childPieces.some(p => Boolean(p.member_name));
  const isCustomBespoke =
    hasEntities ||
    childPieces.some(p => p.item_type === 'custom') ||
    Boolean(jc.size_breakdown?.is_custom) ||
    Boolean(jc.size_breakdown?.department_id);

  // Raw Material & Fabric Allocation Rows (Main Fabric & Attachment Fabrics)
  const firstPiece = childPieces[0];
  const sb = jc.size_breakdown || {};
  const fabricRowsList: Array<{
    role: string;
    badgeBg: string;
    code: string;
    name: string;
    shade?: string | null;
    ratePerPc: number;
  }> = [];

  const mainCode = firstPiece?.fabric_code || sb.fabric_code || (sb.fabric_id ? `FAB-${sb.fabric_id}` : 'FAB-STD');
  const mainName = firstPiece?.fabric_name || sb.fabric_name || 'Standard Production Mill Fabric';
  const mainRate = Number(firstPiece?.fabric_length || firstPiece?.fabric_meters || sb.main_fabric_meters) || 1.25;
  const mainShade = firstPiece?.fabric_shade || sb.shade || null;
  fabricRowsList.push({
    role: 'MAIN FABRIC',
    badgeBg: '#0f172a',
    code: mainCode,
    name: mainName,
    shade: mainShade,
    ratePerPc: mainRate,
  });

  const att1Id = firstPiece?.attachment1_id || sb.attachment_fabric1_id || null;
  const att1Name = firstPiece?.attachment1_name || sb.attachment_fabric1_name || null;
  const att1Code = firstPiece?.attachment1_code || sb.attachment_fabric1_code || null;
  const att1Rate = Number(firstPiece?.attachment1_length || firstPiece?.attachment1_meters || (sb.attachment_fabric1_id ? sb.attachment_fabric1_meters : 0)) || 0;
  const att1Shade = firstPiece?.attachment1_shade || sb.attachment_fabric1_shade || null;
  if (att1Rate > 0 && isValidAttachmentFabric(att1Name, att1Code, att1Id)) {
    fabricRowsList.push({
      role: 'ATTACHMENT 1',
      badgeBg: '#4338ca',
      code: att1Code || (att1Id ? `FAB-${att1Id}` : 'ATT-1'),
      name: att1Name || 'Attachment Fabric 1',
      shade: att1Shade,
      ratePerPc: att1Rate,
    });
  }

  const att2Id = firstPiece?.attachment2_id || sb.attachment_fabric2_id || null;
  const att2Name = firstPiece?.attachment2_name || sb.attachment_fabric2_name || null;
  const att2Code = firstPiece?.attachment2_code || sb.attachment_fabric2_code || null;
  const att2Rate = Number(firstPiece?.attachment2_length || firstPiece?.attachment2_meters || (sb.attachment_fabric2_id ? sb.attachment_fabric2_meters : 0)) || 0;
  const att2Shade = firstPiece?.attachment2_shade || sb.attachment_fabric2_shade || null;
  if (att2Rate > 0 && isValidAttachmentFabric(att2Name, att2Code, att2Id)) {
    fabricRowsList.push({
      role: 'ATTACHMENT 2',
      badgeBg: '#7c3aed',
      code: att2Code || (att2Id ? `FAB-${att2Id}` : 'ATT-2'),
      name: att2Name || 'Attachment Fabric 2',
      shade: att2Shade,
      ratePerPc: att2Rate,
    });
  }

  const materialsRowsHtml = fabricRowsList.map((item) => {
    const net = (jc.quantity * item.ratePerPc).toFixed(2);
    const safety = (parseFloat(net) * 0.10).toFixed(2);
    const total = (parseFloat(net) * 1.10).toFixed(2);
    return `
      <tr>
        <td>
          <span style="background: ${item.badgeBg}; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.05em;">${item.role}</span>
        </td>
        <td style="font-family: monospace; font-weight: 800; color: #0f172a;">${item.code}</td>
        <td>
          <strong>${item.name}</strong>
          ${item.shade ? `<span style="font-size: 9px; color: #64748b; font-weight: 500;">(${item.shade})</span>` : ''}
        </td>
        <td style="font-weight: 700;">${item.ratePerPc} m / pc</td>
        <td>${net} meters</td>
        <td>+${safety} meters</td>
        <td><strong style="color: #047857; font-size: 11.5px;">${total} meters</strong></td>
        <td style="color: #64748b;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ] m</td>
      </tr>
    `;
  }).join('');


  let measurementsTableHtml = '';

  if (childPieces.length > 0 && (hasEntities || isCustomBespoke)) {
    const rows = childPieces.map((p, idx) => {
      const dressMeasurements = extractDressMeasurements(p.custom_measurements, jc);
      const measStr = dressMeasurements.length > 0
        ? dressMeasurements.map(m => `${m.label}: ${m.value}`).join(' • ')
        : (p.size ? `US Standard Size ${p.size}` : 'Standard Specification');

      const pieceLabel = p.notes?.includes('Piece')
        ? p.notes
        : `Piece ${idx + 1} of ${childPieces.length}`;

      return `
        <tr>
          <td style="font-family: monospace; font-weight: bold; color: #64748b; text-align: center;">#${String(p.sequence_no || idx + 1).padStart(3, '0')}</td>
          <td>
            <strong style="color: #0f172a; font-size: 11px;">${p.member_name || 'Bespoke Recipient'}</strong>
          </td>
          <td style="font-family: monospace; color: #b45309; font-weight: bold;">${p.admission_no || '--'}</td>
          <td style="font-family: monospace; font-size: 9.5px; font-weight: 800; color: #2563eb;">${p.barcode}</td>
          <td>
            <span style="font-size: 8.5px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block;">
              ${pieceLabel}
            </span>
          </td>
          <td>
            <div style="font-size: 9.5px; color: #0f172a; font-weight: 600;">${measStr}</div>
            ${p.notes && !p.notes.includes('Piece') ? `<div style="font-size: 8.5px; color: #64748b; font-style: italic;">Note: ${p.notes}</div>` : ''}
          </td>
          <td style="text-align: center; color: #94a3b8; font-size: 9px;">[ &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
        </tr>
      `;
    }).join('');

    measurementsTableHtml = `
      <table class="bom-table">
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">#</th>
            <th style="width: 22%;">Recipient Entity Name</th>
            <th style="width: 14%;">Roll / Admission ID</th>
            <th style="width: 18%;">Piece Barcode</th>
            <th style="width: 12%;">Piece / Unit</th>
            <th style="width: 20%;">Tailored Garment Dimensions</th>
            <th style="width: 9%; text-align: center;">Floor Sign</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  } else {
    // Standard US Size Breakdown
    const metaKeys = new Set([
      'fabric_id', 'fabric_name', 'design_number', 'sam_value', 
      'is_manual', 'main_fabric_meters', 'required_fabric_meters', 
      'available_fabric_meters', 'measurement_readiness', 'material_readiness', 
      'pending_measurements', 'is_set', 'products'
    ]);

    const VALID_STANDARD_SIZES = new Set([
      'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL', '6XL',
      '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54',
      'SHORT', 'REGULAR', 'LONG', 'EXTRA LONG', 'STANDARD', 'CUSTOM', 'FREE SIZE', 'OS'
    ]);

    const isSizeKey = (k: string) => {
      const clean = k.trim().toUpperCase();
      if (VALID_STANDARD_SIZES.has(clean)) return true;
      if (/^\d{2}$/.test(clean)) {
        const n = parseInt(clean, 10);
        return n >= 20 && n <= 60;
      }
      const lower = k.toLowerCase();
      if (
        lower.includes('_') ||
        lower.includes('id') ||
        lower.includes('name') ||
        lower.includes('code') ||
        lower.includes('fabric') ||
        lower.includes('button') ||
        lower.includes('thread') ||
        lower.includes('sam') ||
        lower.includes('meter') ||
        lower.includes('price') ||
        lower.includes('qty') ||
        lower.includes('quantity') ||
        lower.includes('total') ||
        lower.includes('rate') ||
        lower.includes('readiness') ||
        lower.includes('status') ||
        lower.includes('count') ||
        lower.includes('design') ||
        lower.includes('dept') ||
        lower.includes('department')
      ) {
        return false;
      }
      return false;
    };

    const sizeMap: Record<string, number> = {};
    if (jc.size_breakdown) {
      Object.entries(jc.size_breakdown).forEach(([k, v]) => {
        if (isSizeKey(k)) {
          const qty = parseInt(String(v), 10);
          if (!isNaN(qty) && qty > 0) {
            sizeMap[k.toUpperCase()] = qty;
          }
        }
      });
    }

    if (Object.keys(sizeMap).length === 0 && childPieces.length > 0) {
      childPieces.forEach(p => {
        const sz = (p.size || 'M').toUpperCase();
        sizeMap[sz] = (sizeMap[sz] || 0) + 1;
      });
    }

    if (Object.keys(sizeMap).length === 0) {
      sizeMap['STANDARD'] = jc.quantity;
    }

    const cardNames = [
      jc.size_breakdown?.product_name,
      jc.item_name,
      jc.size_breakdown?.product_type_name,
      jc.size_breakdown?.category
    ]
      .filter(Boolean)
      .map(s => String(s).toLowerCase().trim());
    const topKeywords = ['shirt', 't-shirt', 'tshirt', 't shirt', 'polo', 'shirting', 'top', 'kurti', 'blazer', 'coat', 'jacket', 'hoodie', 'sweater', 'vest', 'waistcoat'];
    const bottomKeywords = ['pant', 'pants', 'trouser', 'trousers', 'suiting', 'bottom', 'skirt', 'salwar', 'short', 'shorts', 'track pant', 'cargo'];
    const isCardTop = cardNames.some(cn => topKeywords.some(kw => cn.includes(kw)));
    const isCardBottom = cardNames.some(cn => bottomKeywords.some(kw => cn.includes(kw)));

    const standardChartSpecs: Record<string, Record<string, string>> = {
      'chest': { 'xs': '32-34 in', 's': '35-37 in', 'm': '38-40 in', 'l': '41-43 in', 'xl': '44-46 in', 'xxl': '47-49 in' },
      'waist': { 'xs': '71–76 cm', 's': '76–81 cm', 'm': '81–86 cm', 'l': '86–91 cm', 'xl': '91–96 cm', 'xxl': '96–101 cm' }
    };

    const rows = Object.entries(sizeMap).map(([size, count]) => {
      const pct = Math.round((count / (jc.quantity || 1)) * 100);
      const sizeLower = size.toLowerCase().trim();
      let patternSpec = 'Standard US Block • Grade A';
      if (isCardTop && standardChartSpecs['chest']?.[sizeLower]) {
        patternSpec = `US Standard • Chest: ${standardChartSpecs['chest'][sizeLower]}`;
      } else if (isCardBottom && standardChartSpecs['waist']?.[sizeLower]) {
        patternSpec = `US Standard • Waist: ${standardChartSpecs['waist'][sizeLower]}`;
      }
      return `
        <tr>
          <td><span style="background: #0f172a; color: #fff; font-weight: 900; font-size: 11px; padding: 2px 8px; border-radius: 4px;">${size}</span></td>
          <td><strong style="font-size: 11.5px; color: #0f172a;">${count} pcs</strong></td>
          <td style="color: #64748b; font-weight: 600;">${pct}% of Lot</td>
          <td><span style="font-size: 9.5px; color: #334155; font-weight: 600;">${patternSpec}</span></td>
          <td style="font-family: monospace; font-size: 9.5px; color: #2563eb;">BRC-${String(jc.id).slice(-4)}-SZ${size.replace(/[^A-Z0-9]/gi, '')}-*</td>
        </tr>
      `;
    }).join('');

    measurementsTableHtml = `
      <table class="bom-table">
        <thead>
          <tr>
            <th style="width: 14%;">Size Tag</th>
            <th style="width: 16%;">Quantity</th>
            <th style="width: 18%;">Lot Ratio</th>
            <th style="width: 26%;">Grading Pattern Specs</th>
            <th style="width: 26%;">Piece Barcode Series</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Job Card — ${jc.job_card_no}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
    }
    .sheet {
      border: 2px solid #0f172a;
      padding: 16px 20px;
      border-radius: 8px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #0f172a;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      margin-top: 2px;
    }
    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .barcode-section {
      text-align: center;
      padding: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .barcode-num {
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 3px;
      margin-top: 4px;
      color: #0f172a;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .info-label {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
      word-break: break-word;
    }
    .bom-box {
      border: 1px solid #0f172a;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 12px;
      background: #ffffff;
    }
    .box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
    }
    .bom-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .bom-table th {
      text-align: left;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      color: #475569;
      padding: 4px 6px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .bom-table td {
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
    }
    .stages-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5px;
    }
    .stages-table th {
      background: #0f172a;
      color: #ffffff;
      text-transform: uppercase;
      font-size: 8.5px;
      font-weight: 800;
      padding: 6px 8px;
      border: 1px solid #0f172a;
      text-align: left;
    }
    .stages-table td {
      border: 1px solid #94a3b8;
      padding: 8px 8px;
      vertical-align: top;
      height: 48px;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 12px;
    }
    .sign-box {
      border: 1px dashed #64748b;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
      min-height: 65px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sign-box-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
    }
    .sign-box-caption {
      font-size: 8px;
      color: #64748b;
      border-top: 1px solid #cbd5e1;
      padding-top: 3px;
    }
    .footer-note {
      margin-top: 10px;
      font-size: 8px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <h1 class="brand-title">FORMA APPARELS</h1>
          <div class="brand-subtitle">Central Factory Unit • Production &amp; Quality Management</div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <span class="doc-badge">Production Travel Card</span>
          <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Printed: ${printDate}</div>
        </td>
      </tr>
    </table>

    <!-- Barcode Section -->
    <div class="barcode-section">
      ${barcodeSVG}
      <div class="barcode-num">${jc.job_card_no}</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Scan for shop floor stage validation, cutting batching &amp; QC sign-off</div>
    </div>

    <!-- Core Identifiers Grid -->
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">Order Number</div>
        <div class="info-value" style="font-family: monospace; color: #2563eb;">${orderNo}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Organization / Client</div>
        <div class="info-value" style="font-size: 11px;">${orgName}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Garment Item</div>
        <div class="info-value" style="color: #0f172a;">${jc.item_name}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Target Quantity</div>
        <div class="info-value" style="color: #047857;">${jc.quantity} PCS</div>
      </div>
    </div>

    <div class="info-grid" style="margin-top: -4px;">
      <div class="info-card">
        <div class="info-label">Design Number (DNS)</div>
        <div class="info-value" style="font-family: monospace;">${jc.design_number || 'DNS-STANDARD'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Quotation Ref</div>
        <div class="info-value">${quoteNo}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Department / Class</div>
        <div class="info-value" style="font-size: 11px; color: #0f172a;">${jc.size_breakdown?.department_name || jc.size_breakdown?.department_id || 'Institutional Lot'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">PO Handler Status</div>
        <div class="info-value" style="color: #059669;">${jc.po_handler_action || 'Approved / Active'}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Readiness Gate</div>
        <div class="info-value" style="color: ${jc.measurement_readiness === 'Ready' && jc.size_breakdown?.material_readiness !== 'Awaiting PO Fabric' ? '#047857' : '#b45309'}; font-size: 11px;">
          ${jc.measurement_readiness || 'Verified'} • ${jc.size_breakdown?.material_readiness || 'Fabric Ready'}
        </div>
      </div>
    </div>

    <!-- Product Measurements & Sizing Breakdown / Recipient Entities Manifest -->
    <div class="bom-box">
      <div class="box-title">
        <span>${hasEntities ? 'Recipient Entities &amp; Individual Tailoring Roster' : 'Product Sizing &amp; Measurement Specifications'}</span>
        <span style="color: ${hasEntities ? '#0284c7' : isCustomBespoke ? '#b45309' : '#2563eb'}; font-weight: 800;">
          ${hasEntities ? `${childPieces.length} Garment Units • Entity-Allocated Lot` : isCustomBespoke ? 'Custom Entity Bespoke Fitting' : 'Standard US Sizing Matrix'}
        </span>
      </div>
      ${measurementsTableHtml}
    </div>

    <!-- Fabric & Material Allocation -->
    <div class="bom-box">
      <div class="box-title">
        <span>Raw Material &amp; Cutting Floor Allocation (Main &amp; Attachment Fabrics)</span>
        <span style="color: #047857; font-weight: 800;">10% Safety Margin Enforced</span>
      </div>
      <table class="bom-table">
        <thead>
          <tr>
            <th style="width: 14%;">Fabric Role</th>
            <th style="width: 14%;">Fabric # / Code</th>
            <th style="width: 26%;">Fabric Description</th>
            <th style="width: 11%;">BOM Rate / Pc</th>
            <th style="width: 11%;">Net Required</th>
            <th style="width: 12%;">Safety (+10%)</th>
            <th style="width: 12%;">Total Issued</th>
            <th style="width: 10%;">Cut Return</th>
          </tr>
        </thead>
        <tbody>
          ${materialsRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 5-Stage Production Flow Checklist -->
    <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; color: #0f172a;">
      Production Stages Checklist &amp; Quality Sign-off
    </div>
    <table class="stages-table">
      <thead>
        <tr>
          <th style="width: 20%;">Stage 1: Cutting</th>
          <th style="width: 20%;">Stage 2: Stitching</th>
          <th style="width: 20%;">Stage 3: Finishing</th>
          <th style="width: 20%;">Stage 4: QC &amp; Inspection</th>
          <th style="width: 20%;">Stage 5: Packing</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div>Batch Size: _________</div>
            <div>Layers/Lump: ________</div>
            <div style="margin-top: 8px;">Date: ____/____/2026</div>
            <div>Sign: _______________</div>
          </td>
          <td>
            <div>Line / Floor: ________</div>
            <div>Operator ID: ________</div>
            <div style="margin-top: 8px;">Date: ____/____/2026</div>
            <div>Sign: _______________</div>
          </td>
          <td>
            <div>Kaaj / Button: [ &nbsp; ]</div>
            <div>Ironing / Trim: [ &nbsp; ]</div>
            <div style="margin-top: 8px;">Date: ____/____/2026</div>
            <div>Sign: _______________</div>
          </td>
          <td>
            <div>Passed: ______ pcs</div>
            <div>Alteration: ____ pcs</div>
            <div style="margin-top: 8px; font-weight: bold; color: #047857;">[ &nbsp; ] QC PASSED</div>
            <div>Inspector: ___________</div>
          </td>
          <td>
            <div>Carton Box #: _______</div>
            <div>Pack Count: _____ pcs</div>
            <div style="margin-top: 8px;">Transfer DC #: ______</div>
            <div>Sign: _______________</div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Sign-off Authorities -->
    <div class="sign-grid">
      <div class="sign-box">
        <span class="sign-box-title">Factory PO Handler</span>
        <span class="sign-box-caption">Authorized Production Release</span>
      </div>
      <div class="sign-box">
        <span class="sign-box-title">Production Coordinator / Floor Supervisor</span>
        <span class="sign-box-caption">Floor Allocation &amp; Assembly Verification</span>
      </div>
      <div class="sign-box">
        <span class="sign-box-title">Quality Assurance Inspector</span>
        <span class="sign-box-caption">Final Audit &amp; Dispatch Clearance Stamp</span>
      </div>
    </div>

    <div class="footer-note">
      Forma Apparels ERP — Production Floor Document • Barcodes encoded according to Code 39 Industrial Standard • This traveler must accompany the garment lot across all 5 production stages.
    </div>
  </div>
</body>
</html>`;
}

export interface FabricSpecItem {
  role: string;
  code: string;
  number?: string;
  name: string;
  length?: number | string;
  meters?: number | string;
  shade?: string | null;
}

export interface ChildJobCardData {
  id: number;
  child_card_no: string;
  job_card_id: number;
  barcode: string;
  item_type: 'standard' | 'custom' | string;
  size?: string;
  member_id?: number | null;
  member_name?: string | null;
  admission_no?: string | null;
  custom_measurements?: Record<string, any>;
  sequence_no: number;
  stage: string;
  status: string;
  notes?: string | null;
  // Main Fabric
  fabric_code?: string;
  fabric_name?: string;
  fabric_length?: number | string;
  fabric_meters?: number | string;
  fabric_shade?: string;
  // Attachment Fabric 1
  attachment1_id?: string | number | null;
  attachment1_name?: string | null;
  attachment1_code?: string | null;
  attachment1_number?: string | null;
  attachment1_length?: number | string | null;
  attachment1_meters?: number | string | null;
  attachment1_shade?: string | null;
  // Attachment Fabric 2
  attachment2_id?: string | number | null;
  attachment2_name?: string | null;
  attachment2_code?: string | null;
  attachment2_number?: string | null;
  attachment2_length?: number | string | null;
  attachment2_meters?: number | string | null;
  attachment2_shade?: string | null;
  // All Fabrics List
  fabrics?: FabricSpecItem[];
  sub_job_cards?: {
    id: number;
    sub_card_no: string;
    stage: string;
    assigned_to?: string;
  } | null;
}

export function compileGarmentStickersHTML(
  childCards: ChildJobCardData[],
  jc: JobCardPrintData
): string {
  const orgName =
    jc.orders?.quotations?.organizations?.name ||
    jc.orders?.quotations?.title ||
    'Institutional Client';
  const orderNo = jc.orders?.order_no || `ORD-${jc.order_id}`;
  const totalCards = childCards.length;

  const stickersHtml = childCards
    .map((card, idx) => {
      const barcodeSVG = generateInlineBarcodeSVG(card.barcode, 46, 1.6);
      const isCustom = card.item_type === 'custom';

      // Parse custom measurements strictly for this garment/dress
      let measSummary = '';
      if (isCustom && card.custom_measurements) {
        const dressMeasurements = extractDressMeasurements(card.custom_measurements, jc);
        measSummary = dressMeasurements.slice(0, 4).map(m => `${m.label}: ${m.value}`).join(' • ');
      }

      // Resolve Main Fabric details
      const fMeta = card.custom_measurements?._fabric || {};
      const mainMeta = fMeta.main || {};
      const cardFabricCode =
        card.fabric_code ||
        mainMeta.code ||
        fMeta.code ||
        jc.size_breakdown?.fabric_code ||
        (jc.size_breakdown?.fabric_id ? `FAB-${jc.size_breakdown.fabric_id}` : 'FAB-STD');
      const cardFabricName =
        card.fabric_name ||
        mainMeta.name ||
        fMeta.name ||
        jc.size_breakdown?.fabric_name ||
        'Production Fabric';
      const cardFabricMeters =
        card.fabric_length ||
        card.fabric_meters ||
        mainMeta.length ||
        fMeta.length ||
        jc.size_breakdown?.main_fabric_meters ||
        '1.25';

      // Resolve Attachment Fabric 1 details
      const att1Meta = fMeta.attachment1 || null;
      const att1Code = card.attachment1_code || att1Meta?.code || jc.size_breakdown?.attachment_fabric1_code || null;
      const att1Name = card.attachment1_name || att1Meta?.name || jc.size_breakdown?.attachment_fabric1_name || null;
      const att1Length = card.attachment1_length || card.attachment1_meters || att1Meta?.length || jc.size_breakdown?.attachment_fabric1_meters || null;

      // Resolve Attachment Fabric 2 details
      const att2Meta = fMeta.attachment2 || null;
      const att2Code = card.attachment2_code || att2Meta?.code || jc.size_breakdown?.attachment_fabric2_code || null;
      const att2Name = card.attachment2_name || att2Meta?.name || jc.size_breakdown?.attachment_fabric2_name || null;
      const att2Length = card.attachment2_length || card.attachment2_meters || att2Meta?.length || jc.size_breakdown?.attachment_fabric2_meters || null;

      // Fallback standard chart specs for dimension resolution
      const standardChartSpecs: Record<string, Record<string, string>> = {
        'chest (to fit)': { 'xs': '32-34 in', 's': '35-37 in', 'm': '38-40 in', 'l': '41-43 in', 'xl': '44-46 in', 'xxl': '47-49 in' },
        'body length': { 'short': '26-27 in', 'standard': '28-29 in', 'long': '30-31 in' },
        'waist (to fit)': { 'xs': '71–76 cm', 's': '76–81 cm', 'm': '81–86 cm', 'l': '86–91 cm', 'xl': '91–96 cm', 'xxl': '96–101 cm' },
        'leg length': { 'short': '74–76 cm', 'standard': '79–81 cm', 'long': '84–86 cm', 'extra long': '89–91 cm' }
      };

      let standardDimension = '';
      if (!isCustom) {
        const sz = (card.size || 'M').toLowerCase().trim();
        const itemNameLower = (jc.item_name || '').toLowerCase();
        const isTop = ['shirt', 't-shirt', 'tshirt', 'polo', 'jacket', 'top', 'blazer'].some(k => itemNameLower.includes(k));
        const isBottom = ['pant', 'pants', 'trouser', 'trousers', 'short', 'skirt'].some(k => itemNameLower.includes(k));
        if (isTop) {
          standardDimension = standardChartSpecs['chest (to fit)']?.[sz] || '';
        } else if (isBottom) {
          standardDimension = standardChartSpecs['waist (to fit)']?.[sz] || '';
        }
      }

      return `
      <div class="sticker-card">
        <div class="sticker-top">
          <div class="brand-row">
            <span class="sticker-logo">FORMA</span>
            <span class="sticker-tag-badge">${isCustom ? 'CUSTOM BESPOKE' : 'STANDARD US SIZE'}</span>
          </div>
          <span class="sticker-seq">#${String(idx + 1).padStart(3, '0')} / ${totalCards}</span>
        </div>

        <div class="item-name-row">
          <div class="item-title">${jc.item_name}</div>
          <div class="order-ref">${orderNo} • ${orgName}</div>
        </div>

        ${
          isCustom
            ? `
          <div class="custom-entity-box">
            <div class="entity-name">${card.member_name || 'Recipient'}</div>
            <div class="entity-id">${card.admission_no || `ID #${card.member_id || idx + 1}`}</div>
            ${card.size && card.size !== 'Custom' ? `<div style="font-size: 9.5px; font-weight: 800; color: #4338ca; margin-top: 2px;">Sizing: ${card.size}</div>` : ''}
            ${measSummary ? `<div class="entity-meas">${measSummary}</div>` : ''}
            ${card.notes ? `<div class="entity-notes">Note: ${card.notes}</div>` : ''}
          </div>
        `
            : `
          <div class="standard-size-box">
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span class="size-label">SIZE</span>
                <span class="size-value">${card.size || 'M'}</span>
              </div>
              ${standardDimension ? `<span style="font-size: 8.5px; font-weight: 700; color: #4b5563; margin-top: 1px;">(${standardDimension})</span>` : ''}
            </div>
          </div>
        `
        }

        <!-- Required Fabric Specifications (Main & Attachments) -->
        <div class="fabric-container-box">
          <div class="fabric-row-item">
            <div class="fabric-tag-box">
              <span class="fabric-role-tag main-role">MAIN</span>
              <span class="fabric-code-chip">${cardFabricCode}</span>
              <span class="fabric-name-chip" title="${cardFabricName}">${cardFabricName}</span>
            </div>
            <span class="fabric-len-chip">${parseFloat(String(cardFabricMeters)).toFixed(2)}m</span>
          </div>
          ${isValidAttachmentFabric(att1Name, att1Code) && parseFloat(String(att1Length || 0)) > 0 ? `
          <div class="fabric-row-item">
            <div class="fabric-tag-box">
              <span class="fabric-role-tag att-role">ATT 1</span>
              <span class="fabric-code-chip att-chip">${att1Code || 'ATT-1'}</span>
              <span class="fabric-name-chip" title="${att1Name || 'Attachment 1'}">${att1Name || 'Attachment Fabric 1'}</span>
            </div>
            <span class="fabric-len-chip att-len">${parseFloat(String(att1Length)).toFixed(2)}m</span>
          </div>
          ` : ''}
          ${isValidAttachmentFabric(att2Name, att2Code) && parseFloat(String(att2Length || 0)) > 0 ? `
          <div class="fabric-row-item">
            <div class="fabric-tag-box">
              <span class="fabric-role-tag att-role">ATT 2</span>
              <span class="fabric-code-chip att-chip">${att2Code || 'ATT-2'}</span>
              <span class="fabric-name-chip" title="${att2Name || 'Attachment 2'}">${att2Name || 'Attachment Fabric 2'}</span>
            </div>
            <span class="fabric-len-chip att-len">${parseFloat(String(att2Length)).toFixed(2)}m</span>
          </div>
          ` : ''}
        </div>

        <div class="barcode-container">
          <div class="barcode-svg">${barcodeSVG}</div>
          <div class="barcode-text">${card.barcode}</div>
        </div>

        <div class="sticker-footer">
          <span>JC: ${jc.job_card_no}</span>
          <span>ORD: ${orderNo}</span>
          <span>${card.sub_job_cards?.sub_card_no || 'Unbatched'}</span>
          <span>Stage: ${card.stage || 'Cutting'}</span>
        </div>
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Garment Barcode Stickers - ${jc.job_card_no}</title>
  <style>
    @page {
      size: auto;
      margin: 4mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4f4f5;
      padding: 12px;
      color: #09090b;
    }
    .stickers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .sticker-card {
      background: #ffffff;
      border: 1.5px solid #18181b;
      border-radius: 8px;
      padding: 10px 12px;
      position: relative;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 220px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .sticker-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e4e4e7;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sticker-logo {
      font-weight: 900;
      font-size: 11px;
      letter-spacing: 0.15em;
      color: #09090b;
    }
    .sticker-tag-badge {
      font-size: 7.5px;
      font-weight: 800;
      background: #09090b;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .sticker-seq {
      font-size: 9px;
      font-family: "Courier New", monospace;
      font-weight: bold;
      color: #71717a;
    }
    .item-name-row {
      margin-bottom: 6px;
    }
    .item-title {
      font-size: 13px;
      font-weight: 900;
      color: #09090b;
      line-height: 1.2;
    }
    .order-ref {
      font-size: 9px;
      color: #71717a;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .standard-size-box {
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 4px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .size-label {
      font-size: 9px;
      font-weight: 800;
      color: #71717a;
      letter-spacing: 0.1em;
    }
    .size-value {
      font-size: 18px;
      font-weight: 900;
      color: #09090b;
      line-height: 1;
    }
    .custom-entity-box {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 6px;
      padding: 5px 8px;
      margin-bottom: 6px;
    }
    .entity-name {
      font-size: 12px;
      font-weight: 900;
      color: #09090b;
    }
    .entity-id {
      font-size: 9.5px;
      font-weight: bold;
      color: #ca8a04;
      font-family: "Courier New", monospace;
    }
    .entity-meas {
      font-size: 8.5px;
      font-weight: 600;
      color: #52525b;
      margin-top: 2px;
      text-transform: capitalize;
    }
    .entity-notes {
      font-size: 8px;
      font-style: italic;
      color: #71717a;
      margin-top: 1px;
    }
    .fabric-container-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 4px 6px;
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .fabric-row-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 5px;
    }
    .fabric-tag-box {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .fabric-role-tag {
      font-size: 7px;
      font-weight: 900;
      padding: 1px 3px;
      border-radius: 2px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .fabric-role-tag.main-role {
      background: #0f172a;
      color: #ffffff;
    }
    .fabric-role-tag.att-role {
      background: #4338ca;
      color: #ffffff;
    }
    .fabric-code-chip {
      background: #0f172a;
      color: #ffffff;
      font-family: "Courier New", monospace;
      font-size: 8px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: 0.05em;
      flex-shrink: 0;
    }
    .fabric-code-chip.att-chip {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
    }
    .fabric-name-chip {
      font-size: 8.5px;
      font-weight: 700;
      color: #334155;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 140px;
    }
    .fabric-len-chip {
      font-size: 8.5px;
      font-weight: 800;
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .fabric-len-chip.att-len {
      color: #4338ca;
      background: #eef2ff;
      border-color: #c7d2fe;
    }
    .barcode-container {
      text-align: center;
      margin: 2px 0 4px 0;
    }
    .barcode-svg {
      display: flex;
      justify-content: center;
      overflow: hidden;
    }
    .barcode-text {
      font-family: "Courier New", monospace;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 0.12em;
      color: #09090b;
      margin-top: 2px;
    }
    .sticker-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed #d4d4d8;
      padding-top: 4px;
      font-size: 8px;
      color: #71717a;
      font-weight: 700;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .stickers-grid {
        max-width: 100%;
        gap: 8px;
      }
      .sticker-card {
        border-color: #000000;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="stickers-grid">
    ${stickersHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;
}

export function compilePersonWiseTravelerSheetsHTML(
  childCards: ChildJobCardData[],
  jc: JobCardPrintData
): string {
  const orgName =
    jc.orders?.quotations?.organizations?.name ||
    jc.orders?.quotations?.title ||
    'Institutional Client';
  const orderNo = jc.orders?.order_no || `ORD-${jc.order_id}`;
  const quoteNo = jc.orders?.quotations?.quotation_no || '—';
  const fabricName = jc.size_breakdown?.fabric_name || 'Standard Production Mill Fabric';
  const parentBarcodeSVG = generateInlineBarcodeSVG(jc.job_card_no, 42, 1.4);

  // Group child pieces by person (or by standard size if standard mode)
  const isCustomMode =
    childCards.some((c) => c.item_type === 'custom') ||
    childCards.some((c) => Boolean(c.member_name)) ||
    Boolean(jc.size_breakdown?.is_custom);

  let sheetsHtml = '';

  if (isCustomMode) {
    // Group pieces by member_id / member_name
    const memberGroups: Record<string, ChildJobCardData[]> = {};
    childCards.forEach((c) => {
      const key = String(c.member_id || c.member_name || c.admission_no || c.id);
      if (!memberGroups[key]) memberGroups[key] = [];
      memberGroups[key].push(c);
    });

    sheetsHtml = Object.values(memberGroups)
      .map((pieces, groupIdx) => {
        const first = pieces[0];
        const memberName = first.member_name || 'Bespoke Recipient';
        const admissionNo = first.admission_no || `#${first.member_id || groupIdx + 1}`;
        const totalPiecesForMember = pieces.length;
        const mainPieceBarcode = first.barcode;
        const pieceBarcodeSVG = generateInlineBarcodeSVG(mainPieceBarcode, 48, 1.6);

        // Resolve all fabric specifications (Main Fabric & Attachment Fabrics)
        const fMeta = first.custom_measurements?._fabric || {};
        const mainMeta = fMeta.main || {};
        const mainCode =
          first.fabric_code ||
          mainMeta.code ||
          fMeta.code ||
          jc.size_breakdown?.fabric_code ||
          (jc.size_breakdown?.fabric_id ? `FAB-${jc.size_breakdown.fabric_id}` : 'FAB-STD');
        const mainName =
          first.fabric_name ||
          mainMeta.name ||
          fMeta.name ||
          jc.size_breakdown?.fabric_name ||
          fabricName;
        const mainMeters =
          first.fabric_length ||
          first.fabric_meters ||
          mainMeta.length ||
          fMeta.length ||
          jc.size_breakdown?.main_fabric_meters ||
          '1.25';
        const mainShade =
          first.fabric_shade ||
          mainMeta.shade ||
          fMeta.shade ||
          jc.size_breakdown?.shade ||
          null;

        const att1Meta = fMeta.attachment1 || null;
        const att1Code = first.attachment1_code || att1Meta?.code || jc.size_breakdown?.attachment_fabric1_code || null;
        const att1Name = first.attachment1_name || att1Meta?.name || jc.size_breakdown?.attachment_fabric1_name || null;
        const att1Length = first.attachment1_length || first.attachment1_meters || att1Meta?.length || jc.size_breakdown?.attachment_fabric1_meters || null;
        const att1Shade = first.attachment1_shade || att1Meta?.shade || jc.size_breakdown?.attachment_fabric1_shade || null;

        const att2Meta = fMeta.attachment2 || null;
        const att2Code = first.attachment2_code || att2Meta?.code || jc.size_breakdown?.attachment_fabric2_code || null;
        const att2Name = first.attachment2_name || att2Meta?.name || jc.size_breakdown?.attachment_fabric2_name || null;
        const att2Length = first.attachment2_length || first.attachment2_meters || att2Meta?.length || jc.size_breakdown?.attachment_fabric2_meters || null;
        const att2Shade = first.attachment2_shade || att2Meta?.shade || jc.size_breakdown?.attachment_fabric2_shade || null;

        // Format body measurements strictly for this garment/dress
        const flatMeas = extractDressMeasurements(first.custom_measurements, jc);

        // Generate Piece Checkboxes
        const pieceChecklist = pieces
          .map((p, pIdx) => {
            return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="font-weight: 800; color: #0f172a; padding: 6px 8px;">Piece #${pIdx + 1} of ${totalPiecesForMember}</td>
              <td style="font-family: monospace; font-size: 10px; color: #2563eb; padding: 6px 8px;">${p.barcode}</td>
              <td style="padding: 6px 8px; font-size: 9.5px; color: #334155;">
                <label style="margin-right: 12px;"><input type="checkbox" /> Cutting</label>
                <label style="margin-right: 12px;"><input type="checkbox" /> Stitching</label>
                <label style="margin-right: 12px;"><input type="checkbox" /> Kaaj / Buttons</label>
                <label style="margin-right: 12px; font-weight: bold; color: #047857;"><input type="checkbox" /> QC Passed</label>
              </td>
            </tr>
          `;
          })
          .join('');

        return `
        <div class="person-sheet">
          <!-- Sheet Header -->
          <div class="sheet-header">
            <div>
              <div class="brand-title">FORMA APPARELS</div>
              <div class="brand-subtitle">Individual Garment Production Work Traveler</div>
              <div class="order-ref-text">Order: <strong>${orderNo}</strong> • Quote: <strong>${quoteNo}</strong> • Client: <strong>${orgName}</strong></div>
            </div>
            <div class="parent-barcode-box">
              <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 2px;">Main Job Card Barcode</div>
              <div class="svg-wrap">${parentBarcodeSVG}</div>
              <div class="barcode-num">${jc.job_card_no}</div>
            </div>
          </div>

          <!-- Recipient Banner & Hero Piece Count -->
          <div class="recipient-banner">
            <div class="recipient-info">
              <span class="banner-tag">CUSTOM BESPOKE RECIPIENT</span>
              <h2 class="recipient-name">${memberName}</h2>
              <div class="recipient-meta">Roll / Employee ID: <strong>${admissionNo}</strong> • Organization: <strong>${orgName}</strong></div>
            </div>
            <div class="piece-count-box">
              <div class="piece-count-label">Number of Pieces</div>
              <div class="piece-count-value">${totalPiecesForMember} <span style="font-size: 13px; font-weight: 700;">PCS</span></div>
              <div class="piece-count-sub">One Traveler Bundle</div>
            </div>
          </div>

          <!-- Piece Barcode Hero -->
          <div class="piece-barcode-hero">
            <div class="hero-barcode-svg">${pieceBarcodeSVG}</div>
            <div class="hero-barcode-text">${mainPieceBarcode}</div>
            <div class="hero-barcode-caption">Scan at Sewing Line &amp; Workstations for Garment Bundle Check-in</div>
          </div>

          <!-- Garment & Order Specs -->
          <div class="spec-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 8px;">
            <div class="spec-item">
              <span class="spec-label">Garment Item</span>
              <span class="spec-value">${jc.item_name}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Design / DNS Code</span>
              <span class="spec-value" style="font-family: monospace;">${jc.design_number || 'DNS-STANDARD'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Parent Job Card</span>
              <span class="spec-value" style="font-family: monospace; color: #4f46e5; font-weight: 800;">${jc.job_card_no}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Sales Order Ref</span>
              <span class="spec-value" style="font-family: monospace; color: #2563eb; font-weight: 800;">${orderNo}</span>
            </div>
          </div>

          <!-- Fabric & Material Specifications (Main & Attachment Fabrics) -->
          <div class="section-title" style="margin-top: 6px; margin-bottom: 4px;">Fabric Specifications &amp; Material Cut Lengths (Main &amp; Attachments)</div>
          <table class="bom-table" style="margin-bottom: 10px; width: 100%;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="width: 24%; text-align: left;">Fabric Role / Component</th>
                <th style="width: 20%; text-align: left;">Fabric Number / Code</th>
                <th style="width: 36%; text-align: left;">Fabric Name</th>
                <th style="width: 20%; text-align: right;">Cut Length per Piece</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style="background: #0f172a; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">MAIN FABRIC</span></td>
                <td style="font-family: monospace; font-weight: 800; color: #0f172a;">${mainCode}</td>
                <td style="font-weight: 700; color: #1e293b;">${mainName}${mainShade ? ` <span style="font-size: 8.5px; color: #64748b; font-weight: 500;">(${mainShade})</span>` : ''}</td>
                <td style="text-align: right; font-weight: 800; color: #047857;">${parseFloat(String(mainMeters)).toFixed(2)} meters / pc</td>
              </tr>
              ${isValidAttachmentFabric(att1Name, att1Code) && parseFloat(String(att1Length || 0)) > 0 ? `
              <tr>
                <td><span style="background: #4338ca; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">ATTACHMENT 1</span></td>
                <td style="font-family: monospace; font-weight: 800; color: #4338ca;">${att1Code || 'ATT-1'}</td>
                <td style="font-weight: 700; color: #1e293b;">${att1Name}${att1Shade ? ` <span style="font-size: 8.5px; color: #64748b; font-weight: 500;">(${att1Shade})</span>` : ''}</td>
                <td style="text-align: right; font-weight: 800; color: #4338ca;">${parseFloat(String(att1Length)).toFixed(2)} meters / pc</td>
              </tr>
              ` : ''}
              ${isValidAttachmentFabric(att2Name, att2Code) && parseFloat(String(att2Length || 0)) > 0 ? `
              <tr>
                <td><span style="background: #7c3aed; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">ATTACHMENT 2</span></td>
                <td style="font-family: monospace; font-weight: 800; color: #7c3aed;">${att2Code || 'ATT-2'}</td>
                <td style="font-weight: 700; color: #1e293b;">${att2Name}${att2Shade ? ` <span style="font-size: 8.5px; color: #64748b; font-weight: 500;">(${att2Shade})</span>` : ''}</td>
                <td style="text-align: right; font-weight: 800; color: #7c3aed;">${parseFloat(String(att2Length)).toFixed(2)} meters / pc</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <!-- Tailoring Measurements Grid -->
          <div class="section-title">Anatomical Body Measurements (Custom Tailoring)</div>
          <div class="meas-grid">
            ${
              flatMeas.length > 0
                ? flatMeas
                    .map(
                      (m) => `
                <div class="meas-item">
                  <span class="meas-label">${m.label}</span>
                  <span class="meas-val">${m.value}</span>
                </div>
              `
                    )
                    .join('')
                : '<div style="padding: 10px; font-size: 11px; color: #64748b;">No individual dimensions recorded. Consult client sizing chart.</div>'
            }
          </div>

          ${
            first.notes
              ? `
            <div class="fit-notes-box">
              <strong>Tailor Fit &amp; Alteration Notes:</strong> ${first.notes}
            </div>
          `
              : ''
          }

          <!-- Piece Progress Checklist -->
          <div class="section-title" style="margin-top: 10px;">Piece Progress Checklist (${totalPiecesForMember} Garments)</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px;">
            <thead>
              <tr style="background: #f1f5f9; text-transform: uppercase; font-size: 8.5px; color: #475569; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 8px; text-align: left; width: 22%;">Piece Index</th>
                <th style="padding: 5px 8px; text-align: left; width: 30%;">Piece Barcode</th>
                <th style="padding: 5px 8px; text-align: left; width: 48%;">Floor Progress Checkboxes</th>
              </tr>
            </thead>
            <tbody>
              ${pieceChecklist}
            </tbody>
          </table>

          <!-- Worker Accountability Routing Table -->
          <div class="section-title">Worker Stage Accountability (Worker Name &amp; Employee Code)</div>
          <table class="worker-table">
            <thead>
              <tr>
                <th style="width: 20%;">Stage 1: Cutting Table</th>
                <th style="width: 20%;">Stage 2: Stitching Line</th>
                <th style="width: 20%;">Stage 3: Finishing &amp; Iron</th>
                <th style="width: 20%;">Stage 4: QC &amp; Inspection</th>
                <th style="width: 20%;">Stage 5: Bag &amp; Pack</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="worker-field-label">Worker Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Table #: _________</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Tailor Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Machine #: _______</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Worker Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Kaaj / Trim: [ &nbsp; ]</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Inspector Name / Code:</div>
                  <div class="worker-writein-line"></div>
                  <div style="font-size: 8.5px; font-weight: 800; color: #047857; margin-top: 4px;">[ &nbsp; ] QC PASSED</div>
                  <div style="font-size: 8px; color: #e11d48;">[ &nbsp; ] REWORK</div>
                  <div class="worker-field-label">Stamp: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Packer Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Carton #: ________</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="sheet-footer">
            Forma Apparels ERP — Person Traveler Sheet • Page ${groupIdx + 1} of ${Object.keys(memberGroups).length} • Attach this traveler directly to ${memberName}'s garment bundle across all production stages.
          </div>
        </div>
      `;
      })
      .join('');
  } else {
    // STANDARD US SIZE MODE: 1 sheet per size bundle
    const sizeGroups: Record<string, ChildJobCardData[]> = {};
    childCards.forEach((c) => {
      const sz = (c.size || 'M').toUpperCase();
      if (!sizeGroups[sz]) sizeGroups[sz] = [];
      sizeGroups[sz].push(c);
    });

    sheetsHtml = Object.entries(sizeGroups)
      .map(([size, pieces], groupIdx) => {
        const bundleQty = pieces.length;
        const first = pieces[0] || {};
        const firstBarcode = pieces[0]?.barcode || `BRC-${jc.id}-SZ${size}`;
        const pieceBarcodeSVG = generateInlineBarcodeSVG(firstBarcode, 48, 1.6);

        // Resolve all fabric specifications (Main Fabric & Attachment Fabrics)
        const fMeta = first.custom_measurements?._fabric || {};
        const mainMeta = fMeta.main || {};
        const mainCode =
          first.fabric_code ||
          mainMeta.code ||
          fMeta.code ||
          jc.size_breakdown?.fabric_code ||
          (jc.size_breakdown?.fabric_id ? `FAB-${jc.size_breakdown.fabric_id}` : 'FAB-STD');
        const mainName =
          first.fabric_name ||
          mainMeta.name ||
          fMeta.name ||
          jc.size_breakdown?.fabric_name ||
          fabricName;
        const mainMeters =
          first.fabric_length ||
          first.fabric_meters ||
          mainMeta.length ||
          fMeta.length ||
          jc.size_breakdown?.main_fabric_meters ||
          '1.25';
        const mainShade =
          first.fabric_shade ||
          mainMeta.shade ||
          fMeta.shade ||
          jc.size_breakdown?.shade ||
          null;

        const att1Meta = fMeta.attachment1 || null;
        const att1Code = first.attachment1_code || att1Meta?.code || jc.size_breakdown?.attachment_fabric1_code || null;
        const att1Name = first.attachment1_name || att1Meta?.name || jc.size_breakdown?.attachment_fabric1_name || null;
        const att1Length = first.attachment1_length || first.attachment1_meters || att1Meta?.length || jc.size_breakdown?.attachment_fabric1_meters || null;
        const att1Shade = first.attachment1_shade || att1Meta?.shade || jc.size_breakdown?.attachment_fabric1_shade || null;

        const att2Meta = fMeta.attachment2 || null;
        const att2Code = first.attachment2_code || att2Meta?.code || jc.size_breakdown?.attachment_fabric2_code || null;
        const att2Name = first.attachment2_name || att2Meta?.name || jc.size_breakdown?.attachment_fabric2_name || null;
        const att2Length = first.attachment2_length || first.attachment2_meters || att2Meta?.length || jc.size_breakdown?.attachment_fabric2_meters || null;
        const att2Shade = first.attachment2_shade || att2Meta?.shade || jc.size_breakdown?.attachment_fabric2_shade || null;

        return `
        <div class="person-sheet">
          <div class="sheet-header">
            <div>
              <div class="brand-title">FORMA APPARELS</div>
              <div class="brand-subtitle">Standard Size Bundle Production Traveler</div>
              <div class="order-ref-text">Order: <strong>${orderNo}</strong> • Quote: <strong>${quoteNo}</strong> • Client: <strong>${orgName}</strong></div>
            </div>
            <div class="parent-barcode-box">
              <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 2px;">Main Job Card Barcode</div>
              <div class="svg-wrap">${parentBarcodeSVG}</div>
              <div class="barcode-num">${jc.job_card_no}</div>
            </div>
          </div>

          <div class="recipient-banner" style="background: #f8fafc; border-color: #cbd5e1;">
            <div class="recipient-info">
              <span class="banner-tag" style="background: #2563eb;">STANDARD US SIZING LOT</span>
              <h2 class="recipient-name" style="font-size: 28px;">SIZE: ${size}</h2>
              <div class="recipient-meta">Grading: <strong>Standard US Fit Block</strong> • Item: <strong>${jc.item_name}</strong></div>
            </div>
            <div class="piece-count-box" style="background: #2563eb; color: #ffffff;">
              <div class="piece-count-label" style="color: #bfdbfe;">Bundle Quantity</div>
              <div class="piece-count-value" style="color: #ffffff;">${bundleQty} <span style="font-size: 13px;">PCS</span></div>
              <div class="piece-count-sub" style="color: #bfdbfe;">Size ${size} Bundle</div>
            </div>
          </div>

          <div class="piece-barcode-hero">
            <div class="hero-barcode-svg">${pieceBarcodeSVG}</div>
            <div class="hero-barcode-text">${firstBarcode} (Series)</div>
            <div class="hero-barcode-caption">Scan at Sewing Line &amp; Workstations for Size ${size} Lot Processing</div>
          </div>

          <!-- Garment & Order Identifiers -->
          <div class="spec-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 8px;">
            <div class="spec-item">
              <span class="spec-label">Garment Item</span>
              <span class="spec-value">${jc.item_name}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Design / DNS Code</span>
              <span class="spec-value" style="font-family: monospace;">${jc.design_number || 'DNS-STANDARD'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Parent Job Card</span>
              <span class="spec-value" style="font-family: monospace; color: #4f46e5; font-weight: 800;">${jc.job_card_no}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Sales Order Ref</span>
              <span class="spec-value" style="font-family: monospace; color: #2563eb; font-weight: 800;">${orderNo}</span>
            </div>
          </div>

          <!-- Fabric & Material Specifications (Main & Attachment Fabrics) -->
          <div class="section-title" style="margin-top: 6px; margin-bottom: 4px;">Fabric Specifications &amp; Material Cut Lengths (Main &amp; Attachments)</div>
          <table class="bom-table" style="margin-bottom: 10px; width: 100%;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="width: 24%; text-align: left;">Fabric Role / Component</th>
                <th style="width: 20%; text-align: left;">Fabric Number / Code</th>
                <th style="width: 36%; text-align: left;">Fabric Name</th>
                <th style="width: 20%; text-align: right;">Cut Length per Piece</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style="background: #0f172a; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">MAIN FABRIC</span></td>
                <td style="font-family: monospace; font-weight: 800; color: #0f172a;">${mainCode}</td>
                <td style="font-weight: 700; color: #1e293b;">${mainName}${mainShade ? ` <span style="font-size: 8.5px; color: #64748b; font-weight: 500;">(${mainShade})</span>` : ''}</td>
                <td style="text-align: right; font-weight: 800; color: #047857;">${parseFloat(String(mainMeters)).toFixed(2)} meters / pc</td>
              </tr>
              ${isValidAttachmentFabric(att1Name, att1Code) && parseFloat(String(att1Length || 0)) > 0 ? `
              <tr>
                <td><span style="background: #4338ca; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">ATTACHMENT 1</span></td>
                <td style="font-family: monospace; font-weight: 800; color: #4338ca;">${att1Code || 'ATT-1'}</td>
                <td style="font-weight: 700; color: #1e293b;">${att1Name}${att1Shade ? ` <span style="font-size: 8.5px; color: #64748b; font-weight: 500;">(${att1Shade})</span>` : ''}</td>
                <td style="text-align: right; font-weight: 800; color: #4338ca;">${parseFloat(String(att1Length)).toFixed(2)} meters / pc</td>
              </tr>
              ` : ''}
              ${isValidAttachmentFabric(att2Name, att2Code) && parseFloat(String(att2Length || 0)) > 0 ? `
              <tr>
                <td><span style="background: #7c3aed; color: #ffffff; font-size: 8px; font-weight: 800; padding: 2px 6px; border-radius: 3px;">ATTACHMENT 2</span></td>
                <td style="font-family: monospace; font-weight: 800; color: #7c3aed;">${att2Code || 'ATT-2'}</td>
                <td style="font-weight: 700; color: #1e293b;">${att2Name}${att2Shade ? ` <span style="font-size: 8.5px; color: #64748b; font-weight: 500;">(${att2Shade})</span>` : ''}</td>
                <td style="text-align: right; font-weight: 800; color: #7c3aed;">${parseFloat(String(att2Length)).toFixed(2)} meters / pc</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          <!-- Worker Accountability Routing Table -->
          <div class="section-title" style="margin-top: 14px;">Worker Stage Accountability (Worker Name &amp; Employee Code)</div>
          <table class="worker-table">
            <thead>
              <tr>
                <th style="width: 20%;">Stage 1: Cutting Table</th>
                <th style="width: 20%;">Stage 2: Stitching Line</th>
                <th style="width: 20%;">Stage 3: Finishing &amp; Iron</th>
                <th style="width: 20%;">Stage 4: QC &amp; Inspection</th>
                <th style="width: 20%;">Stage 5: Bag &amp; Pack</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="worker-field-label">Worker Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Table #: _________</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Tailor Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Machine #: _______</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Worker Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Kaaj / Trim: [ &nbsp; ]</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Inspector Name / Code:</div>
                  <div class="worker-writein-line"></div>
                  <div style="font-size: 8.5px; font-weight: 800; color: #047857; margin-top: 4px;">[ &nbsp; ] QC PASSED: ____ pcs</div>
                  <div style="font-size: 8px; color: #e11d48;">[ &nbsp; ] REWORK: ____ pcs</div>
                  <div class="worker-field-label">Stamp: ____________</div>
                </td>
                <td>
                  <div class="worker-field-label">Packer Name / Emp Code:</div>
                  <div class="worker-writein-line"></div>
                  <div class="worker-field-label" style="margin-top: 6px;">Carton #: ________</div>
                  <div class="worker-field-label">Date: ____/____/2026</div>
                  <div class="worker-field-label">Sign: ____________</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="sheet-footer">
            Forma Apparels ERP — Size Bundle Traveler • Page ${groupIdx + 1} of ${Object.keys(sizeGroups).length} • Lot ${size} Bundle of ${bundleQty} Pieces.
          </div>
        </div>
      `;
      })
      .join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Person Traveler Sheets — ${jc.job_card_no}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4f4f5;
      padding: 12px;
      color: #0f172a;
    }
    .person-sheet {
      page-break-after: always;
      break-after: page;
      background: #ffffff;
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 0 auto 24px auto;
      max-width: 820px;
      min-height: 980px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #0f172a;
    }
    .brand-subtitle {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-top: 1px;
    }
    .order-ref-text {
      font-size: 9.5px;
      color: #334155;
      margin-top: 3px;
    }
    .parent-barcode-box {
      text-align: right;
      border-left: 1px solid #e2e8f0;
      padding-left: 12px;
    }
    .parent-barcode-box .svg-wrap {
      display: flex;
      justify-content: flex-end;
    }
    .parent-barcode-box .barcode-num {
      font-family: monospace;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #0f172a;
    }
    .recipient-banner {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .banner-tag {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      background: #b45309;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .recipient-name {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      margin: 3px 0 1px 0;
      line-height: 1.1;
    }
    .recipient-meta {
      font-size: 9.5px;
      color: #475569;
    }
    .piece-count-box {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 8px;
      text-align: center;
      min-width: 130px;
    }
    .piece-count-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #94a3b8;
    }
    .piece-count-value {
      font-size: 22px;
      font-weight: 900;
      line-height: 1;
      margin: 2px 0;
      color: #38bdf8;
    }
    .piece-count-sub {
      font-size: 8px;
      color: #94a3b8;
    }
    .piece-barcode-hero {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      margin-bottom: 10px;
    }
    .hero-barcode-svg {
      display: flex;
      justify-content: center;
    }
    .hero-barcode-text {
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #0f172a;
      margin-top: 3px;
    }
    .hero-barcode-caption {
      font-size: 8px;
      color: #64748b;
      margin-top: 1px;
    }
    .spec-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .spec-item {
      background: #f1f5f9;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .spec-label {
      font-size: 7.5px;
      text-transform: uppercase;
      font-weight: 800;
      color: #64748b;
      display: block;
    }
    .spec-value {
      font-size: 10.5px;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .section-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .meas-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    .meas-item {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      background: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meas-label {
      font-size: 9px;
      font-weight: 800;
      color: #475569;
      text-transform: capitalize;
    }
    .meas-val {
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
    }
    .fit-notes-box {
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 9px;
      color: #92400e;
      margin-bottom: 8px;
    }
    .bom-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 8.5px;
    }
    .bom-table th {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8px;
      color: #334155;
      padding: 4px 6px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .bom-table td {
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      font-size: 9px;
    }
    .worker-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-bottom: 6px;
    }
    .worker-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 5px 6px;
      border: 1px solid #0f172a;
      text-align: left;
    }
    .worker-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 6px;
      vertical-align: top;
      background: #fafafa;
      height: 90px;
    }
    .worker-field-label {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
    }
    .worker-writein-line {
      border-bottom: 1.5px solid #0f172a;
      margin-top: 14px;
      margin-bottom: 4px;
      height: 2px;
    }
    .sheet-footer {
      font-size: 7.5px;
      color: #64748b;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .person-sheet {
        margin: 0;
        border-color: #000000;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  ${sheetsHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;
}

