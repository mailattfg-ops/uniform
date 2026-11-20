'use client';
import { Select } from '@/components/ui/Select';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight, CheckCircle2, Clock, AlertTriangle, Layers, Trash2, Package, Zap, Users, GraduationCap, RefreshCw, Hash } from 'lucide-react';
import { ProductType, TemplateLineItem, ManualItem, ItemKind } from '../../page';
import toast from '@/components/ui/toast';
import api from '@/lib/api';
import { convertFabricMetersByWidth } from '../../_lib/fabricWidthConverter';
import { formatFabricDisplayName } from '@/lib/fabricFormatter';
import { formatSpecificationDisplay } from '@/lib/formatters';
import { getItemKind, createBlankLine, getLineError, parseQty, ITEM_KIND_LABELS, newLocalId, formatProductDisplayName, formatSpecificationDisplayName, getLineDisplayView } from '../../_lib/itemLines';
import ItemLinesTable, { ItemLineView } from './ItemLinesTable';
import ItemLineModal from './ItemLineModal';

const parseMaterialsField = (rawText: string | undefined | null) => {
  if (!rawText) return { type: '', materials: '' };
  const match = rawText.match(/^\[ProductType:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return { type: match[1].trim(), materials: match[2].trim() };
  }
  return { type: '', materials: rawText };
};

export const resolveClassConsumption = (prod: any, deptName: string) => {
  if (!prod) return null;
  if (!prod.class_fabric_consumption || typeof prod.class_fabric_consumption !== 'object') {
    return {
      main_fabric: prod.main_fabric,
      attachment_fabric1: prod.attachment_fabric1,
      attachment_fabric2: prod.attachment_fabric2,
      button_count: prod.button_count,
      thread_count: prod.thread_count
    };
  }

  const matrix = prod.class_fabric_consumption;
  let clean = (deptName || '').replace(/\(boys\)|\(girls\)|boys|girls/gi, '').trim();
  clean = clean.replace(/[-_]\s*[A-Za-z0-9]$/, '').trim();

  if (matrix[deptName]) return matrix[deptName];
  if (matrix[clean]) return matrix[clean];

  const numMatch = clean.match(/(\d+)/);
  if (numMatch) {
    const gradeNum = numMatch[1];
    const candidateKeys = [
      `Class ${gradeNum}`,
      `Class${gradeNum}`,
      `Grade ${gradeNum}`,
      `Grade${gradeNum}`,
      `C${gradeNum}`,
      gradeNum
    ];
    for (const ck of candidateKeys) {
      const foundKey = Object.keys(matrix).find(k => k.toLowerCase().replace(/\s+/g, '') === ck.toLowerCase().replace(/\s+/g, ''));
      if (foundKey && matrix[foundKey]) return matrix[foundKey];
    }
  }

  const lower = clean.toLowerCase();
  for (const k of Object.keys(matrix)) {
    const lk = k.toLowerCase();
    if (lower.includes('nur') && lk.includes('nur')) return matrix[k];
    if (lower.includes('lkg') && lk.includes('lkg')) return matrix[k];
    if (lower.includes('ukg') && lk.includes('ukg')) return matrix[k];
    if (lower.includes('kg') && lk.includes('kg')) return matrix[k];
  }

  const strippedClean = clean.toLowerCase().replace(/\s+/g, '');
  const matchedKey = Object.keys(matrix).find(k => {
    const strippedK = k.toLowerCase().replace(/\s+/g, '');
    return strippedClean === strippedK || strippedClean.includes(strippedK) || strippedK.includes(strippedClean);
  });
  if (matchedKey && matrix[matchedKey]) return matrix[matchedKey];

  if (matrix['Corporate']) return matrix['Corporate'];

  return null;
};

// Calculate class-wise average fabric lengths and trim counts across all configured classes
export const getClassWiseAverage = (prod: any) => {
  if (!prod?.class_fabric_consumption || typeof prod.class_fabric_consumption !== 'object') {
    return null;
  }
  const matrix = prod.class_fabric_consumption;
  const classEntries = Object.entries(matrix).filter(
    ([k, v]) => !k.startsWith('_') && k.toLowerCase() !== 'corporate' && typeof v === 'object' && v !== null
  );
  if (classEntries.length === 0) return null;

  let sumMain = 0, cntMain = 0;
  let sumAtt1 = 0, cntAtt1 = 0;
  let sumAtt2 = 0, cntAtt2 = 0;
  let sumBtn = 0, cntBtn = 0;
  let sumThr = 0, cntThr = 0;

  for (const [, val] of classEntries) {
    const v: any = val;
    if (v.main_fabric !== undefined && v.main_fabric !== null && v.main_fabric !== '') {
      const num = parseFloat(String(v.main_fabric));
      if (!isNaN(num) && num > 0) {
        sumMain += num;
        cntMain++;
      }
    }
    if (v.attachment_fabric1 !== undefined && v.attachment_fabric1 !== null && v.attachment_fabric1 !== '') {
      const num = parseFloat(String(v.attachment_fabric1));
      if (!isNaN(num) && num > 0) {
        sumAtt1 += num;
        cntAtt1++;
      }
    }
    if (v.attachment_fabric2 !== undefined && v.attachment_fabric2 !== null && v.attachment_fabric2 !== '') {
      const num = parseFloat(String(v.attachment_fabric2));
      if (!isNaN(num) && num > 0) {
        sumAtt2 += num;
        cntAtt2++;
      }
    }
    if (v.button_count !== undefined && v.button_count !== null && v.button_count !== '') {
      const num = parseFloat(String(v.button_count));
      if (!isNaN(num) && num > 0) {
        sumBtn += num;
        cntBtn++;
      }
    }
    if (v.thread_count !== undefined && v.thread_count !== null && v.thread_count !== '') {
      const num = parseFloat(String(v.thread_count));
      if (!isNaN(num) && num > 0) {
        sumThr += num;
        cntThr++;
      }
    }
  }

  const formatMeters = (avg: number) => (Math.round(avg * 100) / 100).toString();
  const formatCount = (avg: number) => (Math.round(avg * 10) / 10).toString();

  return {
    main_fabric: cntMain > 0 ? formatMeters(sumMain / cntMain) : null,
    attachment_fabric1: cntAtt1 > 0 ? formatMeters(sumAtt1 / cntAtt1) : null,
    attachment_fabric2: cntAtt2 > 0 ? formatMeters(sumAtt2 / cntAtt2) : null,
    button_count: cntBtn > 0 ? formatCount(sumBtn / cntBtn) : null,
    thread_count: cntThr > 0 ? formatCount(sumThr / cntThr) : null,
  };
};

export const DEFAULT_TRIM_CATEGORIES = [
  'Buttons',
  'Thread',
  'Zipper',
  'Elastic',
  'Brand Label / Tag',
  'Care / Size Label',
  'Interlining / Fusing',
  'Velcro / Fastener',
  'Drawcord / Cord',
  'Eyelet / Rivet',
  'Badge / School Crest',
  'Other Trim'
];

export const getTrimCategoryMeta = (categoryName: string, trimCode?: string) => {
  const c = (categoryName || '').toLowerCase();
  const code = (trimCode || '').toUpperCase();
  if (c.includes('thread') || code.startsWith('THR')) {
    return { isThr: true, isBtn: false, color: 'bg-purple-400', defaultUom: 'spools' };
  }
  if (c.includes('button') || code.startsWith('BTN')) {
    return { isThr: false, isBtn: true, color: 'bg-amber-400', defaultUom: 'pcs' };
  }
  if (c.includes('zip') || code.startsWith('ZIP')) {
    return { isThr: false, isBtn: false, color: 'bg-blue-400', defaultUom: 'pcs' };
  }
  if (c.includes('elastic') || code.startsWith('ELA')) {
    return { isThr: false, isBtn: false, color: 'bg-emerald-400', defaultUom: 'meters' };
  }
  if (c.includes('label') || c.includes('tag') || code.startsWith('LBL')) {
    return { isThr: false, isBtn: false, color: 'bg-indigo-400', defaultUom: 'pcs' };
  }
  if (c.includes('interlining') || c.includes('fusing') || code.startsWith('INT')) {
    return { isThr: false, isBtn: false, color: 'bg-orange-400', defaultUom: 'meters' };
  }
  if (c.includes('velcro') || c.includes('fastener')) {
    return { isThr: false, isBtn: false, color: 'bg-violet-400', defaultUom: 'meters' };
  }
  if (c.includes('cord')) {
    return { isThr: false, isBtn: false, color: 'bg-cyan-400', defaultUom: 'meters' };
  }
  if (c.includes('badge') || c.includes('crest')) {
    return { isThr: false, isBtn: false, color: 'bg-rose-400', defaultUom: 'pcs' };
  }
  return { isThr: false, isBtn: false, color: 'bg-teal-500', defaultUom: 'pcs' };
};

export const getAutoProductDefaults = ({
  prod,
  isSchool,
  deptName,
  fabricsList = [],
  buttonsList = [],
  threadsList = [],
  trimsList = [],
  trimCategories = []
}: {
  prod: any;
  isSchool: boolean;
  deptName?: string;
  fabricsList?: any[];
  buttonsList?: any[];
  threadsList?: any[];
  trimsList?: any[];
  trimCategories?: any[];
}) => {
  if (!prod) return null;

  // Base attachment fabrics and trims from product
  const baseAttFabrics = Array.isArray(prod.attachment_fabrics) && prod.attachment_fabrics.length > 0
    ? prod.attachment_fabrics
    : (prod.class_fabric_consumption?._base_attachment_fabrics || []);

  const baseTrims = Array.isArray(prod.trims) && prod.trims.length > 0
    ? prod.trims
    : (Array.isArray(prod.class_fabric_consumption?._base_trims) ? prod.class_fabric_consumption._base_trims : []);

  const btnTrim = baseTrims.find((t: any) =>
    (t.uom || '').toLowerCase() === 'pcs' ||
    (t.name || '').toLowerCase().includes('button') ||
    (t.category || '').toLowerCase().includes('button') ||
    String(t.trim_id).includes('btn')
  );
  const thrTrim = baseTrims.find((t: any) =>
    (t.uom || '').toLowerCase() === 'cones' ||
    (t.uom || '').toLowerCase() === 'spools' ||
    (t.name || '').toLowerCase().includes('thread') ||
    (t.category || '').toLowerCase().includes('thread') ||
    String(t.trim_id).includes('thr')
  );

  let baseMainMeters = '';
  if (prod.main_fabric !== null && prod.main_fabric !== undefined && prod.main_fabric !== '') {
    baseMainMeters = String(prod.main_fabric);
  } else if (prod.main_fabric_meters !== null && prod.main_fabric_meters !== undefined && prod.main_fabric_meters !== '') {
    baseMainMeters = String(prod.main_fabric_meters);
  } else if (prod.class_fabric_consumption?._base_main_fabric !== null && prod.class_fabric_consumption?._base_main_fabric !== undefined && prod.class_fabric_consumption?._base_main_fabric !== '') {
    baseMainMeters = String(prod.class_fabric_consumption._base_main_fabric);
  } else if (prod.class_fabric_consumption?.Corporate?.main_fabric !== null && prod.class_fabric_consumption?.Corporate?.main_fabric !== undefined && prod.class_fabric_consumption?.Corporate?.main_fabric !== '') {
    baseMainMeters = String(prod.class_fabric_consumption.Corporate.main_fabric);
  }
  if (!baseMainMeters && prod.materials) {
    const matMatch = String(prod.materials).match(/\[MainFabricMeters:\s*([^\]]+)\]/i);
    if (matMatch && matMatch[1]) {
      baseMainMeters = matMatch[1].trim();
    }
  }

  const baseAtt1Meters = (prod.attachment_fabric1 !== null && prod.attachment_fabric1 !== undefined && prod.attachment_fabric1 !== '')
    ? String(prod.attachment_fabric1)
    : (baseAttFabrics[0]?.meters ? String(baseAttFabrics[0].meters) : '');
  const baseAtt2Meters = (prod.attachment_fabric2 !== null && prod.attachment_fabric2 !== undefined && prod.attachment_fabric2 !== '')
    ? String(prod.attachment_fabric2)
    : (baseAttFabrics[1]?.meters ? String(baseAttFabrics[1].meters) : '');
  const baseBtnCount = (prod.button_count !== null && prod.button_count !== undefined && prod.button_count !== '')
    ? String(prod.button_count)
    : (btnTrim?.count ? String(btnTrim.count) : '');
  const baseThrCount = (prod.thread_count !== null && prod.thread_count !== undefined && prod.thread_count !== '')
    ? String(prod.thread_count)
    : (thrTrim?.count ? String(thrTrim.count) : '1');

  let resolvedMain = '';
  let resolvedAtt1 = '';
  let resolvedAtt2 = '';
  let resolvedBtn = '';
  let resolvedThr = '';

  if (isSchool) {
    let matchedSpecific = false;
    if (deptName) {
      const specific = resolveClassConsumption(prod, deptName);
      if (specific) {
        matchedSpecific = true;
        if (specific.main_fabric !== null && specific.main_fabric !== undefined && specific.main_fabric !== '') {
          resolvedMain = String(specific.main_fabric);
        }
        if (specific.attachment_fabric1 !== null && specific.attachment_fabric1 !== undefined && specific.attachment_fabric1 !== '') {
          resolvedAtt1 = String(specific.attachment_fabric1);
        }
        if (specific.attachment_fabric2 !== null && specific.attachment_fabric2 !== undefined && specific.attachment_fabric2 !== '') {
          resolvedAtt2 = String(specific.attachment_fabric2);
        }
        if (specific.button_count !== null && specific.button_count !== undefined && specific.button_count !== '') {
          resolvedBtn = String(specific.button_count);
        }
        if (specific.thread_count !== null && specific.thread_count !== undefined && specific.thread_count !== '') {
          resolvedThr = String(specific.thread_count);
        }
      }
    }

    if (!matchedSpecific || !resolvedMain) {
      // Calculate class-wise average
      const avg = getClassWiseAverage(prod);
      if (avg) {
        if (!resolvedMain && avg.main_fabric) resolvedMain = avg.main_fabric;
        if (!resolvedAtt1 && avg.attachment_fabric1) resolvedAtt1 = avg.attachment_fabric1;
        if (!resolvedAtt2 && avg.attachment_fabric2) resolvedAtt2 = avg.attachment_fabric2;
        if (!resolvedBtn && avg.button_count) resolvedBtn = avg.button_count;
        if (!resolvedThr && avg.thread_count) resolvedThr = avg.thread_count;
      }
    }

    // Fallbacks to base product if not found in class matrix
    if (!resolvedMain) resolvedMain = baseMainMeters;
    if (!resolvedAtt1) resolvedAtt1 = baseAtt1Meters;
    if (!resolvedAtt2) resolvedAtt2 = baseAtt2Meters;
    if (!resolvedBtn) resolvedBtn = baseBtnCount;
    if (!resolvedThr) resolvedThr = baseThrCount;
  } else {
    // Non-school: load average data given while creating product
    resolvedMain = baseMainMeters || (prod.class_fabric_consumption?.Corporate?.main_fabric ? String(prod.class_fabric_consumption.Corporate.main_fabric) : '');
    resolvedAtt1 = baseAtt1Meters || (prod.class_fabric_consumption?.Corporate?.attachment_fabric1 ? String(prod.class_fabric_consumption.Corporate.attachment_fabric1) : '');
    resolvedAtt2 = baseAtt2Meters || (prod.class_fabric_consumption?.Corporate?.attachment_fabric2 ? String(prod.class_fabric_consumption.Corporate.attachment_fabric2) : '');
    resolvedBtn = baseBtnCount || (prod.class_fabric_consumption?.Corporate?.button_count ? String(prod.class_fabric_consumption.Corporate.button_count) : '');
    resolvedThr = baseThrCount || (prod.class_fabric_consumption?.Corporate?.thread_count ? String(prod.class_fabric_consumption.Corporate.thread_count) : '1');
  }

  // Universal fallbacks if still empty
  if (!resolvedMain) {
    const avg = getClassWiseAverage(prod);
    if (avg?.main_fabric) resolvedMain = avg.main_fabric;
  }
  if (!resolvedMain && prod.class_fabric_consumption && typeof prod.class_fabric_consumption === 'object') {
    for (const [k, v] of Object.entries(prod.class_fabric_consumption)) {
      if (!k.startsWith('_') && v && typeof v === 'object' && (v as any).main_fabric) {
        resolvedMain = String((v as any).main_fabric);
        break;
      }
    }
  }
  if (!resolvedMain) resolvedMain = baseMainMeters;

  // Fabrics and trims are only selected when the user explicitly selects them
  return {
    base_main_fabric_meters: resolvedMain,
    main_fabric_meters: '',
    base_attachment_fabric1_meters: resolvedAtt1,
    attachment_fabric1_meters: '',
    base_attachment_fabric2_meters: resolvedAtt2,
    attachment_fabric2_meters: '',
    button_count: resolvedBtn || '',
    thread_count: resolvedThr || '',
    button_uom: 'pcs',
    thread_uom: 'spools',
    fabric_id: '',
    attachment_fabric1_id: '',
    attachment_fabric2_id: '',
    button_id: '',
    thread_id: '',
    trims: [],
    sam_value: prod.sam_value !== null && prod.sam_value !== undefined ? String(prod.sam_value) : '',
    main_fabric_sam: '6.777',
    attachment_fabric1_sam: (resolvedAtt1 && resolvedAtt1 !== '0') ? '6.777' : '',
    attachment_fabric2_sam: (resolvedAtt2 && resolvedAtt2 !== '0') ? '6.777' : '',
    design_number: '',
    art_number: prod.art_number || ''
  };
};

