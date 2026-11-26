import type { ItemKind, ManualItem, SeparateFabricItem } from '../page';
import { formatFabricDisplayName } from '@/lib/fabricFormatter';

// Resolve a line's kind. Older quotations have no item_kind, so infer it
// from the saved size_breakdown flags or the legacy quotation type.
type KindSource = {
  item_kind?: ItemKind;
  size_breakdown?: { is_separate_fabric?: boolean; is_accessory?: boolean; item_kind?: ItemKind; is_custom?: boolean } | null;
} | null | undefined;

// Unique-enough local id for new rows (kept out of components so it is not called during render)
export const newLocalId = () => Date.now() + Math.random();

export const getItemKind = (item: KindSource, legacyQuotationType?: string): ItemKind => {
  if (item?.item_kind) return item.item_kind;
  const sb = item?.size_breakdown || {};
  if (sb.item_kind) return sb.item_kind;
  if ((sb as any).is_custom || (item as any)?.is_custom) return 'CUSTOM';
  if (sb.is_separate_fabric) return 'FABRIC';
  if (sb.is_accessory) return 'ACCESSORY';
  const t = (legacyQuotationType || '').toUpperCase();
  if (t === 'CUSTOM') return 'CUSTOM';
  if (t.startsWith('ACCESSOR')) return 'ACCESSORY';
  // Legacy trade readymades / price-based types are categorised under accessories now
  if (t === 'READYMADE' || t === 'READYMADE_SET' || t === 'MANUAL') return 'ACCESSORY';
  return 'READYMADE';
};

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  READYMADE: 'Readymade',
  FABRIC: 'Fabric',
  ACCESSORY: 'Accessory',
  CUSTOM: 'Custom',
};

export const KIND_BADGE: Record<ItemKind, string> = {
  CUSTOM: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  READYMADE: 'bg-[#FFF1F1] text-[#C82A2B] border-[#C82A2B]/20',
  FABRIC: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCESSORY: 'bg-amber-50 text-amber-700 border-amber-200',
};

export interface LineDisplayView {
  title: string;
  subtitle?: string;
  kind: ItemKind;
}

export const getLineDisplayView = (
  item: ManualItem,
  allProducts: any[] = [],
  fabricsList: any[] = [],
  masterItems: any[] = []
): LineDisplayView => {
  const kind = getItemKind(item);
  const bits: string[] = [];
  if (kind === 'CUSTOM') {
    const title = item.name || item.product_name || 'Custom Item';
    if (item.department_name) bits.push(item.department_name);
    return { title, subtitle: bits.length > 0 ? bits.join(' · ') : undefined, kind };
  }
  if (kind === 'FABRIC') {
    const fabric = fabricsList.find((f: any) => String(f.id) === String(item.fabric_id));
    bits.push('Rate per meter');
    if (item.department_name) bits.push(item.department_name);
    return { title: formatFabricDisplayName(fabric) || 'Fabric', subtitle: bits.join(' · '), kind };
  }
  const prod = (allProducts || []).find((p: any) => String(p.id) === String(item.product_id));
  const lineProduct = prod ? { ...prod, ...item, gender: item.gender || prod.gender } : item;
  const title = formatProductDisplayName(lineProduct, masterItems)
    || item.product_name || item.name || item.size_breakdown?.product_name
    || (kind === 'ACCESSORY' ? 'Accessory' : 'Readymade item');
  const art = item.art_number || prod?.art_number;
  if (art) bits.push(`ART ${art}`);
  if (kind === 'READYMADE') {
    if (item.design_number && !item.design_number.startsWith('Auto')) bits.push(`DNS ${item.design_number}`);
    const mainFabric = fabricsList.find((f: any) => String(f.id) === String(item.fabric_id));
    if (mainFabric) bits.push(formatFabricDisplayName(mainFabric));
  }
  if (kind === 'ACCESSORY' && item.size_breakdown?.selected_size) bits.push(`Size ${item.size_breakdown.selected_size}`);
  if (item.gender && !title.toLowerCase().includes(item.gender.toLowerCase())) {
    bits.push(item.gender);
  }
  if (item.department_name) bits.push(item.department_name);
  return { title, subtitle: bits.length > 0 ? bits.join(' · ') : undefined, kind };
};

export const parseQty = (item: Partial<ManualItem>) =>
  getItemKind(item) === 'FABRIC' ? (parseFloat(item.quantity || '') || 0) : (parseInt(item.quantity || '') || 0);

export const lineAmount = (item: Partial<ManualItem>) => parseQty(item) * (parseFloat(item.price || '') || 0);

export const createBlankLine = (kind: ItemKind): ManualItem => ({
  id: newLocalId(),
  item_kind: kind,
  product_type_id: '', product_id: '',
  product_name: '', name: '',
  fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
  attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
  attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
  button_id: '', button_count: '', thread_id: '', thread_count: '',
  trims: [],
  sam_value: '', design_number: '',
  quantity: '1',
  price: '',
  qty_mode: 'direct_products', // all kinds start on "No. of Products"; Members & Sets is opt-in
  no_of_members: '1',
  no_of_sets: '2',
  gender: '',
  size_breakdown: kind === 'ACCESSORY' ? { is_accessory: true } : (kind === 'CUSTOM' ? { is_custom: true, is_manual: true } : {}),
});

// Fabric lines expressed in the legacy "separate fabric" shape used by steps 3/5 and the payload.
export const toSeparateFabrics = (lines: ManualItem[]): SeparateFabricItem[] =>
  lines
    .filter(l => getItemKind(l) === 'FABRIC')
    .map(l => ({ id: l.id, fabric_id: l.fabric_id, meters: l.quantity, rate: l.price, brand_tier: l.brand_tier }));

export const fabricLineFromSeparate = (sf: SeparateFabricItem): ManualItem => ({
  ...createBlankLine('FABRIC'),
  id: sf.id || Date.now() + Math.random(),
  fabric_id: String(sf.fabric_id || ''),
  quantity: String(sf.meters || ''),
  price: String(sf.rate || ''),
  brand_tier: sf.brand_tier || '',
  rate_manual: true,
  size_breakdown: { is_separate_fabric: true, brand_tier: sf.brand_tier || '' },
});

// Validation used both by the item modal (Save button) and the wizard (Next button)
export const getLineError = (item: ManualItem): string | null => {
  const kind = getItemKind(item);
  const qty = parseQty(item);
  if (kind === 'CUSTOM') {
    if (!item.name?.trim() && !item.product_name?.trim()) return 'Enter item name';
    if (!(qty > 0)) return 'Enter quantity';
  } else if (kind === 'FABRIC') {
    if (!item.fabric_id) return 'Select a fabric';
    if (!(qty > 0)) return 'Enter meters';
  } else if (kind === 'ACCESSORY') {
    if (!item.product_id) return 'Select an accessory';
    if (!(qty > 0)) return 'Enter quantity';
  } else {
    if (!item.product_type_id) return 'Select a product type';
    if (!item.product_id) return 'Select a product';
    // Fabrics and trims are only selected when the user chooses; if selected, validate meters
    if (item.fabric_id && !(parseFloat(item.main_fabric_meters) > 0)) return 'Enter main fabric meters';
    if (!(qty > 0)) return 'Enter quantity';
  }
  if (item.price === '' || isNaN(parseFloat(item.price)) || parseFloat(item.price) < 0) return 'Enter a valid rate';
  return null;
};

/**
 * Format product name according to the rule:
 * Format: [Item] [Specification] [Gender] (e.g. "Shirt Half Sleeve Male", "Trouser Flat Front Boys")
 * There is no arbitrary product name for an art number.
 */