interface WizardStep2Props {
  hasMeasurements: boolean;
  orgAnalysis: any;
  templateLineItems: TemplateLineItem[];
  setTemplateLineItems: (items: TemplateLineItem[]) => void;
  manualItems: ManualItem[];
  setManualItems: any;
  orgDepartments?: any[];
  setOrgDepartments?: (depts: any[]) => void;
  productTypes: ProductType[];
  allProducts: any[];
  fabricsList: any[];
  buttonsList: any[];
  threadsList: any[];
  trimsList?: any[];
  trimCategories?: any[];
  inwardRates: any[];
  fabricMargins: any[];
  samConfigurations: any[];
  salesType: string;
  customerType: string;
  calculateProductSAMCost: (samValueStr: string, quantityStr: string) => number;
  calculateFabricCost: (fabricId: string, metersStr: string, fabricSamStr: string, productTypeId: string) => number;
  laborRatePerHour: string;
  isAnalyzing: boolean;
  onBack: () => void;
  onNext: () => void;
  isManualItemsValid: () => boolean;
  organizations?: any[];
  selectedOrgId?: string;
}

export default function WizardStep2({
  hasMeasurements,
  orgAnalysis,
  templateLineItems,
  setTemplateLineItems,
  manualItems,
  setManualItems,
  orgDepartments = [],
  setOrgDepartments,
  productTypes,
  allProducts,
  fabricsList,
  buttonsList,
  threadsList,
  trimsList = [],
  trimCategories = [],
  inwardRates,
  fabricMargins,
  samConfigurations,
  salesType,
  customerType,
  calculateProductSAMCost,
  calculateFabricCost,
  laborRatePerHour,
  isAnalyzing,
  onBack,
  onNext,
  isManualItemsValid,
  organizations = [],
  selectedOrgId = '',
}: WizardStep2Props) {

  // Master Items (Garment Items & Specifications from Art Number Hub)
  const [masterItems, setMasterItems] = React.useState<any[]>([]);
  React.useEffect(() => {
    api.get('/art-number-hub/master-data')
      .then(res => setMasterItems(res.data?.items || res.data?.dresses || []))
      .catch(() => {});
  }, []);

  // Group all trims from database by category
  const trimsByCategory = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    if (Array.isArray(trimsList) && trimsList.length > 0) {
      trimsList.forEach((t: any) => {
        const catName = t.category?.name || t.trim_categories?.name || 'Other Trims';
        if (!groups[catName]) groups[catName] = [];
        groups[catName].push(t);
      });
    }
    if (Array.isArray(buttonsList) && buttonsList.length > 0) {
      const targetCat = groups['Buttons'] ? 'Buttons' : (groups['Button'] ? 'Button' : 'Buttons');
      if (!groups[targetCat]) groups[targetCat] = [];
      buttonsList.forEach((b: any) => {
        if (!groups[targetCat].some((existing: any) => String(existing.id) === String(b.id))) {
          groups[targetCat].push(b);
        }
      });
    }
    if (Array.isArray(threadsList) && threadsList.length > 0) {
      const targetCat = groups['Threads'] ? 'Threads' : (groups['Thread'] ? 'Thread' : 'Threads');
      if (!groups[targetCat]) groups[targetCat] = [];
      threadsList.forEach((th: any) => {
        if (!groups[targetCat].some((existing: any) => String(existing.id) === String(th.id))) {
          groups[targetCat].push({
            ...th,
            uom: th.uom || 'spools'
          });
        }
      });
    }
    return groups;
  }, [trimsList, buttonsList, threadsList]);

  // Unified list of all trim categories across presets, database categories, and inventory items
  const allTrimCategories = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_TRIM_CATEGORIES);
    if (Array.isArray(trimCategories)) {
      trimCategories.forEach((c: any) => {
        if (c.name) set.add(c.name);
      });
    }
    if (Array.isArray(trimsList)) {
      trimsList.forEach((t: any) => {
        const cat = t.category?.name || t.trim_categories?.name || t.category;
        if (cat) set.add(cat);
      });
    }
    return Array.from(set);
  }, [trimCategories, trimsList]);

  const selectedOrg = organizations?.find((org: any) => String(org.id) === String(selectedOrgId));
  const isSchool = Boolean(
    selectedOrg?.industries?.name?.toLowerCase().includes('school') ||
    selectedOrg?.industries?.name?.toLowerCase().includes('educat') ||
    selectedOrg?.industry_type?.toLowerCase().includes('school') ||
    selectedOrg?.name?.toLowerCase().match(/school|vidyalaya|academy|matriculation|college|institution|campus|kindergarten/i) ||
    customerType?.toLowerCase().includes('school') ||
    orgDepartments?.some((d: any) => /class|grade|std|standard|lkg|ukg|nursery|kg/i.test(d.name || d.baseDeptName || ''))
  );

  const isAccessoryProductType = React.useCallback((pt: any): boolean => {
    if (!pt) return false;
    const name = (pt.name || '').toLowerCase().trim();
    return name === 'accessories' || name === 'accessory' || name.includes('accessor');
  }, []);

  // Product types offered in the item modal: accessory lines only see accessory types, readymades the rest
  const productTypesByKind = React.useMemo(() => ({
    accessory: (productTypes || []).filter((pt: any) => isAccessoryProductType(pt)),
    garment: (productTypes || []).filter((pt: any) => !isAccessoryProductType(pt)),
  }), [productTypes, isAccessoryProductType]);

  const isAccessoryProduct = React.useCallback((p: any): boolean => {
    if (!p) return false;
    const mat = (p.materials || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const pType = (p.product_type || '').toLowerCase();
    const pTypeName = (p.product_types?.name || '').toLowerCase();
    const art = (p.art_number || '').toUpperCase();

    // Check linked product type from productTypes list
    const linkedPt = (productTypes || []).find((t: any) => String(t.id) === String(p.product_type_id));
    if (linkedPt && isAccessoryProductType(linkedPt)) {
      return true;
    }

    if (
      cat === 'accessories' || cat === 'accessory' ||
      pType === 'accessories' || pType === 'accessory' ||
      mat.includes('[producttype: accessories]') ||
      (mat.includes('[category:') && mat.includes('accessory')) ||
      pTypeName.includes('accessor')
    ) {
      return true;
    }
    const accPrefixes = ['TIE-', 'BLT-', 'SCK-', 'BDG-', 'CAP-', 'SCF-', 'EPL-', 'LNY-', 'BOW-', 'PKS-', 'CRST-', 'ACC-'];
    return accPrefixes.some(pref => art.startsWith(pref));
  }, [productTypes, isAccessoryProductType]);

  // Deduplicate template line items by product_id
  const mergedMap = new Map<number, TemplateLineItem & { _indices: number[] }>();
  templateLineItems.forEach((item, idx) => {
    const key = item.product_id;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      if (item.design_number_override && !existing.design_number_override.split(', ').includes(item.design_number_override)) {
        existing.design_number_override = existing.design_number_override
          ? `${existing.design_number_override}, ${item.design_number_override}`
          : item.design_number_override;
      }
      existing._indices.push(idx);
    } else {
      mergedMap.set(key, { ...item, _indices: [idx] });
    }
  });
  const mergedItems = Array.from(mergedMap.values());

  // Database Genders from Art Number Hub (art_genders)
  const [dbGenders, setDbGenders] = React.useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    api.get('/art-number-hub/genders')
      .then(res => {
        if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
          setDbGenders(res.data);
        }
      })
      .catch(err => {
        console.warn('Failed to load genders from art-number-hub:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const availableGenders = React.useMemo(() => {
    if (dbGenders && dbGenders.length > 0) {
      return dbGenders.map((g: any) => ({
        id: g.id,
        code: g.code,
        name: g.name,
        value: (g.name || g.code || '').toLowerCase().trim(),
        label: g.name ? `${g.name}${g.code ? ` (${g.code})` : ''}` : g.code,
      }));
    }
    return [
      { id: 'male', code: '1', name: isSchool ? 'Boys' : 'Men', value: 'male', label: isSchool ? 'Boys / Male' : 'Men / Male' },
      { id: 'female', code: '2', name: isSchool ? 'Girls' : 'Women', value: 'female', label: isSchool ? 'Girls / Female' : 'Women / Female' },
      { id: 'unisex', code: '3', name: 'Unisex', value: 'unisex', label: 'Unisex / All' },
    ];
  }, [dbGenders, isSchool]);

  const normalizeGender = React.useCallback((g?: string | null): string => {
    if (!g) return '';
    const s = String(g).trim().toLowerCase();
    if (!s) return '';

    // Direct match against availableGenders
    const directMatch = availableGenders.find((opt: any) =>
      opt.value.toLowerCase() === s ||
      (opt.name && opt.name.toLowerCase() === s) ||
      (opt.code && String(opt.code).toLowerCase() === s)
    );
    if (directMatch) return directMatch.value;

    // Semantic matching for male / boys / men
    if (s === 'male' || s === 'm' || s === 'boy' || s === 'boys' || s === 'men' || s === 'man' || s === '1') {
      const maleOpt = availableGenders.find((opt: any) => {
        const v = opt.value.toLowerCase();
        const n = (opt.name || '').toLowerCase();
        return v.includes('boy') || v.includes('male') || v.includes('men') || n.includes('boy') || n.includes('male') || n.includes('men') || opt.code === '1';
      });
      if (maleOpt) return maleOpt.value;
      return 'male';
    }

    // Semantic matching for female / girls / women
    if (s === 'female' || s === 'f' || s === 'girl' || s === 'girls' || s === 'women' || s === 'woman' || s === '2') {
      const femaleOpt = availableGenders.find((opt: any) => {
        const v = opt.value.toLowerCase();
        const n = (opt.name || '').toLowerCase();
        return v.includes('girl') || v.includes('female') || v.includes('women') || n.includes('girl') || n.includes('female') || n.includes('women') || opt.code === '2';
      });
      if (femaleOpt) return femaleOpt.value;
      return 'female';
    }

    // Semantic matching for unisex / all
    if (s === 'unisex' || s === 'all' || s === '3') {
      const unisexOpt = availableGenders.find((opt: any) => {
        const v = opt.value.toLowerCase();
        const n = (opt.name || '').toLowerCase();
        return v.includes('unisex') || v.includes('all') || n.includes('unisex') || n.includes('all') || opt.code === '3';
      });
      if (unisexOpt) return unisexOpt.value;
      return 'unisex';
    }

    return s;
  }, [availableGenders]);

  const getQty = (item: TemplateLineItem) => (orgAnalysis?.entities || []).filter((ent: any) => {
    if (ent.measurement_status !== 'Completed') return false;
    const eg = (ent.gender || '').toLowerCase().trim();
    const ig = (item.gender || '').toLowerCase().trim();
    if (!ig) return true;

    const matchedDbGender = dbGenders.find((dg: any) =>
      (dg.name || '').toLowerCase().trim() === ig ||
      (dg.code || '').toLowerCase().trim() === ig
    );

    if (matchedDbGender) {
      const dbName = (matchedDbGender.name || '').toLowerCase().trim();
      const dbCode = (matchedDbGender.code || '').toLowerCase().trim();
      if (dbName === 'unisex' || dbName === 'all' || dbCode === '3') return true;
      if (eg === dbName || eg === dbCode) return true;
      if ((dbName.includes('male') || dbName.includes('boy') || dbCode === '1') &&
          (eg === 'male' || eg === 'boy' || eg === 'boys' || eg === 'm' || eg === 'men' || eg === '1')) return true;
      if ((dbName.includes('female') || dbName.includes('girl') || dbCode === '2') &&
          (eg === 'female' || eg === 'girl' || eg === 'girls' || eg === 'f' || eg === 'women' || eg === '2')) return true;
      return eg === dbName || eg === dbCode;
    }

    if (ig === 'unisex' || ig === 'all' || ig === '3') return true;
    if (ig === 'male' || ig === 'm' || ig === 'boy' || ig === 'boys' || ig === '1' || ig === 'men') {
      return eg === 'male' || eg === 'm' || eg === 'boy' || eg === 'boys' || eg === '1' || eg === 'men';
    }
    if (ig === 'female' || ig === 'f' || ig === 'girl' || ig === 'girls' || ig === '2' || ig === 'women') {
      return eg === 'female' || eg === 'f' || eg === 'girl' || eg === 'girls' || eg === '2' || eg === 'women';
    }
    return eg === ig;
  }).length;

  const totalQty = mergedItems.reduce((s: number, item: any) => s + getQty(item), 0);
  const totalSAMMin = mergedItems.reduce((s: number, item: any) => s + (item.sam_value ? item.sam_value * getQty(item) : 0), 0);
  const totalPrice = mergedItems.reduce((s: number, item: any) => {
    const p = parseFloat(item.price_override || '0');
    return s + (p > 0 ? p * getQty(item) : 0);
  }, 0);

  // Department-wise Sizing & Measurement Audits setup
  const [deptAuditItems, setDeptAuditItems] = React.useState<Record<string, any[]>>({});

  const auditDepartments = React.useMemo<any[]>(() => {
    const selected = (orgDepartments || []).filter((d: any) => d.selected);
    if (selected.length > 0) return selected;
    if (orgDepartments && orgDepartments.length > 0) return orgDepartments;
    if (orgAnalysis?.departments && Array.isArray(orgAnalysis.departments) && orgAnalysis.departments.length > 0) {
      return orgAnalysis.departments.map((d: any) => ({
        id: String(d.id),
        name: d.name,
        division: d.division || d.section || '',
        selected: true,
        persons: String(d.persons || '0'),
        sets: String(d.sets || '2')
      }));
    }
    return [];
  }, [orgDepartments, orgAnalysis]);

  const uniqueTemplateProducts = React.useMemo<any[]>(() => {
    const map = new Map<string, any>();
    (templateLineItems || []).forEach((item: any) => {
      const pKey = String(item.product_id);
      if (!map.has(pKey)) {
        map.set(pKey, {
          ...item,
          gender: '', // Do NOT auto-assign gender! Let user select manually
          price_override: item.price_override || '',
          design_number_override: item.design_number_override || item.design_code || '',
        });
      }
    });
    return Array.from(map.values());
  }, [templateLineItems]);

  const getDeptAuditRowQty = React.useCallback((deptId: string, deptName: string, itemGender: string, fallbackCount: number) => {
    const cleanId = deptId.replace(/_.*$/, '');
    const deptEntities = (orgAnalysis?.entities || []).filter((e: any) => {
      const eid = String(e.department_id || '');
      return eid === deptId || eid === cleanId || (deptName && e.department_name === deptName);
    });

    const completed = deptEntities.filter((e: any) => e.measurement_status === 'Completed');
    const g = (itemGender || '').toLowerCase().trim();

    if (completed.length === 0) {
      return fallbackCount || 0;
    }
    if (!g) {
      return completed.length;
    }

    // Match against database genders
    const matchedDbGender = dbGenders.find((dg: any) =>
      (dg.name || '').toLowerCase().trim() === g ||
      (dg.code || '').toLowerCase().trim() === g
    );

    if (matchedDbGender) {
      const dbName = (matchedDbGender.name || '').toLowerCase().trim();
      const dbCode = (matchedDbGender.code || '').toLowerCase().trim();
      if (dbName === 'unisex' || dbName === 'all' || dbCode === '3') {
        return completed.length;
      }
      return completed.filter((e: any) => {
        const eg = (e.gender || '').toLowerCase().trim();
        if (eg === dbName || eg === dbCode) return true;
        if ((dbName.includes('male') || dbName.includes('boy') || dbCode === '1') &&
            (eg === 'male' || eg === 'boy' || eg === 'boys' || eg === 'm' || eg === 'men' || eg === '1')) return true;
        if ((dbName.includes('female') || dbName.includes('girl') || dbCode === '2') &&
            (eg === 'female' || eg === 'girl' || eg === 'girls' || eg === 'f' || eg === 'women' || eg === '2')) return true;
        return eg === dbName || eg === dbCode;
      }).length;
    }

    if (g === 'unisex' || g === 'all' || g === '3') {
      return completed.length;
    }
    if (g === 'male' || g === 'boy' || g === 'boys' || g === 'men' || g === '1' || g === 'm') {
      return completed.filter((e: any) => {
        const eg = (e.gender || '').toLowerCase().trim();
        return eg === 'male' || eg === 'boy' || eg === 'boys' || eg === 'm' || eg === 'men' || eg === '1';
      }).length;
    }
    if (g === 'female' || g === 'girl' || g === 'girls' || g === 'women' || g === '2' || g === 'f') {
      return completed.filter((e: any) => {
        const eg = (e.gender || '').toLowerCase().trim();
        return eg === 'female' || eg === 'girl' || eg === 'girls' || eg === 'f' || eg === 'women' || eg === '2';
      }).length;
    }
    return completed.filter((e: any) => {
      const eg = (e.gender || '').toLowerCase().trim();
      return eg === g;
    }).length;
  }, [orgAnalysis, dbGenders]);

  const updateDeptAuditRow = React.useCallback((deptId: string, rowIdx: number, updates: any) => {
    const base = deptAuditItems[deptId] || uniqueTemplateProducts.map((p: any, idx: number) => ({
      ...p,
      id: `${deptId}_${p.product_id}_${idx}`,
      department_id: deptId,
      department_name: auditDepartments.find((d: any) => String(d.id) === deptId)?.name || '',
      gender: '',
    }));
    const updatedRows = [...base];
    updatedRows[rowIdx] = { ...updatedRows[rowIdx], ...updates };
    const newMap = { ...deptAuditItems, [deptId]: updatedRows };
    setDeptAuditItems(newMap);

    const flat: any[] = [];
    Object.values(newMap).forEach((rows: any) => {
      if (Array.isArray(rows)) {
        rows.forEach((r: any) => flat.push(r));
      }
    });
    setTemplateLineItems(flat);
  }, [deptAuditItems, uniqueTemplateProducts, auditDepartments, setTemplateLineItems]);

  const addDeptAuditRow = React.useCallback((deptId: string, deptName: string) => {
    const base = deptAuditItems[deptId] || uniqueTemplateProducts.map((p: any, idx: number) => ({
      ...p,
      id: `${deptId}_${p.product_id}_${idx}`,
      department_id: deptId,
      department_name: deptName,
      gender: '',
    }));
    const first = uniqueTemplateProducts[0] || (allProducts && allProducts[0]) || {};
    const newRow = {
      ...first,
      id: `${deptId}_custom_${Date.now()}`,
      product_id: first.product_id || first.id || 0,
      product_name: first.product_name || first.name || 'Uniform Item',
      art_number: first.art_number || '',
      gender: '',
      sam_value: first.sam_value ?? null,
      materials: first.materials || '',
      design_number_override: '',
      price_override: '',
      department_id: deptId,
      department_name: deptName,
    };
    const updatedRows = [...base, newRow];
    const newMap = { ...deptAuditItems, [deptId]: updatedRows };
    setDeptAuditItems(newMap);

    const flat: any[] = [];
    Object.values(newMap).forEach((rows: any) => {
      if (Array.isArray(rows)) {
        rows.forEach((r: any) => flat.push(r));
      }
    });
    setTemplateLineItems(flat);
  }, [deptAuditItems, uniqueTemplateProducts, allProducts, setTemplateLineItems]);

  const removeDeptAuditRow = React.useCallback((deptId: string, rowIdx: number) => {
    const base = deptAuditItems[deptId] || uniqueTemplateProducts.map((p: any, idx: number) => ({
      ...p,
      id: `${deptId}_${p.product_id}_${idx}`,
      department_id: deptId,
      department_name: auditDepartments.find((d: any) => String(d.id) === deptId)?.name || '',
      gender: '',
    }));
    const updatedRows = base.filter((_: any, i: number) => i !== rowIdx);
    const newMap = { ...deptAuditItems, [deptId]: updatedRows };
    setDeptAuditItems(newMap);

    const flat: any[] = [];
    Object.values(newMap).forEach((rows: any) => {
      if (Array.isArray(rows)) {
        rows.forEach((r: any) => flat.push(r));
      }
    });
    setTemplateLineItems(flat);
  }, [deptAuditItems, uniqueTemplateProducts, auditDepartments, setTemplateLineItems]);

  // Helper: get inward rate for a fabric based on its category and width
  const getRateForFabric = (fabricId: string): string => {
    if (!fabricId) return '0.00';
    const fabric = fabricsList.find((f: any) => String(f.id) === fabricId);
    if (!fabric) return '0.00';

    const nameLower = (fabric.name || '').toLowerCase();
    let category = 'SHIRTING';
    if (nameLower.includes('suiting')) {
      category = 'SUITING';
    } else if (nameLower.includes('bottom') || nameLower.includes('pant') || nameLower.includes('trouser')) {
      category = 'BOTTOM';
    }

    const widthStr = String(fabric.width || '');
    const matched = inwardRates.find(
      (r: any) => r.item?.toUpperCase() === category && String(r.width) === widthStr
    );
    if (matched) return parseFloat(matched.rate).toFixed(2);

    const matchingWidth = inwardRates.filter((r: any) => String(r.width) === widthStr);
    if (matchingWidth.length > 0) {
      const avg = matchingWidth.reduce((s: number, r: any) => s + parseFloat(r.rate || 0), 0) / matchingWidth.length;
      return avg.toFixed(2);
    }
    return '0.00';
  };

  const getMarginForFabric = (fabricId: string): number => {
    if (!fabricId) return 0;
    const fabric = fabricsList.find((f: any) => String(f.id) === fabricId);
    if (!fabric) return 0;
    const marginRow = fabricMargins.find(
      (m: any) => m.sales_type?.toUpperCase() === salesType.toUpperCase() &&
        m.customer_type?.toUpperCase() === customerType.toUpperCase()
    );
    if (!marginRow) return 0;
    const brandType = (fabric.brand_type || '').toLowerCase();
    if (brandType.includes('branded') && !brandType.includes('semi')) {
      return parseFloat(marginRow.branded) || 0;
    } else if (brandType.includes('semi')) {
      return parseFloat(marginRow.semi_branded) || 0;
    } else {
      return parseFloat(marginRow.non_branded) || 0;
    }
  };

  // Compute costs for a single item
  const getItemCosts = (item: ManualItem) => {
    if (getItemKind(item) === 'CUSTOM') {
      const rate = parseFloat(item.price) || 0;
      return {
        mainFabricCost: 0, att1Cost: 0, att2Cost: 0, buttonCost: 0, threadCost: 0, samCost: 0,
        unitTotal: rate, btnPrice: 0, thrPrice: 0,
        calcMainFabricCost: 0, calcAtt1Cost: 0, calcAtt2Cost: 0, calcSamCost: 0
      };
    }
    const calcMainFabricCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
    const calcAtt1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
    const calcAtt2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);

    const mainFabricCost = (item.main_fabric_cost !== undefined && item.main_fabric_cost !== '' && !isNaN(parseFloat(item.main_fabric_cost)))
      ? parseFloat(item.main_fabric_cost)
      : calcMainFabricCost;

    const att1Cost = (item.attachment_fabric1_cost !== undefined && item.attachment_fabric1_cost !== '' && !isNaN(parseFloat(item.attachment_fabric1_cost)))
      ? parseFloat(item.attachment_fabric1_cost)
      : calcAtt1Cost;

    const att2Cost = (item.attachment_fabric2_cost !== undefined && item.attachment_fabric2_cost !== '' && !isNaN(parseFloat(item.attachment_fabric2_cost)))
      ? parseFloat(item.attachment_fabric2_cost)
      : calcAtt2Cost;

    const buttonCost = 0; // included in product price
    const threadCost = 0; // included in product price

    const calcSamCost = calculateProductSAMCost(item.sam_value, item.quantity);
    const samCost = (item.final_sam_price !== undefined && item.final_sam_price !== '' && !isNaN(parseFloat(item.final_sam_price)))
      ? parseFloat(item.final_sam_price)
      : calcSamCost;

    const unitTotal = mainFabricCost + att1Cost + att2Cost + buttonCost + threadCost + samCost;
    const btnPrice = buttonsList.find((b: any) => String(b.id) === String(item.button_id))?.unit_price || 0;
    const thrPrice = threadsList.find((t: any) => String(t.id) === String(item.thread_id))?.unit_price || 0;
    return {
      mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost, unitTotal, btnPrice, thrPrice,
      calcMainFabricCost, calcAtt1Cost, calcAtt2Cost, calcSamCost
    };
  };

  // Check backend for existing DNS match based on (ART # + Fabrics + Trims)
  const resolveCandidateDns = React.useCallback(async (candidate: ManualItem): Promise<string> => {
    if (!candidate.art_number && !candidate.product_id) return '';
    try {
      const res = await api.post('/quotations/resolve-design-number', {
        art_number: candidate.art_number,
        product_id: candidate.product_id,
        fabric_id: candidate.fabric_id,
        attachment_fabric1_id: candidate.attachment_fabric1_id,
        attachment_fabric2_id: candidate.attachment_fabric2_id,
        button_id: candidate.button_id,
        thread_id: candidate.thread_id,
        trims: candidate.trims,
        dryRun: true
      });
      if (res.data?.success && res.data?.design_number) {
        return res.data.design_number;
      }
    } catch {
      // fallback
    }
    return '';
  }, []);

  // Update an item and auto-recompute price
  const updateItem = (index: number, changes: Partial<ManualItem>) => {
    const updated = [...manualItems];
    const prevItem = updated[index] || {};
    const newItem = { ...prevItem, ...changes };

    // Auto-convert main fabric meters if fabric changed to a non-58" width
    if ('fabric_id' in changes && !('main_fabric_meters' in changes)) {
      const selFab = fabricsList.find((f: any) => String(f.id) === String(newItem.fabric_id));
      const prod = allProducts.find((p: any) => String(p.id) === String(newItem.product_id));
      const baseMeters = newItem.base_main_fabric_meters || (prod ? String(prod.main_fabric || prod.main_fabric_meters || '') : '') || newItem.main_fabric_meters;
      if (baseMeters) {
        newItem.base_main_fabric_meters = baseMeters;
        if (selFab?.width && Number(selFab.width) !== 58) {
          newItem.main_fabric_meters = convertFabricMetersByWidth(baseMeters, selFab.width);
        } else {
          newItem.main_fabric_meters = baseMeters;
        }
      }
    } else if ('main_fabric_meters' in changes && !('base_main_fabric_meters' in changes)) {
      const selFab = fabricsList.find((f: any) => String(f.id) === String(newItem.fabric_id));
      const fabWidth = selFab?.width ? Number(selFab.width) : 58;
      newItem.base_main_fabric_meters = (fabWidth && fabWidth !== 58 && Number(changes.main_fabric_meters) > 0)
        ? String(Number(changes.main_fabric_meters) * fabWidth / 58)
        : String(changes.main_fabric_meters || '');
    }

    // Auto-convert attachment fabric 1 meters if fabric changed to a non-58" width
    if ('attachment_fabric1_id' in changes && !('attachment_fabric1_meters' in changes)) {
      const selFab = fabricsList.find((f: any) => String(f.id) === String(newItem.attachment_fabric1_id));
      const baseMeters = newItem.base_attachment_fabric1_meters || newItem.attachment_fabric1_meters;
      if (baseMeters) {
        newItem.base_attachment_fabric1_meters = baseMeters;
        if (selFab?.width && Number(selFab.width) !== 58) {
          newItem.attachment_fabric1_meters = convertFabricMetersByWidth(baseMeters, selFab.width);
        } else {
          newItem.attachment_fabric1_meters = baseMeters;
        }
      }
    } else if ('attachment_fabric1_meters' in changes && !('base_attachment_fabric1_meters' in changes)) {
      const selFab = fabricsList.find((f: any) => String(f.id) === String(newItem.attachment_fabric1_id));
      const fabWidth = selFab?.width ? Number(selFab.width) : 58;
      newItem.base_attachment_fabric1_meters = (fabWidth && fabWidth !== 58 && Number(changes.attachment_fabric1_meters) > 0)
        ? String(Number(changes.attachment_fabric1_meters) * fabWidth / 58)
        : String(changes.attachment_fabric1_meters || '');
    }

    // Auto-convert attachment fabric 2 meters if fabric changed to a non-58" width
    if ('attachment_fabric2_id' in changes && !('attachment_fabric2_meters' in changes)) {
      const selFab = fabricsList.find((f: any) => String(f.id) === String(newItem.attachment_fabric2_id));
      const baseMeters = newItem.base_attachment_fabric2_meters || newItem.attachment_fabric2_meters;
      if (baseMeters) {
        newItem.base_attachment_fabric2_meters = baseMeters;
        if (selFab?.width && Number(selFab.width) !== 58) {
          newItem.attachment_fabric2_meters = convertFabricMetersByWidth(baseMeters, selFab.width);
        } else {
          newItem.attachment_fabric2_meters = baseMeters;
        }
      }
    } else if ('attachment_fabric2_meters' in changes && !('base_attachment_fabric2_meters' in changes)) {
      const selFab = fabricsList.find((f: any) => String(f.id) === String(newItem.attachment_fabric2_id));
      const fabWidth = selFab?.width ? Number(selFab.width) : 58;
      newItem.base_attachment_fabric2_meters = (fabWidth && fabWidth !== 58 && Number(changes.attachment_fabric2_meters) > 0)
        ? String(Number(changes.attachment_fabric2_meters) * fabWidth / 58)
        : String(changes.attachment_fabric2_meters || '');
    }

    // Readymade rate follows the calculated cost until the user types a rate by hand.
    // Accessory / fabric rates are always entered (or prefilled) directly.
    if (getItemKind(newItem) === 'READYMADE' && !newItem.rate_manual) {
      newItem.price = getItemCosts(newItem).unitTotal.toFixed(2);
    }
    updated[index] = newItem;
    setManualItems(updated);

    if (
      'art_number' in changes ||
      'product_id' in changes ||
      'fabric_id' in changes ||
      'attachment_fabric1_id' in changes ||
      'attachment_fabric2_id' in changes ||
      'button_id' in changes ||
      'thread_id' in changes ||
      'trims' in changes
    ) {
      resolveCandidateDns(newItem).then((matched) => {
        setManualItems((curr: any) => {
          const fresh = [...(curr || [])];
          if (fresh[index] && fresh[index].id === newItem.id) {
            fresh[index] = { ...fresh[index], design_number: matched || '' };
          }
          return fresh;
        });
      });
    }
  };

  // Pre-index available ART Numbers from allProducts for quick auto-loading & autocomplete
  const artNumbersByKind = React.useMemo(() => {
    type ArtEntry = { art_number: string; product_name: string; product_id: number; product_type_id: number };
    const accessory: ArtEntry[] = [];
    const garment: ArtEntry[] = [];
    const seenAcc = new Set<string>();
    const seenGar = new Set<string>();
    (allProducts || []).forEach((p: any) => {
      if (!p.art_number || !String(p.art_number).trim()) return;
      const isAcc = isAccessoryProduct(p);
      const art = String(p.art_number).trim();
      const lower = art.toLowerCase();
      const seen = isAcc ? seenAcc : seenGar;
      if (seen.has(lower)) return;
      seen.add(lower);
      (isAcc ? accessory : garment).push({
        art_number: art,
        product_name: formatProductDisplayName(p, masterItems) || p.name || 'Uniform Item',
        product_id: p.id,
        product_type_id: p.product_type_id
      });
    });
    return { accessory, garment };
  }, [allProducts, isAccessoryProduct, masterItems]);

  // Plain function (not memoised) so it always uses the current costing inputs
  const handleApplyArtNumber = (artVal: string, currentItem: ManualItem, deptName?: string): Partial<ManualItem> => {
    const clean = (artVal || '').trim();
    if (!clean) {
      return { art_number: '' };
    }

    const cleanLower = clean.toLowerCase();
    const cleanNoDash = cleanLower.replace(/[-\s]/g, '');
    const isAccessoryType = getItemKind(currentItem) === 'ACCESSORY';

    // Try finding matching product in allProducts: exact match first, then normalized (ignoring hyphens/spaces)
    const matchedProd = (allProducts || []).find((p: any) => {
      if (!p.art_number) return false;
      const isAcc = isAccessoryProduct(p);
      if (isAccessoryType && !isAcc) return false;
      if (!isAccessoryType && isAcc) return false;

      const pArt = String(p.art_number).trim().toLowerCase();
      if (pArt === cleanLower) return true;
      const pArtNoDash = pArt.replace(/[-\s]/g, '');
      return cleanNoDash.length >= 3 && pArtNoDash === cleanNoDash;
    });

    if (matchedProd) {
      if (isAccessoryProduct(matchedProd)) {
        const basePrice = parseFloat(matchedProd.base_price || matchedProd.retail_sam_value || '0') || 0;
        return {
          art_number: matchedProd.art_number || clean,
          product_id: String(matchedProd.id),
          product_type_id: String(matchedProd.product_type_id || currentItem.product_type_id || ''),
          design_number: matchedProd.design_number || 'ACC-STANDARD',
          gender: normalizeGender(matchedProd.gender) || currentItem.gender || 'unisex',
          price: basePrice > 0 ? basePrice.toFixed(2) : (currentItem.price || '0.00'),
          size_breakdown: {
            ...(currentItem.size_breakdown || {}),
            selected_size: matchedProd.base_size || 'Free Size',
            is_accessory: true
          }
        };
      }

      const autoDefaults = getAutoProductDefaults({
        prod: matchedProd,
        isSchool,
        deptName: deptName || '',
        fabricsList,
        buttonsList,
        threadsList,
        trimsList,
        trimCategories
      });

      const formattedProdName = formatProductDisplayName(matchedProd, masterItems);
      const updates: Partial<ManualItem> = {
        art_number: matchedProd.art_number || clean,
        product_id: String(matchedProd.id),
        product_type_id: String(matchedProd.product_type_id || currentItem.product_type_id || ''),
        product_name: formattedProdName || matchedProd.name || '',
        name: formattedProdName || matchedProd.name || '',
        design_number: '',
        final_sam_price: undefined,
        main_fabric_cost: undefined,
        attachment_fabric1_cost: undefined,
        attachment_fabric2_cost: undefined,
      };

      if (matchedProd.gender) {
        const normG = normalizeGender(matchedProd.gender);
        if (!currentItem.gender || (normG && normG !== 'unisex')) {
          updates.gender = normG;
        }
      }

      if (autoDefaults) {
        updates.sam_value = autoDefaults.sam_value;
        updates.base_main_fabric_meters = autoDefaults.base_main_fabric_meters || autoDefaults.main_fabric_meters;
        updates.main_fabric_meters = autoDefaults.main_fabric_meters;
        updates.base_attachment_fabric1_meters = autoDefaults.base_attachment_fabric1_meters || autoDefaults.attachment_fabric1_meters;
        updates.attachment_fabric1_meters = autoDefaults.attachment_fabric1_meters;
        updates.base_attachment_fabric2_meters = autoDefaults.base_attachment_fabric2_meters || autoDefaults.attachment_fabric2_meters;
        updates.attachment_fabric2_meters = autoDefaults.attachment_fabric2_meters;
        updates.button_count = autoDefaults.button_count;
        updates.thread_count = autoDefaults.thread_count;
        if (autoDefaults.fabric_id) updates.fabric_id = autoDefaults.fabric_id;
        if (autoDefaults.attachment_fabric1_id) updates.attachment_fabric1_id = autoDefaults.attachment_fabric1_id;
        if (autoDefaults.attachment_fabric2_id) updates.attachment_fabric2_id = autoDefaults.attachment_fabric2_id;
        if (autoDefaults.button_id) updates.button_id = autoDefaults.button_id;
        if (autoDefaults.thread_id) updates.thread_id = autoDefaults.thread_id;
        if (autoDefaults.trims) updates.trims = autoDefaults.trims;
        updates.main_fabric_sam = autoDefaults.main_fabric_sam;
        updates.attachment_fabric1_sam = autoDefaults.attachment_fabric1_sam;
        updates.attachment_fabric2_sam = autoDefaults.attachment_fabric2_sam;
      }

      if (!currentItem.rate_manual) {
        const costs = getItemCosts({ ...currentItem, ...updates });
        updates.price = costs.unitTotal.toFixed(2);
      }

      return updates;
    }

    // No matching product in database yet - update art_number so user can keep typing freely
    return { art_number: artVal };
  };

  const updateItemTrim = (itemIndex: number, trimIndex: number, changes: any) => {
    const updated = [...manualItems];
    const item = { ...updated[itemIndex] };
    const curTrims = (item.trims && Array.isArray(item.trims)) ? [...item.trims] : [];
    while (curTrims.length <= trimIndex) {
      curTrims.push({
        id: newLocalId(),
        trim_id: '',
        category: 'Trim',
        name: '',
        count: '1',
        uom: 'pcs',
        unit_price: 0
      });
    }
    curTrims[trimIndex] = { ...curTrims[trimIndex], ...changes };
    item.trims = curTrims;

    const btn = curTrims.find((t: any) => (t.category || '').toLowerCase().includes('button') || (t.name || '').toLowerCase().includes('button') || String(t.id).startsWith('btn'));
    if (btn) {
      item.button_id = btn.trim_id || '';
      item.button_count = btn.count || '';
    }
    const thr = curTrims.find((t: any) => (t.category || '').toLowerCase().includes('thread') || (t.name || '').toLowerCase().includes('thread') || String(t.id).startsWith('thr'));
    if (thr) {
      item.thread_id = thr.trim_id || '';
      item.thread_count = thr.count || '1';
    }

    if (!item.rate_manual) item.price = getItemCosts(item).unitTotal.toFixed(2);
    updated[itemIndex] = item;
    setManualItems(updated);

    resolveCandidateDns(item).then((matched) => {
      setManualItems((curr: any) => {
        const fresh = [...(curr || [])];
        if (fresh[itemIndex] && fresh[itemIndex].id === item.id) {
          fresh[itemIndex] = { ...fresh[itemIndex], design_number: matched || '' };
        }
        return fresh;
      });
    });
  };

  const addItemTrim = (itemIndex: number, category = 'Trim') => {
    const updated = [...manualItems];
    const item = { ...updated[itemIndex] };
    const curTrims = (item.trims && Array.isArray(item.trims)) ? [...item.trims] : [];
    const meta = getTrimCategoryMeta(category);
    curTrims.push({
      id: Date.now() + Math.random(),
      trim_id: '',
      category: category,
      name: '',
      count: meta.isThr ? (item.thread_count || '1') : '1',
      uom: meta.defaultUom,
      unit_price: 0
    });
    item.trims = curTrims;
    updated[itemIndex] = item;
    setManualItems(updated);
  };

  const removeItemTrim = (itemIndex: number, trimIndex: number) => {
    const updated = [...manualItems];
    const item = { ...updated[itemIndex] };
    const curTrims = (item.trims && Array.isArray(item.trims)) ? [...item.trims] : [];
    curTrims.splice(trimIndex, 1);
    item.trims = curTrims;
    if (!item.rate_manual) item.price = getItemCosts(item).unitTotal.toFixed(2);
    updated[itemIndex] = item;
    setManualItems(updated);
  };

  // ── Item lines: every line is added/edited in a modal, then shown in the item table ──
  // The modal edits the line in place inside manualItems so all existing readymade logic
  // (ART auto-load, trims, DNS resolution, costing) keeps working unchanged.
  const [modalLine, setModalLine] = useState<{ id: number; isNew: boolean; snapshot: ManualItem | null } | null>(null);
  const modalIndex = modalLine ? manualItems.findIndex(it => it.id === modalLine.id) : -1;
  const modalItem = modalIndex >= 0 ? manualItems[modalIndex] : null;

  const patchLine = (index: number, changes: Partial<ManualItem>) => {
    const updated = [...manualItems];
    if (!updated[index]) return;
    updated[index] = { ...updated[index], ...changes };
    setManualItems(updated);
  };

  const openAddLine = (kind: ItemKind) => {
    const line = createBlankLine(kind);
    setManualItems([...manualItems, line]);
    setModalLine({ id: line.id, isNew: true, snapshot: null });
  };

  const openEditLine = (index: number) => {
    const item = manualItems[index];
    if (!item) return;
    setModalLine({ id: item.id, isNew: false, snapshot: JSON.parse(JSON.stringify(item)) });
  };

  const cancelModal = () => {
    if (!modalLine) return;
    const { id, isNew, snapshot } = modalLine;
    if (isNew) {
      setManualItems((curr: ManualItem[]) => curr.filter(it => it.id !== id));
    } else if (snapshot) {
      setManualItems((curr: ManualItem[]) => curr.map(it => (it.id === id ? snapshot : it)));
    }
    setModalLine(null);
  };

  const saveModal = () => {
    if (!modalItem || getLineError(modalItem)) return;
    setModalLine(null);
  };

  const deleteLine = (index: number) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const changeLineQty = (index: number, value: string) => {
    const item = manualItems[index];
    if (!item) return;
    const next: ManualItem = { ...item, quantity: value, qty_mode: 'direct_products' };
    // SAM cost depends on quantity slabs, so a readymade's calculated rate follows the quantity
    if (getItemKind(next) === 'READYMADE' && !next.rate_manual) {
      next.price = getItemCosts(next).unitTotal.toFixed(2);
    }
    const updated = [...manualItems];
    updated[index] = next;
    setManualItems(updated);
  };

  const changeLineRate = (index: number, value: string) => {
    patchLine(index, { price: value, rate_manual: true });
  };

  const getDefaultFabricRate = (fabricId: string): string => {
    const fabric = fabricsList.find((f: any) => String(f.id) === String(fabricId));
    if (!fabric) return '';
    const calculatedRate = calculateFabricCost(fabric.id, '1', '6.777', '');
    return calculatedRate > 0 ? calculatedRate.toFixed(2) : (parseFloat(fabric.cost_per_meter) || 0).toFixed(2);
  };

  const getLineView = (item: ManualItem, index: number): ItemLineView => {
    const line = getLineDisplayView(item, allProducts, fabricsList, masterItems);
    return { item, index, title: line.title, subtitle: line.subtitle };
  };

  // Shared select style
  const selectCls = "w-full px-2.5 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]/20 bg-white transition-all";
  const inputCls = "px-2.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]/20 text-center transition-all w-full disabled:opacity-40 disabled:cursor-not-allowed";

  const renderManualItemCard = (item: ManualItem, index: number) => {
    const {
      mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost,
      unitTotal: calculatedUnitTotal, btnPrice, thrPrice,
      calcMainFabricCost, calcAtt1Cost, calcAtt2Cost, calcSamCost
    } = getItemCosts(item);
    // The card is driven by the line's own kind (readymade or accessory); fabric lines use renderFabricLineForm.
    const isAccessoryType = getItemKind(item) === 'ACCESSORY';
    const quotationType: string = isAccessoryType ? 'ACCESSORIES' : 'STANDARD';
    const displayProductTypes = isAccessoryType ? productTypesByKind.accessory : productTypesByKind.garment;
    const availableArtNumbers = isAccessoryType ? artNumbersByKind.accessory : artNumbersByKind.garment;
    const unitTotal = (isAccessoryType || item.rate_manual) ? (parseFloat(item.price) || 0) : calculatedUnitTotal;

    const matchedProduct = (allProducts || []).find((p: any) => {
      if (item.product_id && String(p.id) === String(item.product_id)) return true;
      if (!item.art_number) return false;
      const clean = item.art_number.trim().toLowerCase();
      const cleanNoDash = clean.replace(/[-\s]/g, '');
      const pArt = (p.art_number || '').trim().toLowerCase();
      const pArtNoDash = pArt.replace(/[-\s]/g, '');
      return pArt === clean || (cleanNoDash.length >= 3 && pArtNoDash === cleanNoDash);
    });

    const filteredProducts = (allProducts || []).filter(p => {
      const isAcc = isAccessoryProduct(p);
      if (isAccessoryType) {
        if (!isAcc) return false;
        if (item.product_type_id && String(p.product_type_id) !== String(item.product_type_id)) {
          return false;
        }
        return true;
      }
      if (isAcc) return false;

      const isCorrectCategory = String(p.product_type_id) === String(item.product_type_id);
      if (quotationType === 'STANDARD') {
        // In-house garments only. The Items form saves readymade products WITHOUT a
        // [ProductType: ...] tag, so an untagged product counts as in-house readymade;
        // only explicitly tagged non-in-house products (e.g. trade readymades) are excluded.
        const parsedType = (parseMaterialsField(p.materials).type || '').toLowerCase();
        if (parsedType && parsedType !== 'readymade' && parsedType !== 'custom_manufactured') return false;
      }
      if (!isCorrectCategory) return false;

      // Filter by gender if specified
      const itemGen = (item.gender || 'unisex').toLowerCase();
      const prodGen = (p.gender || '').toLowerCase();
      if (itemGen === 'male' || itemGen === 'boy' || itemGen === 'boys' || itemGen === 'men') {
        return prodGen === 'male' || prodGen === 'boys' || prodGen === 'boy' || prodGen === 'men' || prodGen === 'unisex' || prodGen === 'all' || !prodGen;
      }
      if (itemGen === 'female' || itemGen === 'girl' || itemGen === 'girls' || itemGen === 'women') {
        return prodGen === 'female' || prodGen === 'girls' || prodGen === 'girl' || prodGen === 'women' || prodGen === 'unisex' || prodGen === 'all' || !prodGen;
      }
      return true;
    });


    const mainFabric = fabricsList.find((f: any) => String(f.id) === item.fabric_id);
    const att1Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric1_id);
    const att2Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric2_id);

    return (
      <div key={item.id} className="bg-white">

        {/* ── Card Header ── */}
          <div className="pb-6 border-b border-zinc-100">
            {/* ── TOP SECTION: ART NUMBER & QUICK SPEC IDENTIFIER ── */}
            <div className="mb-5 p-4 bg-sky-50/50 border border-sky-100 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <div className="min-w-[240px] max-w-[340px] flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                      <Hash size={13} className="text-sky-600" />
                      ART Number
                    </label>
                    {matchedProduct && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-emerald-600" /> Auto-loaded: {formatProductDisplayName(matchedProduct, masterItems) || matchedProduct.name}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list={`art-list-manual-${index}`}
                      value={item.art_number || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates = handleApplyArtNumber(val, item);
                        updateItem(index, updates);
                      }}
                      placeholder="Enter ART # to auto-load product..."
                      className="w-full px-3 py-2 text-xs font-mono font-black border border-sky-300 rounded-xl text-sky-950 bg-white placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs"
                    />
                    <datalist id={`art-list-manual-${index}`}>
                      {availableArtNumbers.map(a => (
                        <option key={a.art_number} value={a.art_number}>
                          {a.product_name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="min-w-[170px]">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-700 mb-1">
                    Design # (DNS Code)
                  </label>
                  <div className="h-[38px] px-3 py-1.5 border border-indigo-200 rounded-xl bg-indigo-50/70 flex items-center justify-between gap-2 shadow-inner">
                    <span className="text-xs font-mono font-black text-indigo-950 truncate">
                      {item.design_number && !item.design_number.startsWith('Auto') ? item.design_number : 'Auto (BOM Mint)'}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider shrink-0 ${
                      item.design_number && !item.design_number.startsWith('Auto')
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    }`}>
                      {item.design_number && !item.design_number.startsWith('Auto') ? 'Matched' : 'Auto on Save'}
                    </span>
                  </div>
                </div>

                
              </div>
            </div>

            <div className="flex items-start gap-4 flex-wrap">
              {/* Department Dropdown */}
              {orgDepartments && orgDepartments.length > 0 && (
                <div className="min-w-[150px]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Department</p>
                  <Select
                    className={selectCls}
                    value={item.department_id || ''}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      const selectedD = orgDepartments.find((d: any) => String(d.id) === deptId);
                      updateItem(index, {
                        department_id: deptId,
                        department_name: selectedD ? (selectedD.division ? `${selectedD.name} (${selectedD.division})` : selectedD.name) : ''
                      });
                    }}
                  >
                    <option value="">General / None</option>
                    {orgDepartments.map((d: any) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}{d.division ? ` (${d.division})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Gender Dropdown */}
              <div className="min-w-[130px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-900 mb-1.5 font-bold">Gender</p>
                <Select
                  className={selectCls}
                  value={normalizeGender(item.gender)}
                  onChange={(e) => updateItem(index, { gender: e.target.value })}
                >
                  <option value="">Select Gender...</option>
                  {availableGenders.map((g: any) => (
                    <option key={g.id || g.code || g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Product Type */}
              <div className="min-w-[150px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product Type</p>
                <Select
                  className={selectCls}
                  value={item.product_type_id}
                  onChange={(e) => updateItem(index, {
                    product_type_id: e.target.value,
                    product_id: '', sam_value: '', design_number: ''
                  })}
                >
                  <option value="">Select type...</option>
                  {displayProductTypes.map(pt => (
                    <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                  ))}
                </Select>
              </div>

              {/* Specification (Replaces Product for readymades) */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  {isAccessoryType ? 'Product' : 'Specification'}
                </p>
                <Select
                  className={`${selectCls} ${!item.product_type_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={item.product_id || ''}
                  disabled={!item.product_type_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    const prod = allProducts.find(p => String(p.id) === val);
                    const formattedTitle = formatProductDisplayName(prod, masterItems);
                    const updates: Partial<ManualItem> = {
                      product_id: val,
                      product_type_id: String(prod?.product_type_id || item.product_type_id || ''),
                      product_name: formattedTitle || prod?.name || '',
                      name: formattedTitle || prod?.name || ''
                    };
                    if (isAccessoryType) {
                      if (prod) {
                        const basePrice = parseFloat(prod.base_price || prod.retail_sam_value || '0') || 0;
                        updateItem(index, {
                          product_id: val,
                          product_type_id: String(prod.product_type_id || item.product_type_id || ''),
                          art_number: prod.art_number || item.art_number || '',
                          gender: normalizeGender(prod.gender) || item.gender || 'unisex',
                          price: basePrice > 0 ? basePrice.toFixed(2) : (item.price || '0.00'),
                          size_breakdown: {
                            ...(item.size_breakdown || {}),
                            selected_size: prod.base_size || 'Free Size',
                            is_accessory: true
                          }
                        });
                      } else {
                        updateItem(index, { product_id: '', art_number: '', price: '' });
                      }
                      return;
                    }
                    if (prod) {
                      const autoDefaults = getAutoProductDefaults({
                        prod,
                        isSchool,
                        fabricsList,
                        buttonsList,
                        threadsList,
                        trimsList,
                        trimCategories
                      });
                      if (autoDefaults) {
                        updates.sam_value = autoDefaults.sam_value;
                        updates.base_main_fabric_meters = autoDefaults.base_main_fabric_meters || autoDefaults.main_fabric_meters;
                        updates.main_fabric_meters = autoDefaults.main_fabric_meters;
                        updates.base_attachment_fabric1_meters = autoDefaults.base_attachment_fabric1_meters || autoDefaults.attachment_fabric1_meters;
                        updates.attachment_fabric1_meters = autoDefaults.attachment_fabric1_meters;
                        updates.base_attachment_fabric2_meters = autoDefaults.base_attachment_fabric2_meters || autoDefaults.attachment_fabric2_meters;
                        updates.attachment_fabric2_meters = autoDefaults.attachment_fabric2_meters;
                        updates.button_count = autoDefaults.button_count;
                        updates.thread_count = autoDefaults.thread_count;
                        if (autoDefaults.fabric_id) updates.fabric_id = autoDefaults.fabric_id;
                        if (autoDefaults.attachment_fabric1_id) updates.attachment_fabric1_id = autoDefaults.attachment_fabric1_id;
                        if (autoDefaults.attachment_fabric2_id) updates.attachment_fabric2_id = autoDefaults.attachment_fabric2_id;
                        if (autoDefaults.button_id) updates.button_id = autoDefaults.button_id;
                        if (autoDefaults.thread_id) updates.thread_id = autoDefaults.thread_id;
                        if (autoDefaults.trims) updates.trims = autoDefaults.trims;
                        updates.main_fabric_sam = autoDefaults.main_fabric_sam;
                        updates.attachment_fabric1_sam = autoDefaults.attachment_fabric1_sam;
                        updates.attachment_fabric2_sam = autoDefaults.attachment_fabric2_sam;
                        updates.design_number = '';
                        updates.art_number = prod.art_number || autoDefaults.art_number || item.art_number || '';
                        updates.final_sam_price = undefined;
                        updates.main_fabric_cost = undefined;
                        updates.attachment_fabric1_cost = undefined;
                        updates.attachment_fabric2_cost = undefined;
                      } else {
                        updates.art_number = prod.art_number || item.art_number || '';
                        updates.final_sam_price = undefined;
                        updates.main_fabric_cost = undefined;
                        updates.attachment_fabric1_cost = undefined;
                        updates.attachment_fabric2_cost = undefined;
                      }
                      updates.materials = prod.materials || '';
                      if (prod.gender) {
                        const normG = normalizeGender(prod.gender);
                        if (!item.gender || (normG && normG !== 'unisex')) {
                          updates.gender = normG;
                        }
                      }
                    } else {
                      updates.sam_value = '';
                      updates.main_fabric_meters = '';
                      updates.attachment_fabric1_meters = '';
                      updates.attachment_fabric2_meters = '';
                      updates.button_count = '';
                      updates.thread_count = '';
                      updates.trims = [];
                      updates.main_fabric_sam = '';
                      updates.attachment_fabric1_sam = '';
                      updates.attachment_fabric2_sam = '';
                      updates.design_number = '';
                      updates.art_number = '';
                      updates.final_sam_price = undefined;
                      updates.main_fabric_cost = undefined;
                      updates.attachment_fabric1_cost = undefined;
                      updates.attachment_fabric2_cost = undefined;
                    }
                    updateItem(index, updates);
                  }}
                >
                  <option value="">{isAccessoryType ? 'Select accessory...' : (item.product_type_id ? 'Select specification...' : 'Select type first')}</option>
                  {filteredProducts.map(p => {
                    const specLabel = !isAccessoryType
                      ? (formatSpecificationDisplayName(p, masterItems) || formatProductDisplayName(p, masterItems) || p.name)
                      : (formatProductDisplayName(p, masterItems) || p.name);
                    return (
                      <option key={p.id} value={String(p.id)}>
                        {specLabel}{p.art_number ? ` (${p.art_number})` : ''}{isAccessoryType && p.base_price ? ` — ₹${parseFloat(p.base_price).toFixed(2)}` : ''}
                      </option>
                    );
                  })}
                </Select>
              </div>

              {/* Selected Size (for MANUAL and ACCESSORIES types) */}
              {(quotationType === 'MANUAL' || isAccessoryType) && (
                <div className="w-32">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Size
                  </p>
                  {isAccessoryType ? (
                    <input
                      type="text"
                      placeholder="Free Size"
                      value={item.size_breakdown?.selected_size || ''}
                      onChange={(e) => updateItem(index, {
                        size_breakdown: { ...(item.size_breakdown || {}), selected_size: e.target.value, is_accessory: true }
                      })}
                      className={inputCls}
                    />
                  ) : (
                    <Select
                      className={selectCls}
                      value={item.size_breakdown?.selected_size || ''}
                      onChange={(e) => updateItem(index, {
                        size_breakdown: { ...(item.size_breakdown || {}), selected_size: e.target.value }
                      })}
                    >
                      <option value="">Select size...</option>
                      {(() => {
                        const prod = allProducts.find((p: any) => String(p.id) === String(item.product_id));
                        const sizes = prod?.other_sizes
                          ? prod.other_sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
                          : [];
                        return sizes.map((sz: string) => (
                          <option key={sz} value={sz}>{sz}</option>
                        ));
                      })()}
                    </Select>
                  )}
                </div>
              )}

              {/* Product SAM (Read-Only) */}
              {quotationType !== 'READYMADE' && !isAccessoryType && (
                <div className="w-24">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product SAM</p>
                  <input
                    type="text"
                    readOnly
                    value={item.sam_value || '0'}
                    className={`${inputCls} bg-zinc-100/90 text-zinc-500 cursor-not-allowed font-mono select-none`}
                    title="Product SAM is read-only. Edit Final SAM Price to override calculation."
                  />
                </div>
              )}

              {/* Final SAM Price (Editable) */}
              {quotationType !== 'READYMADE' && !isAccessoryType && (
                <div className="w-32">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#8b6b5a] mb-1.5 font-bold">Final SAM Price (₹)</p>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={calcSamCost.toFixed(2)}
                    value={item.final_sam_price !== undefined ? item.final_sam_price : ((item.product_id || item.sam_value) ? calcSamCost.toFixed(2) : '')}
                    onChange={(e) => updateItem(index, { final_sam_price: e.target.value })}
                    onBlur={() => {
                      if (item.final_sam_price === '') {
                        updateItem(index, { final_sam_price: undefined });
                      }
                    }}
                    className={`${inputCls} font-mono font-bold text-[#8b6b5a] border-[#8b6b5a]/30 focus:border-[#8b6b5a] focus:ring-[#8b6b5a]/20`}
                    title="Enter custom final SAM price or leave empty to use auto-calculated SAM cost"
                  />
                </div>
              )}

              {/* Unit Price (for READYMADE and ACCESSORIES) */}
              {(quotationType === 'READYMADE' || isAccessoryType) && (
                <div className="w-28">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#C82A2B] mb-1.5 font-bold">Unit Price (₹)</p>
                  <input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={item.price}
                    onChange={(e) => updateItem(index, { price: e.target.value })}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Quantity Selection Mode (Radio) */}
              <div className="min-w-[270px] bg-zinc-50 p-2.5 rounded-2xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-900">Qty Selection</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`qty_mode_manual_${item.id || index}`}
                        checked={item.qty_mode !== 'direct_products'}
                        onChange={() => {
                          const m = parseInt(item.no_of_members || '') || 1;
                          const s = parseInt(item.no_of_sets || '2') || 2;
                          updateItem(index, {
                            qty_mode: 'members_sets',
                            no_of_members: String(m),
                            no_of_sets: String(s),
                            quantity: String(m * s)
                          });
                        }}
                        className="text-[#C82A2B] focus:ring-[#C82A2B]"
                      />
                      <span>Members &amp; Sets</span>
                    </label>
                    <span className="text-zinc-300 font-bold">|</span>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`qty_mode_manual_${item.id || index}`}
                        checked={item.qty_mode === 'direct_products'}
                        onChange={() => {
                          updateItem(index, {
                            qty_mode: 'direct_products',
                            quantity: item.quantity || '1'
                          });
                        }}
                        className="text-[#C82A2B] focus:ring-[#C82A2B]"
                      />
                      <span>No. of Products</span>
                    </label>
                  </div>
                </div>

                {item.qty_mode !== 'direct_products' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-[8px] font-black uppercase text-zinc-400 mb-0.5">Members</p>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={item.no_of_members || ''}
                        onChange={(e) => {
                          const m = e.target.value;
                          const s = item.no_of_sets || '2';
                          const total = (parseInt(m) || 0) * (parseInt(s) || 0);
                          updateItem(index, {
                            no_of_members: m,
                            quantity: String(total || 1)
                          });
                        }}
                        className={inputCls}
                      />
                    </div>
                    <span className="text-zinc-400 font-black text-xs pt-3">×</span>
                    <div className="w-16">
                      <p className="text-[8px] font-black uppercase text-zinc-400 mb-0.5">Sets</p>
                      <input
                        type="number"
                        min="1"
                        placeholder="2"
                        value={item.no_of_sets || '2'}
                        onChange={(e) => {
                          const s = e.target.value;
                          const m = item.no_of_members || '1';
                          const total = (parseInt(m) || 0) * (parseInt(s) || 0);
                          updateItem(index, {
                            no_of_sets: s,
                            quantity: String(total || 1)
                          });
                        }}
                        className={inputCls}
                      />
                    </div>
                    <span className="text-zinc-400 font-black text-xs pt-3">=</span>
                    <div className="text-right pl-1 pt-3 min-w-[55px]">
                      <span className="text-xs font-mono font-black text-[#C82A2B]">{item.quantity || 0} Units</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[8px] font-black uppercase text-zinc-400 mb-0.5">No. of Products</p>
                    <input
                      type="number"
                      min="1"
                      placeholder="Total units"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>


            </div>

          </div>

        {/* ── Costing Breakdown Table ── */}
        <div className="pt-6" style={{ display: (quotationType === 'READYMADE' || isAccessoryType) ? 'none' : 'block' }}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Material Cost Breakdown</p>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200">
              ℹ️ Base fabric length is calibrated for 58" width
            </span>
          </div>
          <div className="rounded-2xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                  <th className="p-3 text-center w-32">Component</th>
                  <th className="p-3 text-center">Item Selection</th>
                  <th className="p-3 text-center w-24">Meters / Qty</th>
                  <th className="p-3 text-center w-24">Fabric Width</th>
                  <th className="p-3 text-center w-36">Fabric SAM</th>
                  <th className="p-3 text-center w-24">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">

                {/* ── Main Fabric (MANDATORY) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C82A2B] flex-shrink-0"></span>
                      <span className="font-black text-zinc-900">Main Fabric</span>
                      <span className="text-zinc-400 font-bold text-[9px]">(Optional)</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      className={selectCls}
                      value={item.fabric_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = {
                          fabric_id: val,
                          main_fabric_rate: '0.00',
                          main_fabric_cost: undefined
                        };
                        if (val) {
                          if (!item.main_fabric_meters || item.main_fabric_meters === '0') {
                            updates.main_fabric_meters = item.base_main_fabric_meters || '1.5';
                          }
                          if (!item.main_fabric_sam) {
                            updates.main_fabric_sam = '6.777';
                          }
                        } else {
                          updates.main_fabric_meters = '';
                          updates.main_fabric_sam = '';
                          updates.main_fabric_cost = '0';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select fabric...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {formatFabricDisplayName(f)}
                        </option>
                      ))}
                    </Select>
                    {item.fabric_id && (
                      <div className="text-[9px] text-[#C82A2B] font-bold mt-1">
                        Trans: ₹{getRateForFabric(item.fabric_id)}/m | Margin: {getMarginForFabric(item.fabric_id)}%
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={item.main_fabric_meters}
                        onChange={(e) => updateItem(index, { main_fabric_meters: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">m</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-600">
                      {mainFabric?.width ? `${mainFabric.width}"` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.fabric_id ? (
                      <span className="font-mono font-bold text-xs text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200 block text-right" title="Fabric SAM is read-only">
                        {item.main_fabric_sam ? `₹${parseFloat(item.main_fabric_sam).toFixed(2)}` : '—'}
                      </span>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calcMainFabricCost.toFixed(2)}
                      value={item.main_fabric_cost !== undefined ? item.main_fabric_cost : (item.fabric_id ? calcMainFabricCost.toFixed(2) : '')}
                      onChange={(e) => updateItem(index, { main_fabric_cost: e.target.value })}
                      onBlur={() => {
                        if (item.main_fabric_cost === '') {
                          updateItem(index, { main_fabric_cost: undefined });
                        }
                      }}
                      className="w-24 px-2 py-1 text-right text-xs font-mono font-black border border-zinc-200 rounded-lg text-zinc-900 focus:border-[#C82A2B] focus:outline-none bg-white shadow-2xs"
                      title="Enter custom cost of fabric or leave empty to use auto-calculated cost"
                    />
                  </td>
                </tr>

                {/* ── Attachment Fabric 1 (OPTIONAL) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0"></span>
                      <span className="font-semibold text-zinc-500">Att. Fabric 1</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      className={selectCls}
                      value={item.attachment_fabric1_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = {
                          attachment_fabric1_id: val,
                          attachment_fabric1_rate: '0.00',
                          attachment_fabric1_cost: undefined
                        };
                        if (val && !item.attachment_fabric1_sam) {
                          updates.attachment_fabric1_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select Att. Fabric 1 (Optional)...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {formatFabricDisplayName(f)}
                        </option>
                      ))}
                    </Select>
                    {item.attachment_fabric1_id && (
                      <div className="text-[9px] text-[#C82A2B] font-bold mt-1">
                        Trans: ₹{getRateForFabric(item.attachment_fabric1_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric1_id)}%
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={item.attachment_fabric1_meters}
                        onChange={(e) => updateItem(index, { attachment_fabric1_meters: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">m</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-600">
                      {att1Fabric?.width ? `${att1Fabric.width}"` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.attachment_fabric1_id ? (
                      <span className="font-mono font-bold text-xs text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200 block text-right" title="Fabric SAM is read-only">
                        {item.attachment_fabric1_sam ? `₹${parseFloat(item.attachment_fabric1_sam).toFixed(2)}` : '—'}
                      </span>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calcAtt1Cost.toFixed(2)}
                      value={item.attachment_fabric1_cost !== undefined ? item.attachment_fabric1_cost : (item.attachment_fabric1_id ? calcAtt1Cost.toFixed(2) : '')}
                      onChange={(e) => updateItem(index, { attachment_fabric1_cost: e.target.value })}
                      onBlur={() => {
                        if (item.attachment_fabric1_cost === '') {
                          updateItem(index, { attachment_fabric1_cost: undefined });
                        }
                      }}
                      className="w-24 px-2 py-1 text-right text-xs font-mono font-black border border-zinc-200 rounded-lg text-zinc-900 focus:border-[#C82A2B] focus:outline-none bg-white shadow-2xs"
                      title="Enter custom cost of fabric or leave empty to use auto-calculated cost"
                    />
                  </td>
                </tr>

                {/* ── Attachment Fabric 2 (OPTIONAL) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-zinc-200 flex-shrink-0"></span>
                      <span className="font-semibold text-zinc-450">Att. Fabric 2</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      className={selectCls}
                      value={item.attachment_fabric2_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = {
                          attachment_fabric2_id: val,
                          attachment_fabric2_rate: '0.00',
                          attachment_fabric2_cost: undefined
                        };
                        if (val && !item.attachment_fabric2_sam) {
                          updates.attachment_fabric2_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select Att. Fabric 2 (Optional)...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {formatFabricDisplayName(f)}
                        </option>
                      ))}
                    </Select>
                    {item.attachment_fabric2_id && (
                      <div className="text-[9px] text-[#C82A2B] font-bold mt-1">
                        Trans: ₹{getRateForFabric(item.attachment_fabric2_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric2_id)}%
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={item.attachment_fabric2_meters}
                        onChange={(e) => updateItem(index, { attachment_fabric2_meters: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">m</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-600">
                      {att2Fabric?.width ? `${att2Fabric.width}"` : '—'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.attachment_fabric2_id ? (
                      <span className="font-mono font-bold text-xs text-zinc-600 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200 block text-right" title="Fabric SAM is read-only">
                        {item.attachment_fabric2_sam ? `₹${parseFloat(item.attachment_fabric2_sam).toFixed(2)}` : '—'}
                      </span>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={calcAtt2Cost.toFixed(2)}
                      value={item.attachment_fabric2_cost !== undefined ? item.attachment_fabric2_cost : (item.attachment_fabric2_id ? calcAtt2Cost.toFixed(2) : '')}
                      onChange={(e) => updateItem(index, { attachment_fabric2_cost: e.target.value })}
                      onBlur={() => {
                        if (item.attachment_fabric2_cost === '') {
                          updateItem(index, { attachment_fabric2_cost: undefined });
                        }
                      }}
                      className="w-24 px-2 py-1 text-right text-xs font-mono font-black border border-zinc-200 rounded-lg text-zinc-900 focus:border-[#C82A2B] focus:outline-none bg-white shadow-2xs"
                      title="Enter custom cost of fabric or leave empty to use auto-calculated cost"
                    />
                  </td>
                </tr>

                {/* ── Dynamic Database Trims ── */}
                {(!item.trims || item.trims.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-xs text-zinc-400 italic">
                      No trims selected. Click &quot;+ Add Trim&quot; below if required.
                    </td>
                  </tr>
                )}
                {((item.trims && item.trims.length > 0) ? item.trims : []).map((trimItem: any, trimIdx: number) => {
                  const dbTrim = trimsList.find((t: any) => String(t.id) === String(trimItem.trim_id)) ||
                                 threadsList.find((th: any) => String(th.id) === String(trimItem.trim_id)) ||
                                 buttonsList.find((b: any) => String(b.id) === String(trimItem.trim_id));
                  const trimCat = trimItem.category || dbTrim?.category?.name || dbTrim?.trim_categories?.name || 'Trim';
                  const catMeta = getTrimCategoryMeta(trimCat, dbTrim?.code);
                  const isThr = catMeta.isThr;

                  return (
                    <tr key={trimItem.id || trimIdx} className="hover:bg-zinc-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${catMeta.color}`}></span>
                          <Select
                            className="text-[11px] font-bold text-zinc-700 bg-transparent border-0 border-b border-dashed border-zinc-300 hover:border-zinc-500 focus:outline-none focus:border-[#C82A2B] py-0.5 pr-2 cursor-pointer max-w-[110px]"
                            value={trimCat}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              const newMeta = getTrimCategoryMeta(newCat);
                              updateItemTrim(index, trimIdx, {
                                category: newCat,
                                uom: newMeta.defaultUom
                              });
                            }}
                          >
                            {allTrimCategories.map((c: string) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </Select>
                        </div>
                      </td>
                      <td className="p-3">
                        <Select
                          className={selectCls}
                          value={trimItem.trim_id || ''}
                          onChange={(e) => {
                            const selectedTrimId = e.target.value;
                            const found = trimsList.find((t: any) => String(t.id) === selectedTrimId) ||
                                          buttonsList.find((b: any) => String(b.id) === selectedTrimId) ||
                                          threadsList.find((th: any) => String(th.id) === selectedTrimId);
                            const itemMeta = getTrimCategoryMeta(found?.category?.name || found?.trim_categories?.name || trimCat, found?.code);
                            const resolvedCategory = found?.category?.name || found?.trim_categories?.name || (itemMeta.isThr ? 'Thread' : trimCat);
                            const resolvedUom = itemMeta.isThr ? 'spools' : (found?.uom || found?.category?.default_uom || itemMeta.defaultUom);

                            let newCount = trimItem.count;
                            if (itemMeta.isThr && (!newCount || newCount === '0' || newCount === '')) {
                              newCount = item.thread_count || '1';
                            }

                            updateItemTrim(index, trimIdx, {
                              trim_id: selectedTrimId,
                              name: found?.name || '',
                              category: resolvedCategory,
                              uom: resolvedUom,
                              count: newCount,
                              unit_price: parseFloat(found?.unit_price || '0') || 0
                            });
                          }}
                        >
                          <option value="">Select {trimCat} (Optional)...</option>
                          {Object.entries(trimsByCategory).map(([catName, items]) => (
                            <optgroup key={catName} label={catName}>
                              {items.map((t: any) => {
                                const itemUom = t.uom || (catName.toLowerCase().includes('thread') ? 'spool' : 'pc');
                                return (
                                  <option key={t.id} value={String(t.id)}>
                                    {t.name} {t.code ? `(${t.code})` : ''}{t.unit_price ? ` — ₹${Number(t.unit_price).toFixed(2)}/${itemUom}` : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ))}
                          {Object.keys(trimsByCategory).length === 0 && (
                            <>
                              <optgroup label="Buttons">
                                {buttonsList.map((b: any) => (
                                  <option key={b.id} value={String(b.id)}>
                                    {b.name}{b.unit_price ? ` — ₹${Number(b.unit_price).toFixed(2)}/pc` : ''}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Threads">
                                {threadsList.map((t: any) => (
                                  <option key={t.id} value={String(t.id)}>
                                    {t.name}{t.type ? ` (${t.type})` : ''}{t.unit_price ? ` — ₹${Number(t.unit_price).toFixed(2)}/spool` : ''}
                                  </option>
                                ))}
                              </optgroup>
                            </>
                          )}
                        </Select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" step="0.5" min="0" placeholder="0"
                            value={isThr ? (trimItem.count || item.thread_count || '1') : (trimItem.count || '')}
                            onChange={(e) => updateItemTrim(index, trimIdx, { count: e.target.value })}
                            className={`${inputCls} w-20`}
                          />
                          <span className="text-zinc-400 font-bold text-[10px]">
                            {isThr ? 'spools' : (trimItem.uom || dbTrim?.uom || catMeta.defaultUom)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[#C82A2B] font-black uppercase text-[10px] tracking-wider italic">
                          Included
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono font-black text-zinc-300">
                            ₹0.00
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItemTrim(index, trimIdx)}
                            className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                            title="Remove trim"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* ── Add Trim Button & Quick Presets ── */}
                <tr className="bg-zinc-50/40">
                  <td colSpan={6} className="px-3 py-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addItemTrim(index, 'Trim')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C82A2B] hover:text-[#9E1B1D] uppercase tracking-wider transition-colors"
                      >
                        <Plus size={13} strokeWidth={2.5} /> Add Trim
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Quick:</span>
                        {['Zipper', 'Elastic', 'Label', 'Interlining', 'Velcro'].map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => addItemTrim(index, cat)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 transition-colors"
                          >
                            + {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* ── SAM Cost ── */}
                {/* <tr className="bg-[#FFF1F1] hover:bg-[#FFF1F1]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8b6b5a] flex-shrink-0"></span>
                      <span className="font-black text-zinc-900">SAM Cost</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold text-zinc-400 italic">Stitching labor cost</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" step="0.1" min="0" placeholder="0"
                        value={item.sam_value}
                        onChange={(e) => updateItem(index, { sam_value: e.target.value })}
                        className={`${inputCls} w-20`}
                      />
                      <span className="text-zinc-400 font-bold text-[10px]">min</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-300 font-semibold text-[10px]">—</span>
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-500 font-mono font-bold text-xs">
                      ₹{laborRatePerHour}/hr
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${samCost > 0 ? 'text-[#8b6b5a]' : 'text-zinc-300'}`}>
                      ₹{samCost.toFixed(2)}
                    </span>
                  </td>
                </tr> */}

              </tbody>
              {/* ── Total Footer ── */}
              <tfoot>
                <tr className="border-t-2 border-[#C82A2B]/20 bg-[#FFF1F1]">
                  <td colSpan={5} className="p-4 font-black text-[10px] uppercase tracking-widest text-zinc-900">
                    Total Unit Cost
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-black text-lg text-[#C82A2B] font-mono">
                      ₹{unitTotal.toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentSelect = (item: ManualItem, index: number) => {
    if (!orgDepartments || orgDepartments.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Department (optional)</p>
        <Select
          className={selectCls}
          value={item.department_id || ''}
          onChange={(e) => {
            const deptId = e.target.value;
            const selectedD = orgDepartments.find((d: any) => String(d.id) === deptId);
            patchLine(index, {
              department_id: deptId,
              department_name: selectedD ? (selectedD.division ? `${selectedD.name} (${selectedD.division})` : selectedD.name) : ''
            });
          }}
        >
          <option value="">General / None</option>
          {orgDepartments.map((d: any) => (
            <option key={d.id} value={String(d.id)}>
              {d.name}{d.division ? ` (${d.division})` : ''}
            </option>
          ))}
        </Select>
      </div>
    );
  };

  const renderFabricLineForm = (item: ManualItem, index: number) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <div className="md:col-span-2 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-900">Fabric</p>
        <Select
          className={selectCls}
          value={item.fabric_id}
          onChange={(e) => {
            const fabricId = e.target.value;
            patchLine(index, {
              fabric_id: fabricId,
              price: item.rate_manual && item.price !== '' ? item.price : getDefaultFabricRate(fabricId),
            });
          }}
        >
          <option value="">Select fabric...</option>
          {fabricsList.map((f: any) => (
            <option key={f.id} value={String(f.id)}>{formatFabricDisplayName(f)}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-900">Meters</p>
        <input
          type="number" step="any" min="0"
          value={item.quantity}
          onChange={(e) => patchLine(index, { quantity: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#C82A2B]">Rate / Meter (₹)</p>
        <input
          type="number" step="any" min="0"
          value={item.price}
          onChange={(e) => patchLine(index, { price: e.target.value, rate_manual: true })}
          className={`${inputCls} font-mono text-[#C82A2B]`}
        />
        {item.fabric_id && item.rate_manual && (
          <button
            type="button"
            onClick={() => patchLine(index, { price: getDefaultFabricRate(item.fabric_id), rate_manual: false })}
            className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-[#C82A2B]"
          >
            Use standard rate ₹{getDefaultFabricRate(item.fabric_id)}
          </button>
        )}
      </div>
      <div className="md:col-span-2">{renderDepartmentSelect(item, index)}</div>
    </div>
  );

  const handleAddCustomLine = ({ name, quantity, price }: { name: string; quantity: string; price: string }) => {
    const line: ManualItem = {
      ...createBlankLine('CUSTOM'),
      name: name.trim(),
      product_name: name.trim(),
      quantity: quantity || '1',
      price: price || '0',
      rate_manual: true,
    };
    setManualItems((prev: any) => [...prev, line]);
  };

  const changeLineName = (index: number, name: string) => {
    patchLine(index, { name, product_name: name });
  };

  const renderCustomLineForm = (item: ManualItem, index: number) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2">
      <div className="md:col-span-2 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Item Name / Description</p>
        <input
          type="text"
          value={item.name || item.product_name || ''}
          onChange={(e) => patchLine(index, { name: e.target.value, product_name: e.target.value })}
          placeholder="e.g. Custom Garment, Logo Embroidery..."
          className={inputCls}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Quantity</p>
        <input
          type="number" min="1" step="1"
          value={item.quantity}
          onChange={(e) => patchLine(index, { quantity: e.target.value })}
          className={inputCls}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#C82A2B]">Rate (₹)</p>
        <input
          type="number" step="0.01" min="0"
          value={item.price}
          onChange={(e) => patchLine(index, { price: e.target.value, rate_manual: true })}
          className={`${inputCls} font-mono text-[#C82A2B]`}
        />
      </div>
      <div className="md:col-span-4">{renderDepartmentSelect(item, index)}</div>
    </div>
  );

  const renderItemLines = () => (
    <ItemLinesTable
      lines={manualItems
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => !(modalLine?.isNew && it.id === modalLine.id))
        .map(({ it, i }) => getLineView(it, i))}
      onAdd={openAddLine}
      onEdit={openEditLine}
      onDelete={deleteLine}
      onChangeQty={changeLineQty}
      onChangeRate={changeLineRate}
      onChangeName={changeLineName}
      onAddCustom={handleAddCustomLine}
    />
  );

  const renderItemModal = () => {
    if (!modalLine || !modalItem) return null;
    const kind = getItemKind(modalItem);
    const error = getLineError(modalItem);
    const qty = parseQty(modalItem);
    const rate = parseFloat(modalItem.price) || 0;
    const calculated = kind === 'READYMADE' ? getItemCosts(modalItem).unitTotal : null;
    const subtitles: Record<ItemKind, string> = {
      CUSTOM: 'Custom line · direct item, quantity & rate entry',
      READYMADE: 'In-house garment · fabric, trims & SAM costing',
      FABRIC: 'Fabric sold by the meter',
      ACCESSORY: 'Accessories & trade readymades',
    };

    const footer = (
      <div className="flex items-center gap-5 flex-wrap text-[11px] font-bold text-zinc-500">
        <span>Qty <b className="font-mono text-zinc-900">{modalItem.quantity || 0}{kind === 'FABRIC' ? ' m' : ''}</b></span>
        {kind === 'READYMADE' && calculated !== null && (
          <span>Calculated cost <b className="font-mono text-zinc-900">₹{calculated.toFixed(2)}</b></span>
        )}
        {kind === 'READYMADE' ? (
          <label className="flex items-center gap-2">
            Rate ₹
            <input
              type="number" step="0.01" min="0"
              placeholder={calculated !== null ? calculated.toFixed(2) : '0.00'}
              value={modalItem.price}
              onChange={(e) => patchLine(modalIndex, { price: e.target.value, rate_manual: e.target.value !== '' })}
              className="w-28 px-2.5 py-1.5 text-xs font-mono font-black border border-zinc-200 rounded-lg text-zinc-900 text-right focus:outline-none focus:border-[#C82A2B] bg-white"
            />
          </label>
        ) : (
          <span>Rate <b className="font-mono text-zinc-900">₹{rate.toFixed(2)}</b></span>
        )}
        {kind === 'READYMADE' && modalItem.rate_manual && calculated !== null && Math.abs(calculated - rate) > 0.005 && (
          <button
            type="button"
            onClick={() => patchLine(modalIndex, { price: calculated.toFixed(2), rate_manual: false })}
            className="text-[9px] font-black uppercase tracking-wider text-zinc-400 hover:text-[#C82A2B]"
          >
            Use calculated ₹{calculated.toFixed(2)}
          </button>
        )}
        <span>Amount <b className="font-mono text-[#C82A2B] text-sm">₹{(qty * rate).toFixed(2)}</b></span>
      </div>
    );

    return (
      <ItemLineModal
        title={`${modalLine.isNew ? 'Add' : 'Edit'} ${ITEM_KIND_LABELS[kind]} Line`}
        subtitle={subtitles[kind]}
        footer={footer}
        error={error}
        saveLabel={modalLine.isNew ? 'Save Item Line' : 'Update Item Line'}
        onSave={saveModal}
        onCancel={cancelModal}
      >
        {kind === 'FABRIC'
          ? renderFabricLineForm(modalItem, modalIndex)
          : kind === 'CUSTOM'
          ? renderCustomLineForm(modalItem, modalIndex)
          : renderManualItemCard(modalItem, modalIndex)}
      </ItemLineModal>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="border-b border-zinc-100 pb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-black italic text-zinc-900">
            {hasMeasurements ? 'Sizing & Measurement Audits' : 'Quotation Items'}
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C82A2B] mt-1 opacity-70">
            {hasMeasurements ? 'Live verification of measurements profiles' : 'Add readymades, fabrics and accessories as item lines'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#FFF1F1] text-[#C82A2B] border border-[#C82A2B]/15">
            {hasMeasurements
              ? `${orgAnalysis.total_entities} Entities`
              : (() => {
                  const saved = manualItems.filter(it => !(modalLine?.isNew && it.id === modalLine.id)).length;
                  return `${saved} Item Line${saved === 1 ? '' : 's'}`;
                })()}
          </span>
        </div>
      </div>

      {hasMeasurements ? (
        <>
          {/* VISUAL COMPLIANCE TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50/50 p-6 rounded-2xl border border-green-100 flex justify-between items-center">
              <div>
                <p className="text-2xl font-black text-green-600">{orgAnalysis.measured_count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Completed Profiles</p>
              </div>
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div className="bg-amber-50/30 p-6 rounded-2xl border border-amber-100 flex justify-between items-center">
              <div>
                <p className="text-2xl font-black text-amber-600">{orgAnalysis.pending_count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Pending Review</p>
              </div>
              <Clock size={32} className="text-amber-500" />
            </div>
            <div className="bg-red-50/30 p-6 rounded-2xl border border-red-100 flex justify-between items-center">
              <div>
                <p className="text-2xl font-black text-red-500">{orgAnalysis.missing_count}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Missing Profiles</p>
              </div>
              <AlertTriangle size={32} className="text-red-500" />
            </div>
          </div>

          {orgAnalysis.missing_count > 0 && (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex gap-4 text-amber-800">
              <AlertTriangle className="shrink-0 text-amber-600" size={24} />
              <div className="space-y-1">
                <p className="text-sm font-black italic">⚠️ High Compliance Warning: Missing Measurements Found</p>
                <p className="text-xs leading-relaxed font-semibold">
                  There are <strong>{orgAnalysis.missing_count} member(s)</strong> without active measurement profiles.
                  Standard Size M will be allocated for these members.
                </p>
              </div>
            </div>
          )}

          {/* SIZING & MEASUREMENT AUDITS - SPLIT BY DEPARTMENT OR GLOBAL */}
          {auditDepartments.length > 0 ? (
            <div className="space-y-8 pt-2">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#C82A2B]" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Department-Wise Sizing &amp; Measurement Audits</h4>
                <span className="ml-auto text-[9px] font-bold text-[#C82A2B] uppercase tracking-widest opacity-70">
                  Live verification profiles by department · Add gender manually
                </span>
              </div>

              {auditDepartments.map((dept: any) => {
                const deptId = String(dept.id);
                const cleanId = deptId.replace(/_.*$/, '');
                const deptEntities = (orgAnalysis?.entities || []).filter((e: any) => {
                  const eid = String(e.department_id || '');
                  return eid === deptId || eid === cleanId || (dept.name && e.department_name === dept.name);
                });

                const totalDeptMembers = deptEntities.length || parseInt(dept.persons || '0') || 0;
                const completedDept = deptEntities.filter((e: any) => e.measurement_status === 'Completed').length;
                const pendingDept = deptEntities.filter((e: any) => e.measurement_status === 'Pending').length;
                const missingDept = deptEntities.filter((e: any) => e.measurement_status === 'Missing').length;

                const currentRows = deptAuditItems[deptId] || uniqueTemplateProducts.map((p: any, idx: number) => ({
                  ...p,
                  id: `${deptId}_${p.product_id}_${idx}`,
                  department_id: deptId,
                  department_name: dept.name,
                  gender: '',
                }));

                const deptUnits = currentRows.reduce((sum: number, it: any) => sum + getDeptAuditRowQty(deptId, dept.name, it.gender, completedDept), 0);
                const deptPriceTotal = currentRows.reduce((sum: number, it: any) => {
                  const q = getDeptAuditRowQty(deptId, dept.name, it.gender, completedDept);
                  const p = parseFloat(it.price_override || '0');
                  return sum + (p > 0 ? p * q : 0);
                }, 0);
                const deptSAMTotal = currentRows.reduce((sum: number, it: any) => {
                  const q = getDeptAuditRowQty(deptId, dept.name, it.gender, completedDept);
                  return sum + (it.sam_value ? it.sam_value * q : 0);
                }, 0);

                return (
                  <div key={deptId} className="border-2 border-zinc-200 hover:border-[#C82A2B]/30 rounded-[2rem] bg-white p-6 shadow-sm space-y-4">
                    {/* Department Header with Live verification of measurements profiles */}
                    <div className="flex items-center justify-between gap-4 flex-wrap border-b border-zinc-100 pb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-wider bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
                          {dept.division ? `${dept.name} (${dept.division})` : dept.name}
                        </span>
                        <span className="text-[10px] font-black text-[#C82A2B] bg-[#FFF1F1] border border-[#C82A2B]/20 px-2.5 py-1 rounded-lg font-mono">
                          {totalDeptMembers} Members
                        </span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                          <CheckCircle2 size={12} /> {completedDept} Verified Profiles
                        </span>
                        {(missingDept > 0 || pendingDept > 0) && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                            <AlertTriangle size={12} /> {missingDept + pendingDept} Missing / Pending
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => addDeptAuditRow(deptId, dept.name)}
                        className="px-3 py-1.5 bg-[#FFF1F1] hover:bg-[#C82A2B] text-[#C82A2B] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus size={12} />
                        <span>Add Product / Gender Line</span>
                      </button>
                    </div>

                    {/* Department Audit Table */}
                    <div className="border border-zinc-150 rounded-2xl overflow-x-auto custom-scrollbar bg-white shadow-2xs">
                      <table className="w-full min-w-[950px] text-left border-collapse text-xs align-middle">
                        <thead>
                          <tr className="bg-[#FFF1F1] text-[9px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-150">
                            <th className="p-3 align-middle text-center">ART Number</th>
                            <th className="p-3 align-middle text-center">Product Name</th>
                            <th className="p-3 align-middle w-40 text-center">Gender</th>
                            <th className="p-3 align-middle text-center">Design Number</th>
                            <th className="p-3 align-middle text-center">Specifications</th>
                            <th className="p-3 align-middle font-mono text-center">SAM (₹)</th>
                            <th className="p-3 align-middle text-center">Quantity</th>
                            <th className="p-3 align-middle w-28 text-center">Price/Unit (₹)</th>
                            <th className="p-3 align-middle w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                          {currentRows.map((rowItem: any, rIdx: number) => {
                            const rowQty = getDeptAuditRowQty(deptId, dept.name, rowItem.gender, completedDept);
                            return (
                              <tr key={rowItem.id || rIdx} className="hover:bg-zinc-50/50 bg-white">
                                <td className="p-3 font-black text-[#C82A2B] align-middle">{rowItem.art_number || '—'}</td>
                                <td className="p-3 text-zinc-800 align-middle">
                                  {uniqueTemplateProducts.length > 1 ? (
                                    <Select
                                      value={rowItem.product_id}
                                      onChange={(e) => {
                                        const pid = e.target.value;
                                        const matched = uniqueTemplateProducts.find((u: any) => String(u.product_id) === String(pid));
                                        const formattedTitle = formatProductDisplayName(matched, masterItems);
                                        updateDeptAuditRow(deptId, rIdx, {
                                          product_id: pid,
                                          product_name: formattedTitle || matched?.product_name || rowItem.product_name,
                                          art_number: matched?.art_number || rowItem.art_number,
                                          materials: matched?.materials || rowItem.materials,
                                          sam_value: matched?.sam_value ?? rowItem.sam_value
                                        });
                                      }}
                                      className="text-xs font-bold text-zinc-800 bg-transparent border border-zinc-200 rounded px-1.5 py-1 focus:outline-none focus:border-[#C82A2B]"
                                    >
                                      {uniqueTemplateProducts.map((u: any) => (
                                        <option key={u.product_id} value={u.product_id}>{formatProductDisplayName(u, masterItems) || u.product_name}</option>
                                      ))}
                                    </Select>
                                  ) : (
                                    formatProductDisplayName(rowItem, masterItems) || rowItem.product_name
                                  )}
                                </td>
                                <td className="p-2 align-middle">
                                  <Select
                                    value={normalizeGender(rowItem.gender || '')}
                                    onChange={(e) => updateDeptAuditRow(deptId, rIdx, { gender: e.target.value })}
                                    className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Select Gender...</option>
                                    {availableGenders.map((g: any) => (
                                      <option key={g.id || g.code || g.value} value={g.value}>
                                        {g.label}
                                      </option>
                                    ))}
                                  </Select>
                                </td>
                                <td className="p-2 align-middle">
                                  <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-700 flex items-center justify-between">
                                    <span>{rowItem.design_number_override || rowItem.design_code || 'Auto (BOM)'}</span>
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-600">Locked</span>
                                  </div>
                                </td>
                                <td className="p-3 text-zinc-600 font-medium text-xs align-middle" title={formatSpecificationDisplay(rowItem.materials)}>{formatSpecificationDisplay(rowItem.materials)}</td>
                                <td className="p-2 align-middle">
                                  <input
                                    type="number" step="0.0001" min="0" placeholder="₹"
                                    value={rowItem.sam_value ?? ''}
                                    onChange={(e) => updateDeptAuditRow(deptId, rIdx, { sam_value: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                    className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-600 focus:outline-none transition-all"
                                  />
                                </td>
                                <td className="p-3 text-right font-black text-zinc-900 align-middle">
                                  {rowQty > 0 ? (
                                    <span>{rowQty} <span className="text-zinc-400 font-normal">Units</span></span>
                                  ) : (
                                    <span className="text-zinc-300">0</span>
                                  )}
                                </td>
                                <td className="p-2 align-middle">
                                  <input
                                    type="number" step="0.01" min="0" placeholder="Optional"
                                    value={rowItem.price_override || ''}
                                    onChange={(e) => updateDeptAuditRow(deptId, rIdx, { price_override: e.target.value })}
                                    className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#C82A2B] focus:outline-none transition-all"
                                  />
                                </td>
                                <td className="p-2 text-center align-middle">
                                  {currentRows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeDeptAuditRow(deptId, rIdx)}
                                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="Remove row"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-50 border-t-2 border-[#C82A2B]/20 text-zinc-900 font-black text-xs">
                            <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400 align-middle">
                              {dept.name} Totals
                            </td>
                            <td className="p-3 font-mono font-black text-zinc-900 align-middle">
                              {deptSAMTotal > 0 ? `₹${deptSAMTotal.toFixed(2)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-black text-zinc-900 align-middle">
                              {deptUnits} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                            </td>
                            <td colSpan={2} className="p-3 font-mono font-black text-[#C82A2B] align-middle">
                              {deptPriceTotal > 0 ? `₹${deptPriceTotal.toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : templateLineItems.length === 0 ? (
            <div className="p-6 bg-amber-50/50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs">
              <AlertTriangle className="shrink-0 text-amber-600" size={18} />
              <div>
                <p className="font-black">No Template Configured</p>
                <p className="font-medium mt-0.5">This organization has no template with linked products. Configure a uniform template first via Admin &gt; Templates.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#C82A2B]" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Product & Design Sizing Audit</h4>
                <span className="ml-auto text-[9px] font-bold text-[#C82A2B] uppercase tracking-widest opacity-70">Design numbers & prices are editable</span>
              </div>
              <div className="border border-zinc-150 rounded-2xl overflow-x-auto custom-scrollbar bg-white shadow-sm min-h-[350px] pb-12">
                <table className="w-full min-w-[1000px] text-left border-collapse text-xs align-middle">
                  <thead>
                    <tr className="bg-[#FFF1F1] text-[9px] font-black uppercase tracking-widest text-zinc-900 border-b border-zinc-150">
                      <th className="p-3 align-middle text-center">ART Number</th>
                      <th className="p-3 align-middle text-center">Product Name</th>
                      <th className="p-3 align-middle text-center">Gender</th>
                      <th className="p-3 align-middle text-center">Design Number</th>
                      <th className="p-3 align-middle text-center">Specifications</th>
                      <th className="p-3 align-middle font-mono text-center">SAM (₹)</th>
                      <th className="p-3 align-middle text-center">Quantity</th>
                      <th className="p-3 align-middle w-28 text-center">Price/Unit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                    {mergedItems.map((item, mi) => {
                      const qty = getQty(item);
                      const firstIdx = item._indices[0];
                      return (
                        <tr key={mi} className="hover:bg-zinc-50/50 bg-white">
                          <td className="p-3 font-black text-[#C82A2B] align-middle">{item.art_number || '—'}</td>
                          <td className="p-3 text-zinc-800 align-middle">{formatProductDisplayName(item, masterItems) || item.product_name}</td>
                                                    <td className="p-2 align-middle min-w-[130px]">
                            <Select
                              value={normalizeGender(item.gender || '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], gender: val };
                                });
                                setTemplateLineItems(updated);
                              }}
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-lg px-2.5 py-1.5 text-xs font-bold text-zinc-900 focus:outline-none cursor-pointer"
                            >
                              <option value="">Select Gender...</option>
                              {availableGenders.map((g: any) => (
                                <option key={g.id || g.code || g.value} value={g.value}>
                                  {g.label}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="p-2 align-middle">
                            <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-700 flex items-center justify-between">
                              <span>{templateLineItems[firstIdx]?.design_number_override || item.design_code || 'Auto (BOM)'}</span>
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-600">Locked</span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-600 font-medium text-xs align-middle" title={formatSpecificationDisplay(item.materials)}>{formatSpecificationDisplay(item.materials)}</td>
                          <td className="p-2 align-middle">
                            <input
                              type="number" step="0.0001" min="0" placeholder="₹"
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#C82A2B]/30 transition-all"
                              value={templateLineItems[firstIdx]?.sam_value ?? ''}
                              onChange={(e) => {
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], sam_value: e.target.value === '' ? null : parseFloat(e.target.value) };
                                });
                                setTemplateLineItems(updated);
                              }}
                            />
                          </td>
                          <td className="p-3 text-right font-black text-zinc-900 align-middle">
                            {qty > 0 ? <span>{qty} <span className="text-zinc-400 font-normal">Units</span></span> : <span className="text-zinc-300">0</span>}
                          </td>
                          <td className="p-2 align-middle">
                            <input
                              type="number" step="0.01" min="0" placeholder="Optional"
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#C82A2B] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#C82A2B] focus:outline-none focus:ring-1 focus:ring-[#C82A2B]/30 transition-all"
                              value={templateLineItems[firstIdx]?.price_override || ''}
                              onChange={(e) => {
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], price_override: e.target.value };
                                });
                                setTemplateLineItems(updated);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50 border-t-2 border-[#C82A2B]/20 text-zinc-900 font-black text-xs">
                      <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400 align-middle">Totals</td>
                      <td className="p-3 font-mono font-black text-zinc-900 align-middle">
                        {totalSAMMin > 0 ? `₹${totalSAMMin.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-black text-zinc-900 align-middle">
                        {totalQty} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                      </td>
                      <td className="p-3 font-mono font-black text-[#C82A2B] align-middle">
                        {totalPrice > 0 ? `₹${totalPrice.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ADDITIONAL ITEMS (for measurement-based quotations) */}
          <div className="space-y-4 mt-8 pt-8 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <Plus size={14} className="text-[#C82A2B]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Additional Items</h4>
              <span className="ml-auto text-[9px] font-bold text-[#C82A2B] uppercase tracking-widest opacity-70">Optional manual additions</span>
            </div>
            {renderItemLines()}
          </div>
        </>
      ) : (
        renderItemLines()
      )}

      {renderItemModal()}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-zinc-100 mt-10">
        <Button
          disabled={isAnalyzing}
          variant="secondary"
          onClick={onBack}
          className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          Back
        </Button>
        <Button
          disabled={!hasMeasurements && !isManualItemsValid()}
          onClick={onNext}
          className="h-16 px-10 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-[#C82A2B]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Expenses Setup <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