export const formatProductDisplayName = (
  prod: { name?: string; product_name?: string; art_number?: string; gender?: string; item_id?: any; specification_id?: any } | null | undefined,
  dressesList?: any[]
): string => {
  if (!prod) return '';

  // Only in-house manufactured readymades use the [Gender] [Item] [Specification] naming rule.
  // Accessories, trade readymades, fabrics, and custom quotation items preserve their assigned names.
  const rawArt = (prod.art_number || '').toUpperCase();
  const accPrefixes = ['TIE-', 'BLT-', 'SCK-', 'BDG-', 'CAP-', 'SCF-', 'EPL-', 'LNY-', 'BOW-', 'PKS-', 'CRST-', 'ACC-'];
  if (
    accPrefixes.some(pref => rawArt.startsWith(pref)) ||
    (prod as any).category === 'accessories' ||
    (prod as any).category === 'trade_readymade' ||
    (prod as any).category === 'readymade_trade' ||
    (prod as any).item_kind === 'ACCESSORY' ||
    (prod as any).item_kind === 'FABRIC' ||
    (prod as any).item_kind === 'CUSTOM' ||
    (prod as any).is_custom ||
    (prod as any).is_accessory ||
    (prod as any).size_breakdown?.is_accessory ||
    (prod as any).size_breakdown?.is_separate_fabric ||
    (prod as any).size_breakdown?.is_custom
  ) {
    return prod.product_name || prod.name || '';
  }

  const art = prod.art_number || '';
  if (art && art.includes('-')) {
    const parts = art.split('-');
    if (parts.length >= 2) {
      const rawItem = parts[0];
      const middle = parts[1];

      let itemCode = rawItem;
      let specCode = '';
      const match = rawItem.match(/^([0-9a-zA-Z]+?)([A-Za-z])$/);
      if (match) {
        itemCode = match[1];
        specCode = match[2].toUpperCase();
      }

      const genderCode = middle.length >= 1 ? middle.slice(0, 1) : '';

      const matchedItem = (dressesList || []).find((d: any) => d.code === itemCode || String(d.id) === String(prod.item_id));
      const matchedSpec = (matchedItem?.art_item_specifications || []).find((s: any) => s.code === specCode || String(s.id) === String(prod.specification_id));

      let itemName = matchedItem?.name || '';
      if (!itemName) {
        if (itemCode === '1') itemName = 'Shirt';
        else if (itemCode === '2') itemName = 'Trouser';
        else if (itemCode === '3') itemName = 'Blazer';
        else if (itemCode === '4') itemName = 'T-Shirt';
        else if (itemCode === '5') itemName = 'Skirt';
      }

      let specName = matchedSpec?.name || '';
      if (!specName) {
        if (specCode === 'A') {
          if (itemCode === '1') specName = 'Half Sleeve';
          else if (itemCode === '2') specName = 'Full Length Pleated';
          else if (itemCode === '3') specName = 'Single Breasted';
        } else if (specCode === 'B') {
          if (itemCode === '1') specName = 'Full Sleeve';
          else if (itemCode === '2') specName = 'Flat Front';
          else if (itemCode === '3') specName = 'Double Breasted';
        } else if (specCode === 'C') {
          if (itemCode === '1') specName = 'Sleeveless';
          else if (itemCode === '2') specName = 'Shorts';
        }
      }

      let genderName = prod.gender || '';
      if (!genderName) {
        if (genderCode === '1') genderName = 'Male';
        else if (genderCode === '2') genderName = 'Female';
        else if (genderCode === '3') genderName = 'Boys';
        else if (genderCode === '4') genderName = 'Girls';
      } else {
        genderName = genderName.charAt(0).toUpperCase() + genderName.slice(1).toLowerCase();
      }

      const cleanItem = itemName ? (itemName.charAt(0).toUpperCase() + itemName.slice(1).toLowerCase()) : '';
      const cleanSpec = specName ? specName.trim() : '';
      const cleanGender = genderName ? genderName.trim() : '';

      const composed = [cleanGender, cleanItem, cleanSpec].filter(Boolean).join(' ');
      if (composed) return composed;
    }
  }

  return prod.product_name || prod.name || '';
};

/**
 * Format item specification name (e.g. "Half Sleeve [A]", "Full Sleeve [B]")
 */
export const formatSpecificationDisplayName = (
  prod: { art_number?: string; item_id?: any; specification_id?: any } | null | undefined,
  dressesList?: any[]
): string => {
  if (!prod) return '';
  const art = prod.art_number || '';
  if (art && art.includes('-')) {
    const parts = art.split('-');
    if (parts.length >= 2) {
      const rawItem = parts[0];
      let itemCode = rawItem;
      let specCode = '';
      const match = rawItem.match(/^([0-9a-zA-Z]+?)([A-Za-z])$/);
      if (match) {
        itemCode = match[1];
        specCode = match[2].toUpperCase();
      }

      const matchedItem = (dressesList || []).find((d: any) => d.code === itemCode || String(d.id) === String(prod.item_id));
      const matchedSpec = (matchedItem?.art_item_specifications || []).find((s: any) => s.code === specCode || String(s.id) === String(prod.specification_id));

      let specName = matchedSpec?.name || '';
      if (!specName) {
        if (specCode === 'A') {
          if (itemCode === '1') specName = 'Half Sleeve';
          else if (itemCode === '2') specName = 'Full Length Pleated';
          else if (itemCode === '3') specName = 'Single Breasted';
        } else if (specCode === 'B') {
          if (itemCode === '1') specName = 'Full Sleeve';
          else if (itemCode === '2') specName = 'Flat Front';
          else if (itemCode === '3') specName = 'Double Breasted';
        } else if (specCode === 'C') {
          if (itemCode === '1') specName = 'Sleeveless';
          else if (itemCode === '2') specName = 'Shorts';
        }
      }

      if (specName) {
        return specCode ? `${specName} [${specCode}]` : specName;
      }
      if (specCode) {
        return `Specification [${specCode}]`;
      }
    }
  }
  return '';
};
