'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight, CheckCircle2, Clock, AlertTriangle, Layers, Trash2, Package, Zap, Users, GraduationCap, RefreshCw, Hash } from 'lucide-react';
import { ProductType, TemplateLineItem, ManualItem, SeparateFabricItem } from '../../page';
import toast from '@/components/ui/toast';
import api from '@/lib/api';

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

  // Preload dropdown selection IDs
  let mainFabricId = '';
  if (prod.main_fabric_id) {
    mainFabricId = String(prod.main_fabric_id);
  } else if (prod.fabric_id) {
    mainFabricId = String(prod.fabric_id);
  } else if (prod.class_fabric_consumption?._base_main_fabric_id) {
    mainFabricId = String(prod.class_fabric_consumption._base_main_fabric_id);
  }
  if (fabricsList.length > 0 && mainFabricId && !fabricsList.some(f => String(f.id) === mainFabricId)) {
    mainFabricId = '';
  }

  let att1FabricId = '';
  if (prod.attachment_fabric1_id) {
    att1FabricId = String(prod.attachment_fabric1_id);
  } else if (baseAttFabrics[0]?.fabric_id) {
    att1FabricId = String(baseAttFabrics[0].fabric_id);
  }
  if (fabricsList.length > 0 && att1FabricId && !fabricsList.some(f => String(f.id) === att1FabricId)) {
    att1FabricId = '';
  }

  let att2FabricId = '';
  if (prod.attachment_fabric2_id) {
    att2FabricId = String(prod.attachment_fabric2_id);
  } else if (baseAttFabrics[1]?.fabric_id) {
    att2FabricId = String(baseAttFabrics[1].fabric_id);
  }
  if (fabricsList.length > 0 && att2FabricId && !fabricsList.some(f => String(f.id) === att2FabricId)) {
    att2FabricId = '';
  }

  let buttonId = '';
  if (prod.button_id) {
    buttonId = String(prod.button_id);
  } else if (btnTrim?.trim_id && !String(btnTrim.trim_id).startsWith('btn_default')) {
    buttonId = String(btnTrim.trim_id);
  }
  const btnExists = (buttonsList.length > 0 && buttonsList.some(b => String(b.id) === buttonId)) ||
                    (trimsList.length > 0 && trimsList.some(t => String(t.id) === buttonId));
  if (buttonId && !btnExists && (buttonsList.length > 0 || trimsList.length > 0)) {
    buttonId = '';
  }

  let threadId = '';
  if (prod.thread_id) {
    threadId = String(prod.thread_id);
  } else if (thrTrim?.trim_id && !String(thrTrim.trim_id).startsWith('thr_default')) {
    threadId = String(thrTrim.trim_id);
  }
  const threadExists = (threadsList.length > 0 && threadsList.some(t => String(t.id) === threadId)) ||
                       (trimsList.length > 0 && trimsList.some(t => String(t.id) === threadId));
  if (threadId && !threadExists && (threadsList.length > 0 || trimsList.length > 0)) {
    threadId = '';
  }
  if (!threadId) {
    const defaultThr = trimsList.find((t: any) =>
      (t.category?.name || t.trim_categories?.name || '').toLowerCase().includes('thread') ||
      (t.name || '').toLowerCase().includes('thread') ||
      (t.code || '').toUpperCase().startsWith('THR')
    ) || (threadsList.length > 0 ? threadsList[0] : null);
    if (defaultThr) {
      threadId = String(defaultThr.id);
    }
  }

  // Preload and map dynamic trims from database
  let resolvedTrims: Array<{
    id: string | number;
    trim_id: string;
    category: string;
    name: string;
    count: string;
    uom: string;
    unit_price: number;
  }> = [];

  if (baseTrims.length > 0) {
    resolvedTrims = baseTrims.map((t: any, idx: number) => {
      const matched = trimsList.find((dbTrim: any) =>
        String(dbTrim.id) === String(t.trim_id) ||
        (dbTrim.name && t.name && dbTrim.name.toLowerCase() === t.name.toLowerCase()) ||
        (dbTrim.code && t.code && dbTrim.code.toLowerCase() === t.code.toLowerCase())
      ) || threadsList.find((th: any) => String(th.id) === String(t.trim_id))
        || buttonsList.find((b: any) => String(b.id) === String(t.trim_id));
      const catName = t.category || matched?.category?.name || matched?.trim_categories?.name || 'Trim';
      const meta = getTrimCategoryMeta(catName, matched?.code || t.code);
      const isThread = meta.isThr;
      const isButton = meta.isBtn;
      const uom = isThread 
        ? 'spools'
        : (matched?.uom || t.uom || meta.defaultUom || 'pcs');
      const countVal = isThread
        ? (resolvedThr || (t.count !== undefined && t.count !== null && t.count !== '' ? String(t.count) : '1'))
        : isButton
        ? (resolvedBtn || (t.count !== undefined && t.count !== null && t.count !== '' ? String(t.count) : '10'))
        : (t.count !== undefined && t.count !== null && t.count !== '' ? String(t.count) : '1');
      const unitPrice = parseFloat(matched?.unit_price || t.unit_price || '0') || 0;
      return {
        id: t.id || `trim-${idx}`,
        trim_id: matched ? String(matched.id) : (t.trim_id ? String(t.trim_id) : ''),
        category: isThread ? 'Thread' : (isButton ? 'Buttons' : catName),
        name: matched?.name || t.name || (isThread ? 'Thread' : (isButton ? 'Buttons' : catName)),
        count: countVal,
        uom: uom,
        unit_price: unitPrice
      };
    });

    // If product has button configured in master but not in baseTrims, include it
    const hasBtn = resolvedTrims.some(t => (t.category || '').toLowerCase().includes('button') || (t.name || '').toLowerCase().includes('button'));
    if (!hasBtn && (buttonId || resolvedBtn)) {
      const dbBtn = trimsList.find((t: any) =>
        (t.category?.name || t.trim_categories?.name || '').toLowerCase().includes('button') ||
        (t.name || '').toLowerCase().includes('button')
      ) || (buttonsList.length > 0 ? buttonsList[0] : null);

      resolvedTrims.unshift({
        id: 'btn-0',
        trim_id: buttonId || (dbBtn ? String(dbBtn.id) : ''),
        category: 'Buttons',
        name: dbBtn?.name || 'Buttons',
        count: resolvedBtn || '10',
        uom: dbBtn?.uom || 'pcs',
        unit_price: parseFloat(dbBtn?.unit_price || '0') || 0
      });
      if (!buttonId && dbBtn) buttonId = String(dbBtn.id);
    }

    // If product has thread configured in master but not in baseTrims, include it
    const hasThr = resolvedTrims.some(t => (t.category || '').toLowerCase().includes('thread') || (t.name || '').toLowerCase().includes('thread'));
    if (!hasThr && (threadId || resolvedThr)) {
      const dbThr = trimsList.find((t: any) =>
        (t.category?.name || t.trim_categories?.name || '').toLowerCase().includes('thread') ||
        (t.name || '').toLowerCase().includes('thread') ||
        (t.code || '').toUpperCase().startsWith('THR')
      ) || (threadsList.length > 0 ? threadsList[0] : null);

      resolvedTrims.push({
        id: 'thr-1',
        trim_id: threadId || (dbThr ? String(dbThr.id) : ''),
        category: 'Thread',
        name: dbThr?.name || 'Thread',
        count: resolvedThr || '1',
        uom: 'spools',
        unit_price: parseFloat(dbThr?.unit_price || '0') || 0
      });
      if (!threadId && dbThr) threadId = String(dbThr.id);
    }
  } else {
    // If no trims configured on the product, search database for a Button and a Thread
    const dbBtn = trimsList.find((t: any) =>
      (t.category?.name || t.trim_categories?.name || '').toLowerCase().includes('button') ||
      (t.name || '').toLowerCase().includes('button')
    ) || (buttonsList.length > 0 ? buttonsList[0] : null);

    const dbThr = trimsList.find((t: any) =>
      (t.category?.name || t.trim_categories?.name || '').toLowerCase().includes('thread') ||
      (t.name || '').toLowerCase().includes('thread') ||
      (t.code || '').toUpperCase().startsWith('THR')
    ) || (threadsList.length > 0 ? threadsList[0] : null);

    if (dbBtn || resolvedBtn || buttonId) {
      resolvedTrims.push({
        id: 'btn-0',
        trim_id: dbBtn ? String(dbBtn.id) : (buttonId || ''),
        category: 'Buttons',
        name: dbBtn?.name || 'Buttons',
        count: resolvedBtn || '10',
        uom: dbBtn?.uom || 'pcs',
        unit_price: parseFloat(dbBtn?.unit_price || '0') || 0
      });
      if (!buttonId && dbBtn) buttonId = String(dbBtn.id);
    }

    if (threadId || resolvedThr) {
      resolvedTrims.push({
        id: 'thr-1',
        trim_id: dbThr ? String(dbThr.id) : (threadId || ''),
        category: 'Thread',
        name: dbThr?.name || 'Thread',
        count: resolvedThr || '1',
        uom: 'spools',
        unit_price: parseFloat(dbThr?.unit_price || '0') || 0
      });
      if (!threadId && dbThr) threadId = String(dbThr.id);
    }
  }
  const buttonUom = btnTrim?.uom || 'pcs';
  const threadUom = 'spools';

  return {
    main_fabric_meters: resolvedMain,
    attachment_fabric1_meters: resolvedAtt1,
    attachment_fabric2_meters: resolvedAtt2,
    button_count: resolvedBtn,
    thread_count: resolvedThr || '1',
    button_uom: buttonUom,
    thread_uom: threadUom,
    fabric_id: mainFabricId,
    attachment_fabric1_id: att1FabricId,
    attachment_fabric2_id: att2FabricId,
    button_id: buttonId,
    thread_id: threadId,
    trims: resolvedTrims,
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
  separateFabrics: SeparateFabricItem[];
  setSeparateFabrics: (items: SeparateFabricItem[]) => void;
  orgDepartments?: any[];
  setOrgDepartments?: (depts: any[]) => void;
  departmentItems?: Record<string, ManualItem[]>;
  setDepartmentItems?: any;
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
  quotationType?: string;
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
  separateFabrics,
  setSeparateFabrics,
  orgDepartments = [],
  setOrgDepartments,
  departmentItems = {},
  setDepartmentItems,
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
  quotationType = 'STANDARD',
  organizations = [],
  selectedOrgId = '',
}: WizardStep2Props) {

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

  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [globalSets, setGlobalSets] = useState('2');
  const [entityAuditSummary, setEntityAuditSummary] = useState<{
    totalEntities: number;
    measuredCount: number;
    pendingCount: number;
    missingCount: number;
    classesCount: number;
  } | null>(null);

  const selectedOrg = organizations?.find((org: any) => String(org.id) === String(selectedOrgId));
  const isSchool = Boolean(
    selectedOrg?.industries?.name?.toLowerCase().includes('school') ||
    selectedOrg?.industries?.name?.toLowerCase().includes('educat') ||
    selectedOrg?.industry_type?.toLowerCase().includes('school') ||
    selectedOrg?.name?.toLowerCase().match(/school|vidyalaya|academy|matriculation|college|institution|campus|kindergarten/i) ||
    customerType?.toLowerCase().includes('school') ||
    orgDepartments?.some((d: any) => /class|grade|std|standard|lkg|ukg|nursery|kg/i.test(d.name || d.baseDeptName || ''))
  );

  const isAccessoryType = quotationType === 'ACCESSORIES' || quotationType === 'ACCESSORIES_SET' || quotationType === 'ACCESSORY';

  const isAccessoryProductType = React.useCallback((pt: any): boolean => {
    if (!pt) return false;
    const name = (pt.name || '').toLowerCase().trim();
    return name === 'accessories' || name === 'accessory' || name.includes('accessor');
  }, []);

  const displayProductTypes = React.useMemo(() => {
    return (productTypes || []).filter((pt: any) => {
      const isAcc = isAccessoryProductType(pt);
      if (isAccessoryType) {
        return isAcc;
      }
      return !isAcc;
    });
  }, [productTypes, isAccessoryType, isAccessoryProductType]);

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

  // Auto-split departments into gender divisions (Boys & Girls or Men & Women)
  const autoSplitDepartments = React.useCallback((depts: any[]) => {
    const maleSuffix = isSchool ? 'Boys' : 'Men';
    const femaleSuffix = isSchool ? 'Girls' : 'Women';
    const result: any[] = [];

    depts.forEach((d) => {
      const idStr = String(d.id);
      const isAlreadySplit = idStr.endsWith('_boys') || idStr.endsWith('_girls') || (d.gender && d.gender !== 'unisex');
      if (isAlreadySplit) {
        result.push(d);
      } else {
        const rawId = idStr;
        result.push({
          ...d,
          id: `${rawId}_boys`,
          name: d.name,
          baseDeptName: d.baseDeptName || d.name,
          gender: 'male',
          division: d.division ? `${d.division} - ${maleSuffix}` : maleSuffix,
          selected: d.selected !== undefined ? d.selected : true,
          persons: d.persons || '0',
          sets: d.sets || '2',
          qty_mode: d.qty_mode || 'members_sets',
          direct_qty: d.direct_qty || ''
        });
        result.push({
          ...d,
          id: `${rawId}_girls`,
          name: d.name,
          baseDeptName: d.baseDeptName || d.name,
          gender: 'female',
          division: d.division ? `${d.division} - ${femaleSuffix}` : femaleSuffix,
          selected: d.selected !== undefined ? d.selected : true,
          persons: d.persons || '0',
          sets: d.sets || '2',
          qty_mode: d.qty_mode || 'members_sets',
          direct_qty: d.direct_qty || ''
        });
      }
    });
    return result;
  }, [isSchool]);



  const handleAutoLoadEntitiesAndMeasurements = async () => {
    if (!selectedOrgId) {
      toast.error('No customer organization selected. Please return to Step 1 and select an organization.');
      return;
    }

    setIsLoadingEntities(true);
    const loadingToast = toast.loading('Loading student & sizing data...');

    try {
      const res = await api.get(`/quotations/calculate/${selectedOrgId}`);
      const data = res.data;

      const members: any[] = data.entities || [];
      const dbDepts: any[] = data.departments || [];
      const totalEntities = data.total_entities !== undefined ? data.total_entities : members.length;
      const measuredCount = data.measured_count || 0;
      const pendingCount = data.pending_count || 0;
      const missingCount = data.missing_count || 0;

      // Dynamic gender suffixes based on industry sector (School vs Corporate/Dealership)
      const maleSuffix = isSchool ? 'Boys' : 'Men';
      const femaleSuffix = isSchool ? 'Girls' : 'Women';

      // Group members by department and separate by gender
      const deptBoys: Record<string, any[]> = {};
      const deptGirls: Record<string, any[]> = {};
      const deptOthers: Record<string, any[]> = {};

      // If an organization has only 1 department, map unassigned members to that department
      const soleDeptId = dbDepts.length === 1 ? String(dbDepts[0].id) : null;

      members.forEach((m: any) => {
        let dId = String(m.department_id || '');
        if (!dId && soleDeptId) {
          dId = soleDeptId;
        } else if (!dId) {
          dId = 'unassigned';
        }

        const g = (m.gender || '').toLowerCase().trim();
        if (g === 'male' || g === 'boy' || g === 'm' || g === 'men') {
          if (!deptBoys[dId]) deptBoys[dId] = [];
          deptBoys[dId].push(m);
        } else if (g === 'female' || g === 'girl' || g === 'f' || g === 'women') {
          if (!deptGirls[dId]) deptGirls[dId] = [];
          deptGirls[dId].push(m);
        } else {
          if (!deptOthers[dId]) deptOthers[dId] = [];
          deptOthers[dId].push(m);
        }
      });

      // Split into gender-separated department rows
      const updatedDepts: any[] = [];
      const effectiveDepts = [...dbDepts];
      if ((deptBoys['unassigned']?.length || 0) > 0 || (deptGirls['unassigned']?.length || 0) > 0) {
        effectiveDepts.push({
          id: 'unassigned',
          name: isSchool ? 'General / Unassigned' : 'General Staff',
          division: 'General'
        });
      }

      effectiveDepts.forEach((d: any) => {
        const rawId = String(d.id);
        const boys = deptBoys[rawId] || [];
        const girls = deptGirls[rawId] || [];

        if (boys.length > 0 && girls.length > 0) {
          // Both genders present -> create 2 separate rows
          updatedDepts.push({
            id: `${rawId}_boys`,
            name: `${d.name} (${maleSuffix})`,
            baseDeptName: d.name,
            gender: 'male',
            division: d.division ? `${d.division} - ${maleSuffix}` : maleSuffix,
            selected: true,
            persons: String(boys.length),
            sets: globalSets || '2',
            _memberCount: boys.length,
            _measuredCount: boys.filter(m => m.measurement_status === 'Completed').length,
            _members: boys
          });
          updatedDepts.push({
            id: `${rawId}_girls`,
            name: `${d.name} (${femaleSuffix})`,
            baseDeptName: d.name,
            gender: 'female',
            division: d.division ? `${d.division} - ${femaleSuffix}` : femaleSuffix,
            selected: true,
            persons: String(girls.length),
            sets: globalSets || '2',
            _memberCount: girls.length,
            _measuredCount: girls.filter(m => m.measurement_status === 'Completed').length,
            _members: girls
          });
        } else if (boys.length > 0) {
          updatedDepts.push({
            id: `${rawId}_boys`,
            name: `${d.name} (${maleSuffix})`,
            baseDeptName: d.name,
            gender: 'male',
            division: d.division || maleSuffix,
            selected: true,
            persons: String(boys.length),
            sets: globalSets || '2',
            _memberCount: boys.length,
            _measuredCount: boys.filter(m => m.measurement_status === 'Completed').length,
            _members: boys
          });
        } else if (girls.length > 0) {
          updatedDepts.push({
            id: `${rawId}_girls`,
            name: `${d.name} (${femaleSuffix})`,
            baseDeptName: d.name,
            gender: 'female',
            division: d.division || femaleSuffix,
            selected: true,
            persons: String(girls.length),
            sets: globalSets || '2',
            _memberCount: girls.length,
            _measuredCount: girls.filter(m => m.measurement_status === 'Completed').length,
            _members: girls
          });
        } else {
          // If no members uploaded yet or unassigned
          updatedDepts.push({
            id: `${rawId}_boys`,
            name: `${d.name} (${maleSuffix})`,
            baseDeptName: d.name,
            gender: 'male',
            division: d.division ? `${d.division} - ${maleSuffix}` : maleSuffix,
            selected: false,
            persons: '0',
            sets: globalSets || '2',
            _memberCount: 0,
            _measuredCount: 0
          });
          updatedDepts.push({
            id: `${rawId}_girls`,
            name: `${d.name} (${femaleSuffix})`,
            baseDeptName: d.name,
            gender: 'female',
            division: d.division ? `${d.division} - ${femaleSuffix}` : femaleSuffix,
            selected: false,
            persons: '0',
            sets: globalSets || '2',
            _memberCount: 0,
            _measuredCount: 0
          });
        }
      });

      if (setOrgDepartments) {
        setOrgDepartments(updatedDepts);
      }

      // Re-apply class-wise measurements/BOM and scale quantities
      if (setDepartmentItems) {
        const updatedDeptItems: Record<string, ManualItem[]> = {};

        updatedDepts.forEach((dept: any) => {
          const deptId = String(dept.id);
          const currentItems = (departmentItems || {})[deptId] || [];
          const personsNum = parseInt(dept.persons, 10) || 0;
          const setsNum = parseInt(dept.sets, 10) || 0;
          const totalUnits = personsNum * setsNum;

          if (currentItems.length > 0) {
            updatedDeptItems[deptId] = currentItems.map((item) => {
              const updatedItem = { ...item, quantity: String(totalUnits || 1) };

              if (item.product_id) {
                const prod = allProducts.find((p: any) => String(p.id) === String(item.product_id));
                if (prod) {
                  const autoDefaults = getAutoProductDefaults({
                    prod,
                    isSchool,
                    deptName: dept.baseDeptName || dept.name || '',
                    fabricsList,
                    buttonsList,
                    threadsList,
                    trimsList,
                    trimCategories
                  });
                  if (autoDefaults) {
                    if (autoDefaults.main_fabric_meters) updatedItem.main_fabric_meters = autoDefaults.main_fabric_meters;
                    if (autoDefaults.attachment_fabric1_meters) updatedItem.attachment_fabric1_meters = autoDefaults.attachment_fabric1_meters;
                    if (autoDefaults.attachment_fabric2_meters) updatedItem.attachment_fabric2_meters = autoDefaults.attachment_fabric2_meters;
                    if (autoDefaults.button_count) updatedItem.button_count = autoDefaults.button_count;
                    if (autoDefaults.thread_count) updatedItem.thread_count = autoDefaults.thread_count;
                    if (!updatedItem.fabric_id && autoDefaults.fabric_id) updatedItem.fabric_id = autoDefaults.fabric_id;
                    if (!updatedItem.button_id && autoDefaults.button_id) updatedItem.button_id = autoDefaults.button_id;
                    if (!updatedItem.thread_id && autoDefaults.thread_id) updatedItem.thread_id = autoDefaults.thread_id;
                    if (autoDefaults.trims && autoDefaults.trims.length > 0) updatedItem.trims = autoDefaults.trims;
                  }
                }
              }

              return updatedItem;
            });
          }
        });

        setDepartmentItems({ ...(departmentItems || {}), ...updatedDeptItems });
      }

      const activeCount = updatedDepts.filter((d: any) => d.selected).length;
      setEntityAuditSummary({
        totalEntities,
        measuredCount,
        pendingCount,
        missingCount,
        classesCount: activeCount
      });

      toast.success(
        `⚡ Auto-loaded ${totalEntities} students across ${activeCount} gender-separated divisions! (${measuredCount} verified measurements)`,
        { id: loadingToast, duration: 6000 }
      );
    } catch (err: any) {
      console.error('Failed to load organization entities and measurements', err);
      toast.error('Failed to load entity measurement records.', { id: loadingToast });
    } finally {
      setIsLoadingEntities(false);
    }
  };

  const handleApplySetsGlobally = (setsValue: string) => {
    setGlobalSets(setsValue);
    const setsNum = parseInt(setsValue, 10) || 1;

    if (setOrgDepartments) {
      const updatedDepts = (orgDepartments || []).map((dept: any) => ({
        ...dept,
        sets: setsValue
      }));
      setOrgDepartments(updatedDepts);

      if (setDepartmentItems) {
        const updatedDeptItems: Record<string, ManualItem[]> = {};
        updatedDepts.forEach((dept: any) => {
          const deptId = String(dept.id);
          const currentItems = (departmentItems || {})[deptId] || [];
          const personsNum = parseInt(dept.persons, 10) || 0;
          const totalUnits = personsNum * setsNum;
          if (currentItems.length > 0) {
            updatedDeptItems[deptId] = currentItems.map(item => ({
              ...item,
              quantity: String(totalUnits || 1)
            }));
          }
        });
        setDepartmentItems({ ...(departmentItems || {}), ...updatedDeptItems });
      }

      toast.success(`Applied ${setsValue} sets per person to all classes! Total units updated.`);
    }
  };

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
        value: (g.name || g.code || '').toLowerCase(),
        label: g.name ? `${g.name}${g.code ? ` (${g.code})` : ''}` : g.code,
      }));
    }
    return [];
  }, [dbGenders]);

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
    const mainFabricCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
    const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
    const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
    const buttonCost = 0; // included in product price
    const threadCost = 0; // included in product price
    const samCost = calculateProductSAMCost(item.sam_value, item.quantity);
    const unitTotal = mainFabricCost + att1Cost + att2Cost + buttonCost + threadCost + samCost;
    const btnPrice = buttonsList.find((b: any) => String(b.id) === String(item.button_id))?.unit_price || 0;
    const thrPrice = threadsList.find((t: any) => String(t.id) === String(item.thread_id))?.unit_price || 0;
    return { mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost, unitTotal, btnPrice, thrPrice };
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
    const newItem = { ...updated[index], ...changes };
    const costs = getItemCosts(newItem);
    newItem.price = costs.unitTotal.toFixed(2);
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
  const availableArtNumbers = React.useMemo(() => {
    const list: { art_number: string; product_name: string; product_id: number; product_type_id: number }[] = [];
    const seen = new Set<string>();
    (allProducts || []).forEach((p: any) => {
      const isAcc = isAccessoryProduct(p);
      if (isAccessoryType && !isAcc) return;
      if (!isAccessoryType && isAcc) return;

      if (p.art_number && String(p.art_number).trim()) {
        const art = String(p.art_number).trim();
        const lower = art.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          list.push({
            art_number: art,
            product_name: p.name || 'Unnamed Product',
            product_id: p.id,
            product_type_id: p.product_type_id
          });
        }
      }
    });
    return list;
  }, [allProducts, isAccessoryType, isAccessoryProduct]);

  const handleApplyArtNumber = React.useCallback((artVal: string, currentItem: ManualItem, deptName?: string): Partial<ManualItem> => {
    const clean = (artVal || '').trim();
    if (!clean) {
      return { art_number: '' };
    }

    const cleanLower = clean.toLowerCase();
    const cleanNoDash = cleanLower.replace(/[-\s]/g, '');

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
          gender: matchedProd.gender || 'Unisex',
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

      const updates: Partial<ManualItem> = {
        art_number: matchedProd.art_number || clean,
        product_id: String(matchedProd.id),
        product_type_id: String(matchedProd.product_type_id || currentItem.product_type_id || ''),
        product_name: matchedProd.name || '',
        name: matchedProd.name || '',
        design_number: '',
      };

      if (matchedProd.gender) {
        updates.gender = matchedProd.gender;
      }

      if (autoDefaults) {
        updates.sam_value = autoDefaults.sam_value;
        updates.main_fabric_meters = autoDefaults.main_fabric_meters;
        updates.attachment_fabric1_meters = autoDefaults.attachment_fabric1_meters;
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

      if (quotationType !== 'READYMADE') {
        const costs = getItemCosts({ ...currentItem, ...updates });
        updates.price = costs.unitTotal.toFixed(2);
      }

      return updates;
    }

    // No matching product in database yet - update art_number so user can keep typing freely
    return { art_number: artVal };
  }, [allProducts, isSchool, fabricsList, buttonsList, threadsList, trimsList, trimCategories, quotationType]);

  const updateItemTrim = (itemIndex: number, trimIndex: number, changes: any) => {
    const updated = [...manualItems];
    const item = { ...updated[itemIndex] };
    const defaultTrims = [
      { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', name: 'Buttons', count: item.button_count || '10', uom: 'pcs', unit_price: 0 },
      { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', name: 'Thread', count: item.thread_count || '1', uom: 'spools', unit_price: 0 }
    ];
    const curTrims = (item.trims && item.trims.length > 0) ? [...item.trims] : [...defaultTrims];
    while (curTrims.length <= trimIndex) {
      curTrims.push({
        id: Date.now() + Math.random(),
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

    const costs = getItemCosts(item);
    item.price = costs.unitTotal.toFixed(2);
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
    const defaultTrims = [
      { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', name: 'Buttons', count: item.button_count || '10', uom: 'pcs', unit_price: 0 },
      { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', name: 'Thread', count: item.thread_count || '1', uom: 'spools', unit_price: 0 }
    ];
    const curTrims = (item.trims && item.trims.length > 0) ? [...item.trims] : [...defaultTrims];
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
    const defaultTrims = [
      { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', name: 'Buttons', count: item.button_count || '10', uom: 'pcs', unit_price: 0 },
      { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', name: 'Thread', count: item.thread_count || '', uom: 'spools', unit_price: 0 }
    ];
    const curTrims = (item.trims && item.trims.length > 0) ? [...item.trims] : [...defaultTrims];
    curTrims.splice(trimIndex, 1);
    item.trims = curTrims;
    const costs = getItemCosts(item);
    item.price = costs.unitTotal.toFixed(2);
    updated[itemIndex] = item;
    setManualItems(updated);
  };

  const addNewItem = () => {
    setManualItems([
      ...manualItems,
      {
        id: Date.now(), product_type_id: '', product_id: '',
        fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
        attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
        attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
        button_id: '', button_count: '', thread_id: '', thread_count: '',
        trims: [
          { id: 'btn', trim_id: '', category: 'Buttons', name: 'Buttons', count: '10', uom: 'pcs', unit_price: 0 },
          { id: 'thr', trim_id: '', category: 'Thread', name: 'Thread', count: '1', uom: 'spools', unit_price: 0 }
        ],
        sam_value: '', design_number: '', quantity: '2', price: '',
        qty_mode: 'members_sets',
        no_of_members: '1',
        no_of_sets: '2',
        gender: ''
      }
    ]);
  };

  const addSeparateFabric = () => {
    setSeparateFabrics([
      ...separateFabrics,
      {
        id: Date.now() + Math.random(),
        fabric_id: '',
        meters: '1',
        rate: '0.00'
      }
    ]);
  };

  const updateSeparateFabric = (idx: number, changes: Partial<SeparateFabricItem>) => {
    const updated = [...separateFabrics];
    const item = { ...updated[idx], ...changes };
    if (changes.fabric_id) {
      const fabric = fabricsList.find((f: any) => String(f.id) === String(changes.fabric_id));
      if (fabric) {
        const calculatedRate = calculateFabricCost(fabric.id, '1', '6.777', '');
        item.rate = calculatedRate > 0 ? calculatedRate.toFixed(2) : (parseFloat(fabric.cost_per_meter) || 0).toFixed(2);
      }
    }
    updated[idx] = item;
    setSeparateFabrics(updated);
  };

  const removeSeparateFabric = (idx: number) => {
    setSeparateFabrics(separateFabrics.filter((_, i) => i !== idx));
  };

  // Shared select style
  const selectCls = "w-full px-2.5 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 bg-white transition-all";
  const inputCls = "px-2.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] focus:ring-1 focus:ring-[#2d8d9b]/20 text-center transition-all w-full disabled:opacity-40 disabled:cursor-not-allowed";

  const renderManualItemCard = (item: ManualItem, index: number) => {
    const { mainFabricCost, att1Cost, att2Cost, buttonCost, threadCost, samCost, unitTotal: calculatedUnitTotal, btnPrice, thrPrice } = getItemCosts(item);
    const unitTotal = (quotationType === 'READYMADE' || isAccessoryType) ? (parseFloat(item.price) || 0) : calculatedUnitTotal;

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
      if (quotationType === 'READYMADE') {
        const parsed = parseMaterialsField(p.materials);
        if (parsed.type?.toLowerCase() !== 'trade_readymade') return false;
      }
      if (quotationType === 'STANDARD') {
        const parsed = parseMaterialsField(p.materials);
        if (parsed.type?.toLowerCase() !== 'readymade') return false;
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

    const totalItemCost = unitTotal * (parseInt(item.quantity) || 0);

    const mainFabric = fabricsList.find((f: any) => String(f.id) === item.fabric_id);
    const att1Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric1_id);
    const att2Fabric = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric2_id);

    return (
      <div key={item.id} className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">

        {/* ── Card Header ── */}
        {quotationType === 'FABRIC' ? (
          <div className="p-5 bg-gradient-to-r from-zinc-50/80 to-white border-b border-zinc-100">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Department Dropdown if available */}
              {orgDepartments && orgDepartments.length > 0 && (
                <div className="min-w-[150px]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Department</p>
                  <select
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
                  </select>
                </div>
              )}

              {/* Quantity Selection Mode (Radio) */}
              <div className="min-w-[270px] bg-zinc-50 p-2.5 rounded-2xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Qty Selection</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`qty_mode_manual_fabric_${item.id || index}`}
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
                        className="text-[#2d8d9b] focus:ring-[#2d8d9b]"
                      />
                      <span>Members &amp; Sets</span>
                    </label>
                    <span className="text-zinc-300 font-bold">|</span>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`qty_mode_manual_fabric_${item.id || index}`}
                        checked={item.qty_mode === 'direct_products'}
                        onChange={() => {
                          updateItem(index, {
                            qty_mode: 'direct_products',
                            quantity: item.quantity || '1'
                          });
                        }}
                        className="text-[#2d8d9b] focus:ring-[#2d8d9b]"
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
                      <span className="text-xs font-mono font-black text-[#2d8d9b]">{item.quantity || 0} Units</span>
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

              <div className="flex items-center gap-6 ml-auto">
                {/* Unit Cost Display */}
                <div className="text-right self-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Unit Cost</p>
                  <p className="text-2xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                    ₹{unitTotal.toFixed(2)}
                  </p>
                  {parseInt(item.quantity) > 1 && (
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                      × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => setManualItems(manualItems.filter((_, i) => i !== index))}
                  disabled={manualItems.length === 1}
                  className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-center disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-gradient-to-r from-zinc-50/80 to-white border-b border-zinc-100">
            {/* ── TOP SECTION: ART NUMBER & QUICK SPEC IDENTIFIER ── */}
            <div className="mb-4 pb-3 border-b border-zinc-150 bg-sky-50/40 -mx-5 -mt-5 p-4 rounded-t-3xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <div className="min-w-[240px] max-w-[340px] flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                      <Hash size={13} className="text-sky-600" />
                      ART Number
                    </label>
                    {matchedProduct && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-emerald-600" /> Auto-loaded: {matchedProduct.name}
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
                  <select
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
                  </select>
                </div>
              )}

              {/* Gender Dropdown */}
              <div className="min-w-[130px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] mb-1.5 font-bold">Gender</p>
                <select
                  className={selectCls}
                  value={item.gender || ''}
                  onChange={(e) => updateItem(index, { gender: e.target.value })}
                >
                  <option value="">Select Gender...</option>
                  {availableGenders.length > 0 ? (
                    availableGenders.map((g: any) => (
                      <option key={g.id || g.code || g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="male">{isSchool ? 'Boys / Male' : 'Men / Male'}</option>
                      <option value="female">{isSchool ? 'Girls / Female' : 'Women / Female'}</option>
                      <option value="unisex">Unisex / All</option>
                    </>
                  )}
                </select>
              </div>

              {/* Product Type */}
              <div className="min-w-[150px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product Type</p>
                <select
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
                </select>
              </div>

              {/* Product */}
              <div className="flex-1 min-w-[200px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product</p>
                <select
                  className={`${selectCls} ${!item.product_type_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={item.product_id || ''}
                  disabled={!item.product_type_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    const prod = allProducts.find(p => String(p.id) === val);
                    const updates: Partial<ManualItem> = {
                      product_id: val,
                      product_type_id: String(prod?.product_type_id || item.product_type_id || ''),
                      product_name: prod?.name || '',
                      name: prod?.name || ''
                    };
                    if (isAccessoryType) {
                      if (prod) {
                        const basePrice = parseFloat(prod.base_price || prod.retail_sam_value || '0') || 0;
                        updateItem(index, {
                          product_id: val,
                          product_type_id: String(prod.product_type_id || item.product_type_id || ''),
                          art_number: prod.art_number || item.art_number || '',
                          gender: prod.gender || 'Unisex',
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
                        updates.main_fabric_meters = autoDefaults.main_fabric_meters;
                        updates.attachment_fabric1_meters = autoDefaults.attachment_fabric1_meters;
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
                      } else {
                        updates.art_number = prod.art_number || item.art_number || '';
                      }
                      if (prod.gender) {
                        updates.gender = prod.gender;
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
                    }
                    updateItem(index, updates);
                  }}
                >
                  <option value="">{isAccessoryType ? 'Select accessory...' : (item.product_type_id ? 'Select product...' : 'Select type first')}</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}{p.art_number ? ` (${p.art_number})` : ''}{isAccessoryType && p.base_price ? ` — ₹${parseFloat(p.base_price).toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
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
                    <select
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
                    </select>
                  )}
                </div>
              )}

              {/* Product SAM */}
              {quotationType !== 'READYMADE' && !isAccessoryType && (
                <div className="w-24">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product SAM</p>
                  <input
                    type="number" step="any" min="0" placeholder="0"
                    value={item.sam_value}
                    onChange={(e) => updateItem(index, { sam_value: e.target.value })}
                    className={inputCls}
                  />
                </div>
              )}

              {/* Final SAM Price */}
              {quotationType !== 'READYMADE' && !isAccessoryType && (
                <div className="w-28 text-right self-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Final SAM Price</p>
                  <p className="text-sm font-black text-[#8b6b5a] font-mono mt-2">
                    ₹{samCost.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Unit Price (for READYMADE and ACCESSORIES) */}
              {(quotationType === 'READYMADE' || isAccessoryType) && (
                <div className="w-28">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b] mb-1.5 font-bold">Unit Price (₹)</p>
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Qty Selection</span>
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
                        className="text-[#2d8d9b] focus:ring-[#2d8d9b]"
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
                        className="text-[#2d8d9b] focus:ring-[#2d8d9b]"
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
                      <span className="text-xs font-mono font-black text-[#2d8d9b]">{item.quantity || 0} Units</span>
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

              {/* Unit Cost Display */}
              <div className="ml-auto text-right self-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  {(quotationType === 'READYMADE' || isAccessoryType) ? 'Unit Price' : 'Unit Cost'}
                </p>
                <p className="text-2xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                  ₹{unitTotal.toFixed(2)}
                </p>
                {parseInt(item.quantity) > 1 && (
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                    × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                  </p>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => setManualItems(manualItems.filter((_, i) => i !== index))}
                disabled={manualItems.length === 1}
                className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-start mt-5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>

          </div>
        )}

        {/* ── Costing Breakdown Table ── */}
        <div className="p-5" style={{ display: (quotationType === 'READYMADE' || isAccessoryType) ? 'none' : 'block' }}>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Material Cost Breakdown</p>
          <div className="rounded-2xl border border-zinc-100 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                  <th className="p-3 text-left w-32">Component</th>
                  <th className="p-3 text-left">Item Selection</th>
                  <th className="p-3 text-left w-24">Meters / Qty</th>
                  <th className="p-3 text-left w-24">Fabric Width</th>
                  <th className="p-3 text-left w-36">Fabric SAM</th>
                  <th className="p-3 text-right w-24">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">

                {/* ── Main Fabric (MANDATORY) ── */}
                <tr className="hover:bg-zinc-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2d8d9b] flex-shrink-0"></span>
                      <span className="font-black text-[#3a525d]">Main Fabric</span>
                      <span className="text-red-400 font-black text-[10px]">*</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className={selectCls}
                      value={item.fabric_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = { fabric_id: val, main_fabric_rate: '0.00' };
                        if (val && !item.main_fabric_sam) {
                          updates.main_fabric_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select fabric...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                        </option>
                      ))}
                    </select>
                    {item.fabric_id && (
                      <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
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
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                        <input
                          type="number" step="any" min="0" placeholder="0.00"
                          value={item.main_fabric_sam}
                          onChange={(e) => updateItem(index, { main_fabric_sam: e.target.value })}
                          className={`${inputCls} w-24 px-2 py-1 text-left`}
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${mainFabricCost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                      ₹{mainFabricCost.toFixed(2)}
                    </span>
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
                    <select
                      className={selectCls}
                      value={item.attachment_fabric1_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = { attachment_fabric1_id: val, attachment_fabric1_rate: '0.00' };
                        if (val && !item.attachment_fabric1_sam) {
                          updates.attachment_fabric1_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select Att. Fabric 1 (Optional)...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                        </option>
                      ))}
                    </select>
                    {item.attachment_fabric1_id && (
                      <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
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
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                        <input
                          type="number" step="any" min="0" placeholder="0.00"
                          value={item.attachment_fabric1_sam}
                          onChange={(e) => updateItem(index, { attachment_fabric1_sam: e.target.value })}
                          className={`${inputCls} w-24 px-2 py-1 text-left`}
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${att1Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                      ₹{att1Cost.toFixed(2)}
                    </span>
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
                    <select
                      className={selectCls}
                      value={item.attachment_fabric2_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        const updates: Partial<ManualItem> = { attachment_fabric2_id: val, attachment_fabric2_rate: '0.00' };
                        if (val && !item.attachment_fabric2_sam) {
                          updates.attachment_fabric2_sam = '6.777';
                        }
                        updateItem(index, updates);
                      }}
                    >
                      <option value="">Select Att. Fabric 2 (Optional)...</option>
                      {fabricsList.map((f: any) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                        </option>
                      ))}
                    </select>
                    {item.attachment_fabric2_id && (
                      <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
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
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                        <input
                          type="number" step="any" min="0" placeholder="0.00"
                          value={item.attachment_fabric2_sam}
                          onChange={(e) => updateItem(index, { attachment_fabric2_sam: e.target.value })}
                          className={`${inputCls} w-24 px-2 py-1 text-left`}
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-black ${att2Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                      ₹{att2Cost.toFixed(2)}
                    </span>
                  </td>
                </tr>

                {/* ── Dynamic Database Trims ── */}
                {((item.trims && item.trims.length > 0) ? item.trims : [
                  { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', count: item.button_count || '0', uom: 'pcs' },
                  { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', count: item.thread_count || '1', uom: 'spools' }
                ]).map((trimItem: any, trimIdx: number) => {
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
                          <select
                            className="text-[11px] font-bold text-zinc-700 bg-transparent border-0 border-b border-dashed border-zinc-300 hover:border-zinc-500 focus:outline-none focus:border-[#2d8d9b] py-0.5 pr-2 cursor-pointer max-w-[110px]"
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
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <select
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
                        </select>
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
                        <span className="text-[#2d8d9b] font-black uppercase text-[10px] tracking-wider italic">
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
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2d8d9b] hover:text-[#1b5b64] uppercase tracking-wider transition-colors"
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
                {/* <tr className="bg-[#2d8d9b]/3 hover:bg-[#2d8d9b]/5">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8b6b5a] flex-shrink-0"></span>
                      <span className="font-black text-[#3a525d]">SAM Cost</span>
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
                <tr className="border-t-2 border-[#2d8d9b]/20 bg-[#2d8d9b]/5">
                  <td colSpan={5} className="p-4 font-black text-[10px] uppercase tracking-widest text-[#3a525d]">
                    Total Unit Cost
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-black text-lg text-[#2d8d9b] font-mono">
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

  const renderSetsBuilder = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="border-b border-zinc-100 pb-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-2xl font-black italic text-[#3a525d]">Custom Sets Builder</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
              Configure custom sets and package-level pricing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10">
              {manualItems.length} Sets
            </span>
          </div>
        </div>

        {/* Sets Cards List */}
        <div className="space-y-6">
          {manualItems.map((set, setIdx) => {
            const setName = set.size_breakdown?.set_name || '';
            const setProducts = set.size_breakdown?.products || [];

            return (
              <div key={set.id} className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                {/* Set Header */}
                <div className="p-6 bg-gradient-to-r from-zinc-50/80 to-white border-b border-zinc-150 flex items-center gap-4 flex-wrap">
                  {/* Set Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                    <Package size={20} />
                  </div>

                  {/* Set Name Input */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Set Name</label>
                    <input
                      type="text"
                      value={setName}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          size_breakdown: {
                            ...(updated[setIdx].size_breakdown || {}),
                            is_set: true,
                            set_name: e.target.value
                          }
                        };
                        setManualItems(updated);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold border border-zinc-200 rounded-xl text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      placeholder="e.g. Office Uniform Set, Security Kit"
                    />
                  </div>

                  {/* Set Price Input */}
                  <div className="w-32">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Set Price (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={set.price}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          price: e.target.value
                        };
                        setManualItems(updated);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#2d8d9b] text-center focus:outline-none focus:border-[#2d8d9b] bg-white transition-all font-mono"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Quantity Input */}
                  <div className="w-24">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d] block mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={set.quantity}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          quantity: e.target.value
                        };
                        setManualItems(updated);
                      }}
                      className="w-full px-3 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] text-center focus:outline-none focus:border-[#2d8d9b] bg-white transition-all"
                      placeholder="1"
                    />
                  </div>

                  {/* Delete Set Button */}
                  <button
                    onClick={() => {
                      setManualItems(manualItems.filter((_, i) => i !== setIdx));
                    }}
                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-150 self-end"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Nested Products */}
                <div className="p-6 bg-zinc-50/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Included Garments</span>
                    <button
                      onClick={() => {
                        const updated = [...manualItems];
                        const currentProds = updated[setIdx].size_breakdown?.products || [];
                        updated[setIdx] = {
                          ...updated[setIdx],
                          size_breakdown: {
                            ...(updated[setIdx].size_breakdown || {}),
                            is_set: true,
                            products: [
                              ...currentProds,
                              { product_type_id: '', product_type_name: '', product_id: '', product_name: '', gender: '' }
                            ]
                          }
                        };
                        setManualItems(updated);
                      }}
                      className="px-3 py-1.5 bg-[#2d8d9b]/10 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={12} /> Add Garment to Set
                    </button>
                  </div>

                  {setProducts.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 text-xs italic">
                      No garments added to this set yet. Click "Add Garment to Set" above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {setProducts.map((prod: any, prodIdx: number) => {
                        return (
                          <div key={prodIdx} className="flex items-center gap-4 bg-white p-3 border border-zinc-150 rounded-xl">
                            {/* Product Category / Type Select */}
                            <div className="flex-1 min-w-[150px]">
                              <select
                                value={prod.product_type_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const pTypeName = productTypes.find(pt => String(pt.id) === String(val))?.name || '';
                                  const updated = [...manualItems];
                                  const prods = [...(updated[setIdx].size_breakdown?.products || [])];
                                  prods[prodIdx] = {
                                    ...prods[prodIdx],
                                    product_type_id: val,
                                    product_type_name: pTypeName,
                                    product_id: '',
                                    product_name: ''
                                  };
                                  updated[setIdx] = {
                                    ...updated[setIdx],
                                    size_breakdown: {
                                      ...updated[setIdx].size_breakdown,
                                      products: prods
                                    }
                                  };
                                  setManualItems(updated);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] bg-white focus:outline-none"
                              >
                                <option value="">Select Category...</option>
                                {displayProductTypes.map(pt => (
                                  <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Manual Gender Select */}
                            <div className="w-[140px]">
                              <select
                                value={prod.gender || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...manualItems];
                                  const prods = [...(updated[setIdx].size_breakdown?.products || [])];
                                  prods[prodIdx] = {
                                    ...prods[prodIdx],
                                    gender: val
                                  };
                                  updated[setIdx] = {
                                    ...updated[setIdx],
                                    size_breakdown: {
                                      ...updated[setIdx].size_breakdown,
                                      products: prods
                                    }
                                  };
                                  setManualItems(updated);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] bg-white focus:outline-none cursor-pointer"
                              >
                                <option value="">Select Gender...</option>
                                <option value="male">{isSchool ? 'Boys / Male' : 'Men / Male'}</option>
                                <option value="female">{isSchool ? 'Girls / Female' : 'Women / Female'}</option>
                                <option value="unisex">Unisex / All</option>
                              </select>
                            </div>

                            {/* Product Select */}
                            <div className="flex-1 min-w-[200px]">
                              <select
                                value={prod.product_id}
                                disabled={!prod.product_type_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const pName = allProducts.find(p => String(p.id) === String(val))?.name || '';
                                  const updated = [...manualItems];
                                  const prods = [...(updated[setIdx].size_breakdown?.products || [])];
                                  prods[prodIdx] = {
                                    ...prods[prodIdx],
                                    product_id: val,
                                    product_name: pName
                                  };
                                  updated[setIdx] = {
                                    ...updated[setIdx],
                                    size_breakdown: {
                                      ...updated[setIdx].size_breakdown,
                                      products: prods
                                    }
                                  };
                                  setManualItems(updated);
                                }}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] bg-white focus:outline-none"
                              >
                                <option value="">Select Garment...</option>
                                {allProducts
                                  .filter(p => {
                                    const isCat = String(p.product_type_id) === String(prod.product_type_id);
                                    if (!isCat) return false;
                                    if (!prod.gender) return true;
                                    const prodGen = (p.gender || '').toLowerCase();
                                    const g = prod.gender.toLowerCase();
                                    if (g === 'male' || g === 'boy' || g === 'boys') {
                                      return prodGen === 'male' || prodGen === 'boys' || prodGen === 'boy' || prodGen === 'unisex' || !prodGen;
                                    }
                                    if (g === 'female' || g === 'girl' || g === 'girls') {
                                      return prodGen === 'female' || prodGen === 'girls' || prodGen === 'girl' || prodGen === 'unisex' || !prodGen;
                                    }
                                    return true;
                                  })
                                  .map(p => (
                                    <option key={p.id} value={String(p.id)}>
                                      {p.name}{p.art_number ? ` (${p.art_number})` : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* Delete Product from Set */}
                            <button
                              onClick={() => {
                                const updated = [...manualItems];
                                const prods = (updated[setIdx].size_breakdown?.products || []).filter((_: any, i: number) => i !== prodIdx);
                                updated[setIdx] = {
                                  ...updated[setIdx],
                                  size_breakdown: {
                                    ...updated[setIdx].size_breakdown,
                                    products: prods
                                  }
                                };
                                setManualItems(updated);
                              }}
                              className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Set Button */}
        <Button
          onClick={() => {
            const newSet: ManualItem = {
              id: Date.now(),
              product_type_id: '',
              product_id: '',
              fabric_id: '',
              main_fabric_meters: '',
              main_fabric_rate: '',
              main_fabric_sam: '',
              attachment_fabric1_id: '',
              attachment_fabric1_meters: '',
              attachment_fabric1_rate: '',
              attachment_fabric1_sam: '',
              attachment_fabric2_id: '',
              attachment_fabric2_meters: '',
              attachment_fabric2_rate: '',
              attachment_fabric2_sam: '',
              button_id: '',
              button_count: '',
              thread_id: '',
              thread_count: '',
              sam_value: '',
              design_number: '',
              quantity: '1',
              price: '0',
              size_breakdown: {
                is_set: true,
                set_name: '',
                products: []
              }
            };
            setManualItems([...manualItems, newSet]);
          }}
          className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-200"
        >
          <Plus size={14} strokeWidth={3} /> Create New Set
        </Button>

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
            disabled={!isManualItemsValid()}
            onClick={onNext}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
          >
            Expenses Setup <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  };

  if (quotationType === 'SET_TYPE') {
    return renderSetsBuilder();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="border-b border-zinc-100 pb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-black italic text-[#3a525d]">Sizing & Measurement Audits</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
            Live verification of measurements profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10">
            {hasMeasurements
              ? `${orgAnalysis.total_entities} Entities`
              : `${manualItems.reduce((acc, it) => acc + (parseInt(it.quantity) || 0), 0)} Custom Units`}
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
                <Layers size={14} className="text-[#2d8d9b]" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Department-Wise Sizing &amp; Measurement Audits</h4>
                <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">
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
                  <div key={deptId} className="border-2 border-zinc-200 hover:border-[#2d8d9b]/30 rounded-[2rem] bg-white p-6 shadow-sm space-y-4">
                    {/* Department Header with Live verification of measurements profiles */}
                    <div className="flex items-center justify-between gap-4 flex-wrap border-b border-zinc-100 pb-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-black text-[#3a525d] uppercase tracking-wider bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200">
                          {dept.division ? `${dept.name} (${dept.division})` : dept.name}
                        </span>
                        <span className="text-[10px] font-black text-[#2d8d9b] bg-[#2d8d9b]/10 border border-[#2d8d9b]/20 px-2.5 py-1 rounded-lg font-mono">
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
                        className="px-3 py-1.5 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] text-[#2d8d9b] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus size={12} />
                        <span>Add Product / Gender Line</span>
                      </button>
                    </div>

                    {/* Department Audit Table */}
                    <div className="border border-zinc-150 rounded-2xl overflow-x-auto custom-scrollbar bg-white shadow-2xs">
                      <table className="w-full min-w-[950px] text-left border-collapse text-xs align-middle">
                        <thead>
                          <tr className="bg-[#2d8d9b]/5 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                            <th className="p-3 align-middle">ART Number</th>
                            <th className="p-3 align-middle">Product Name</th>
                            <th className="p-3 align-middle w-40">Gender</th>
                            <th className="p-3 align-middle">Design Number</th>
                            <th className="p-3 align-middle">Material</th>
                            <th className="p-3 align-middle font-mono">SAM (₹)</th>
                            <th className="p-3 align-middle text-right">Quantity</th>
                            <th className="p-3 align-middle w-28">Price/Unit (₹)</th>
                            <th className="p-3 align-middle w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                          {currentRows.map((rowItem: any, rIdx: number) => {
                            const rowQty = getDeptAuditRowQty(deptId, dept.name, rowItem.gender, completedDept);
                            return (
                              <tr key={rowItem.id || rIdx} className="hover:bg-zinc-50/50 bg-white">
                                <td className="p-3 font-black text-[#2d8d9b] align-middle">{rowItem.art_number || '—'}</td>
                                <td className="p-3 text-zinc-800 align-middle">
                                  {uniqueTemplateProducts.length > 1 ? (
                                    <select
                                      value={rowItem.product_id}
                                      onChange={(e) => {
                                        const pid = e.target.value;
                                        const matched = uniqueTemplateProducts.find((u: any) => String(u.product_id) === String(pid));
                                        updateDeptAuditRow(deptId, rIdx, {
                                          product_id: pid,
                                          product_name: matched?.product_name || rowItem.product_name,
                                          art_number: matched?.art_number || rowItem.art_number,
                                          materials: matched?.materials || rowItem.materials,
                                          sam_value: matched?.sam_value ?? rowItem.sam_value
                                        });
                                      }}
                                      className="text-xs font-bold text-zinc-800 bg-transparent border border-zinc-200 rounded px-1.5 py-1 focus:outline-none focus:border-[#2d8d9b]"
                                    >
                                      {uniqueTemplateProducts.map((u: any) => (
                                        <option key={u.product_id} value={u.product_id}>{u.product_name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    rowItem.product_name
                                  )}
                                </td>
                                <td className="p-2 align-middle">
                                  <select
                                    value={rowItem.gender || ''}
                                    onChange={(e) => updateDeptAuditRow(deptId, rIdx, { gender: e.target.value })}
                                    className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#3a525d] focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Select Gender...</option>
                                    {availableGenders.map((g: any) => (
                                      <option key={g.id || g.code || g.value} value={g.value}>
                                        {g.label}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2 align-middle">
                                  <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-700 flex items-center justify-between">
                                    <span>{rowItem.design_number_override || rowItem.design_code || 'Auto (BOM)'}</span>
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-600">Locked</span>
                                  </div>
                                </td>
                                <td className="p-3 text-zinc-400 align-middle">{rowItem.materials || '—'}</td>
                                <td className="p-2 align-middle">
                                  <input
                                    type="number" step="0.0001" min="0" placeholder="₹"
                                    value={rowItem.sam_value ?? ''}
                                    onChange={(e) => updateDeptAuditRow(deptId, rIdx, { sam_value: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                    className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-600 focus:outline-none transition-all"
                                  />
                                </td>
                                <td className="p-3 text-right font-black text-[#3a525d] align-middle">
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
                                    className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none transition-all"
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
                          <tr className="bg-[#3a525d]/5 border-t-2 border-[#2d8d9b]/20 text-[#3a525d] font-black text-xs">
                            <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400 align-middle">
                              {dept.name} Totals
                            </td>
                            <td className="p-3 font-mono font-black text-[#3a525d] align-middle">
                              {deptSAMTotal > 0 ? `₹${deptSAMTotal.toFixed(2)}` : '—'}
                            </td>
                            <td className="p-3 text-right font-black text-[#3a525d] align-middle">
                              {deptUnits} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                            </td>
                            <td colSpan={2} className="p-3 font-mono font-black text-[#2d8d9b] align-middle">
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
                <Layers size={14} className="text-[#2d8d9b]" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product & Design Sizing Audit</h4>
                <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">Design numbers & prices are editable</span>
              </div>
              <div className="border border-zinc-150 rounded-2xl overflow-x-auto custom-scrollbar bg-white shadow-sm min-h-[350px] pb-12">
                <table className="w-full min-w-[1000px] text-left border-collapse text-xs align-middle">
                  <thead>
                    <tr className="bg-[#2d8d9b]/5 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                      <th className="p-3 align-middle">ART Number</th>
                      <th className="p-3 align-middle">Product Name</th>
                      <th className="p-3 align-middle">Gender</th>
                      <th className="p-3 align-middle">Design Number</th>
                      <th className="p-3 align-middle">Material</th>
                      <th className="p-3 align-middle font-mono">SAM (₹)</th>
                      <th className="p-3 align-middle text-right">Quantity</th>
                      <th className="p-3 align-middle w-28">Price/Unit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                    {mergedItems.map((item, mi) => {
                      const qty = getQty(item);
                      const firstIdx = item._indices[0];
                      return (
                        <tr key={mi} className="hover:bg-zinc-50/50 bg-white">
                          <td className="p-3 font-black text-[#2d8d9b] align-middle">{item.art_number || '—'}</td>
                          <td className="p-3 text-zinc-800 align-middle">{item.product_name}</td>
                                                    <td className="p-2 align-middle min-w-[130px]">
                            <select
                              value={item.gender || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...templateLineItems];
                                item._indices.forEach((i: number) => {
                                  updated[i] = { ...updated[i], gender: val };
                                });
                                setTemplateLineItems(updated);
                              }}
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#3a525d] focus:outline-none cursor-pointer"
                            >
                              <option value="">Select Gender...</option>
                              {availableGenders.map((g: any) => (
                                <option key={g.id || g.code || g.value} value={g.value}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 align-middle">
                            <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-700 flex items-center justify-between">
                              <span>{templateLineItems[firstIdx]?.design_number_override || item.design_code || 'Auto (BOM)'}</span>
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-600">Locked</span>
                            </div>
                          </td>
                          <td className="p-3 text-zinc-400 align-middle">{item.materials || '—'}</td>
                          <td className="p-2 align-middle">
                            <input
                              type="number" step="0.0001" min="0" placeholder="₹"
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
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
                          <td className="p-3 text-right font-black text-[#3a525d] align-middle">
                            {qty > 0 ? <span>{qty} <span className="text-zinc-400 font-normal">Units</span></span> : <span className="text-zinc-300">0</span>}
                          </td>
                          <td className="p-2 align-middle">
                            <input
                              type="number" step="0.01" min="0" placeholder="Optional"
                              className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
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
                    <tr className="bg-[#3a525d]/5 border-t-2 border-[#2d8d9b]/20 text-[#3a525d] font-black text-xs">
                      <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400 align-middle">Totals</td>
                      <td className="p-3 font-mono font-black text-[#3a525d] align-middle">
                        {totalSAMMin > 0 ? `₹${totalSAMMin.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 text-right font-black text-[#3a525d] align-middle">
                        {totalQty} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                      </td>
                      <td className="p-3 font-mono font-black text-[#2d8d9b] align-middle">
                        {totalPrice > 0 ? `₹${totalPrice.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ADDITIONAL CUSTOM GARMENTS (for template mode) */}
          <div className="space-y-4 mt-8 pt-8 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <Plus size={14} className="text-[#2d8d9b]" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Additional Custom Garments</h4>
              <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">Optional manual additions</span>
            </div>
            <div className="space-y-4">
              {manualItems.map((item, idx) => renderManualItemCard(item, idx))}
            </div>
            <Button
              onClick={addNewItem}
              className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-200"
            >
              <Plus size={14} strokeWidth={3} /> Add Product Item Line
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* ═══ DEPARTMENT-WISE PRODUCT ITEMS ═══ */}
          {(() => {
            const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
            const hasDepartments = selectedDepts.length > 0;

            if (hasDepartments) {
              // Department-aware mode: show per-department item cards
              return (
                <div className="space-y-6">
                  {/* Department mode banner */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#2d8d9b]/5 border border-[#2d8d9b]/15 rounded-2xl flex-wrap">
                    <div className="w-8 h-8 rounded-lg bg-[#2d8d9b]/15 flex items-center justify-center flex-shrink-0">
                      <Layers size={16} className="text-[#2d8d9b]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Department-Wise Quotation Mode</p>
                      <p className="text-[9px] font-bold text-[#2d8d9b] mt-0.5">
                        {selectedDepts.length} department division{selectedDepts.length !== 1 ? 's' : ''} active · Consumption &amp; sizing managed per division
                      </p>
                    </div>
                    <div className="flex items-center gap-2">

                      <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 tracking-widest font-mono">
                        {selectedDepts.reduce((sum: number, d: any) => {
                          const isDirect = d.qty_mode === 'direct_products';
                          const units = isDirect
                            ? (parseInt(d.direct_qty || d.persons) || 0)
                            : (parseInt(d.persons) || 0) * (parseInt(d.sets) || 0);
                          return sum + units;
                        }, 0)} Total Units
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const grouped: Record<string, any[]> = {};
                    selectedDepts.forEach((d: any) => {
                      const name = d.baseDeptName || d.name?.replace(/\s*\((Boys|Girls|Men|Women)\)/i, '') || 'General';
                      if (!grouped[name]) {
                        grouped[name] = [];
                      }
                      grouped[name].push(d);
                    });

                    return Object.entries(grouped).map(([deptName, deptsInGroup]) => (
                      <div key={deptName} className="rounded-[2rem] overflow-hidden border-2 border-zinc-200 hover:border-[#2d8d9b]/30 transition-all shadow-sm bg-white p-6 space-y-6">
                        <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#3a525d]/10 flex items-center justify-center flex-shrink-0">
                              <Layers size={18} className="text-[#3a525d]" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-[#3a525d]">{deptName}</p>
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                {deptsInGroup.length} Division{deptsInGroup.length !== 1 ? 's' : ''} under this Department
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!setOrgDepartments) return;
                              const base = deptsInGroup[0];
                              const newDivId = `${base.id}_div_${Date.now()}`;
                              const newDept = {
                                ...base,
                                id: newDivId,
                                division: `Division ${deptsInGroup.length + 1}`,
                                gender: '',
                                persons: '0',
                                sets: '2',
                                qty_mode: 'members_sets',
                                direct_qty: '',
                                selected: true
                              };
                              setOrgDepartments([...orgDepartments, newDept]);
                            }}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-[#2d8d9b] text-zinc-700 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Plus size={12} />
                            <span>Add Division</span>
                          </button>
                        </div>

                        <div className="space-y-8 divide-y divide-zinc-200 pt-2">
                          {deptsInGroup.map((dept: any) => {
                            const deptId = String(dept.id);
                            const deptItems = (departmentItems || {})[deptId] || [];
                            const isDirectMode = dept.qty_mode === 'direct_products';
                            const personsCount = parseInt(dept.persons) || 0;
                            const setsCount = parseInt(dept.sets) || 0;
                            const directUnits = parseInt(dept.direct_qty || dept.persons) || 0;
                            const totalUnits = isDirectMode ? directUnits : personsCount * setsCount;

                            const addDeptItem = () => {
                              const newItem: ManualItem = {
                                id: Date.now() + Math.random(),
                                product_type_id: '', product_id: '',
                                fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
                                attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
                                attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
                                button_id: '', button_count: '', thread_id: '', thread_count: '',
                                trims: [
                                  { id: 'btn', trim_id: '', category: 'Buttons', name: 'Buttons', count: '10', uom: 'pcs', unit_price: 0 },
                                  { id: 'thr', trim_id: '', category: 'Thread', name: 'Thread', count: '1', uom: 'spools', unit_price: 0 }
                                ],
                                sam_value: '', design_number: '', quantity: String(totalUnits || 1), price: ''
                              };
                              if (setDepartmentItems) {
                                setDepartmentItems({
                                  ...(departmentItems || {}),
                                  [deptId]: [...deptItems, newItem]
                                });
                              }
                            };

                            const updateDeptItem = (index: number, changes: Partial<ManualItem>) => {
                              const updated = [...deptItems];
                              const newItem = { ...updated[index], ...changes };
                              // For STANDARD (Readymade) auto-calc price from fabric/SAM
                              if (quotationType !== 'READYMADE') {
                                const costs = getItemCosts(newItem);
                                newItem.price = costs.unitTotal.toFixed(2);
                              }
                              updated[index] = newItem;
                              if (setDepartmentItems) {
                                setDepartmentItems({ ...(departmentItems || {}), [deptId]: updated });
                              }

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
                                  if (setDepartmentItems) {
                                    setDepartmentItems((prev: any) => {
                                      const prevList = prev?.[deptId] || [];
                                      const fresh = [...prevList];
                                      if (fresh[index] && fresh[index].id === newItem.id) {
                                        fresh[index] = { ...fresh[index], design_number: matched || '' };
                                      }
                                      return { ...(prev || {}), [deptId]: fresh };
                                    });
                                  }
                                });
                              }
                            };

                            const updateDeptItemTrim = (itemIndex: number, trimIndex: number, changes: any) => {
                              const updated = [...deptItems];
                              const item = { ...updated[itemIndex] };
                              const defaultTrims = [
                                { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', name: 'Buttons', count: item.button_count || '10', uom: 'pcs', unit_price: 0 },
                                { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', name: 'Thread', count: item.thread_count || '1', uom: 'spools', unit_price: 0 }
                              ];
                              const curTrims = (item.trims && item.trims.length > 0) ? [...item.trims] : [...defaultTrims];
                              while (curTrims.length <= trimIndex) {
                                curTrims.push({
                                  id: Date.now() + Math.random(),
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

                              if (quotationType !== 'READYMADE') {
                                const costs = getItemCosts(item);
                                item.price = costs.unitTotal.toFixed(2);
                              }
                              updated[itemIndex] = item;
                              if (setDepartmentItems) {
                                setDepartmentItems({ ...(departmentItems || {}), [deptId]: updated });
                              }

                              resolveCandidateDns(item).then((matched) => {
                                if (setDepartmentItems) {
                                  setDepartmentItems((prev: any) => {
                                    const prevList = prev?.[deptId] || [];
                                    const fresh = [...prevList];
                                    if (fresh[itemIndex] && fresh[itemIndex].id === item.id) {
                                      fresh[itemIndex] = { ...fresh[itemIndex], design_number: matched || '' };
                                    }
                                    return { ...(prev || {}), [deptId]: fresh };
                                  });
                                }
                              });
                            };

                            const addDeptItemTrim = (itemIndex: number, category = 'Trim') => {
                              const updated = [...deptItems];
                              const item = { ...updated[itemIndex] };
                              const defaultTrims = [
                                { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', name: 'Buttons', count: item.button_count || '10', uom: 'pcs', unit_price: 0 },
                                { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', name: 'Thread', count: item.thread_count || '1', uom: 'spools', unit_price: 0 }
                              ];
                              const curTrims = (item.trims && item.trims.length > 0) ? [...item.trims] : [...defaultTrims];
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
                              if (setDepartmentItems) {
                                setDepartmentItems({ ...(departmentItems || {}), [deptId]: updated });
                              }
                            };

                            const removeDeptItemTrim = (itemIndex: number, trimIndex: number) => {
                              const updated = [...deptItems];
                              const item = { ...updated[itemIndex] };
                              const defaultTrims = [
                                { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', name: 'Buttons', count: item.button_count || '10', uom: 'pcs', unit_price: 0 },
                                { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', name: 'Thread', count: item.thread_count || '1', uom: 'spools', unit_price: 0 }
                              ];
                              const curTrims = (item.trims && item.trims.length > 0) ? [...item.trims] : [...defaultTrims];
                              curTrims.splice(trimIndex, 1);
                              item.trims = curTrims;
                              if (quotationType !== 'READYMADE') {
                                const costs = getItemCosts(item);
                                item.price = costs.unitTotal.toFixed(2);
                              }
                              updated[itemIndex] = item;
                              if (setDepartmentItems) {
                                setDepartmentItems({ ...(departmentItems || {}), [deptId]: updated });
                              }
                            };

                            const removeDeptItem = (index: number) => {
                              if (setDepartmentItems) {
                                setDepartmentItems({
                                  ...(departmentItems || {}),
                                  [deptId]: deptItems.filter((_: any, i: number) => i !== index)
                                });
                              }
                            };

                            return (
                              <div key={dept.id} className="pt-6 first:pt-0 space-y-4">
                                {/* Division Header with Sizing & Persons config */}
                                <div className="flex items-center justify-between gap-4 flex-wrap bg-zinc-50 p-4 rounded-2xl border border-zinc-150">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-xs font-black text-[#3a525d] uppercase tracking-wider bg-zinc-200/50 px-3 py-1 rounded-lg">
                                      {dept.division ? `Division: ${dept.division}` : 'Main Division'}
                                    </span>
                                    {deptsInGroup.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (setOrgDepartments) {
                                            setOrgDepartments(orgDepartments.filter((d: any) => d.id !== dept.id));
                                          }
                                        }}
                                        className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Remove this division"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                    {(() => {
                                      const deptEntities = (orgAnalysis?.entities || []).filter((e: any) => {
                                        const eid = String(e.department_id || '');
                                        const cleanId = String(dept.id || '').replace(/_.*$/, '');
                                        return eid === String(dept.id) || eid === cleanId || (dept.name && e.department_name === dept.name);
                                      });
                                      const mCount = deptEntities.length || dept._memberCount || parseInt(dept.persons || '0') || 0;
                                      const measCount = deptEntities.filter((e: any) => e.measurement_status === 'Completed').length || dept._measuredCount || 0;
                                      if (mCount > 0) {
                                        return (
                                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                                            <Users size={12} /> {mCount} Members ({measCount} Measured)
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* Gender Dropdown */}
                                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-zinc-200 shadow-2xs">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Gender:</label>
                                      <select
                                        value={dept.gender || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (setOrgDepartments) {
                                            setOrgDepartments(orgDepartments.map((d: any) => d.id === dept.id ? { ...d, gender: val } : d));
                                          }
                                        }}
                                        className="text-xs font-bold text-[#3a525d] bg-transparent border-none focus:outline-none cursor-pointer"
                                      >
                                        <option value="">Select Gender...</option>
                                        {availableGenders.map((g: any) => (
                                          <option key={g.id || g.code || g.value} value={g.value}>
                                            {g.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-wrap">
                                    {/* Radio mode: By Members & Sets VS No. of Products */}
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-2xs">
                                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-black uppercase tracking-wider text-[#3a525d]">
                                        <input
                                          type="radio"
                                          name={`qty_mode_${dept.id}`}
                                          checked={dept.qty_mode !== 'direct_products'}
                                          onChange={() => {
                                            if (setOrgDepartments) {
                                              const updatedDepts = orgDepartments.map((d: any) => {
                                                if (d.id === dept.id) {
                                                  const m = parseInt(d.persons) || 0;
                                                  const s = parseInt(d.sets) || 2;
                                                  const newUnits = m * s;
                                                  if (setDepartmentItems && departmentItems[deptId]) {
                                                    setDepartmentItems({
                                                      ...departmentItems,
                                                      [deptId]: departmentItems[deptId].map((it: any) => ({ ...it, quantity: String(newUnits || 1) }))
                                                    });
                                                  }
                                                  return { ...d, qty_mode: 'members_sets' };
                                                }
                                                return d;
                                              });
                                              setOrgDepartments(updatedDepts);
                                            }
                                          }}
                                          className="text-[#2d8d9b] focus:ring-[#2d8d9b]"
                                        />
                                        <span>Members &amp; Sets</span>
                                      </label>

                                      <span className="text-zinc-300 font-bold">|</span>

                                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-black uppercase tracking-wider text-[#3a525d]">
                                        <input
                                          type="radio"
                                          name={`qty_mode_${dept.id}`}
                                          checked={dept.qty_mode === 'direct_products'}
                                          onChange={() => {
                                            if (setOrgDepartments) {
                                              const updatedDepts = orgDepartments.map((d: any) => {
                                                if (d.id === dept.id) {
                                                  const directQty = d.direct_qty || d.persons || '10';
                                                  const newUnits = parseInt(directQty) || 0;
                                                  if (setDepartmentItems && departmentItems[deptId]) {
                                                    setDepartmentItems({
                                                      ...departmentItems,
                                                      [deptId]: departmentItems[deptId].map((it: any) => ({ ...it, quantity: String(newUnits || 1) }))
                                                    });
                                                  }
                                                  return { ...d, qty_mode: 'direct_products', direct_qty: directQty };
                                                }
                                                return d;
                                              });
                                              setOrgDepartments(updatedDepts);
                                            }
                                          }}
                                          className="text-[#2d8d9b] focus:ring-[#2d8d9b]"
                                        />
                                        <span>No. of Products</span>
                                      </label>
                                    </div>

                                    {dept.qty_mode !== 'direct_products' ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">No. of Members</label>
                                          <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={dept.persons}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (setOrgDepartments) {
                                                const updatedDepts = orgDepartments.map((d: any) => {
                                                  if (d.id === dept.id) {
                                                    const newTotal = (parseInt(val) || 0) * (parseInt(d.sets) || 0);
                                                    if (setDepartmentItems && departmentItems[deptId]) {
                                                      const updatedItems = departmentItems[deptId].map((item: any) => ({
                                                        ...item,
                                                        quantity: String(newTotal || 1)
                                                      }));
                                                      setDepartmentItems({
                                                        ...departmentItems,
                                                        [deptId]: updatedItems
                                                      });
                                                    }
                                                    return { ...d, persons: val };
                                                  }
                                                  return d;
                                                });
                                                setOrgDepartments(updatedDepts);
                                              }
                                            }}
                                            className="w-20 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#2d8d9b]"
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">Sets per Person</label>
                                          <input
                                            type="number"
                                            min="1"
                                            placeholder="2"
                                            value={dept.sets}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (setOrgDepartments) {
                                                const updatedDepts = orgDepartments.map((d: any) => {
                                                  if (d.id === dept.id) {
                                                    const newTotal = (parseInt(d.persons) || 0) * (parseInt(val) || 0);
                                                    if (setDepartmentItems && departmentItems[deptId]) {
                                                      const updatedItems = departmentItems[deptId].map((item: any) => ({
                                                        ...item,
                                                        quantity: String(newTotal || 1)
                                                      }));
                                                      setDepartmentItems({
                                                        ...departmentItems,
                                                        [deptId]: updatedItems
                                                      });
                                                    }
                                                    return { ...d, sets: val };
                                                  }
                                                  return d;
                                                });
                                                setOrgDepartments(updatedDepts);
                                              }
                                            }}
                                            className="w-16 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#2d8d9b]"
                                          />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-[#3a525d]">No. of Products</label>
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="0"
                                          value={dept.direct_qty || dept.persons || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (setOrgDepartments) {
                                              const updatedDepts = orgDepartments.map((d: any) => {
                                                if (d.id === dept.id) {
                                                  const newTotal = parseInt(val) || 0;
                                                  if (setDepartmentItems && departmentItems[deptId]) {
                                                    const updatedItems = departmentItems[deptId].map((item: any) => ({
                                                      ...item,
                                                      quantity: String(newTotal || 1)
                                                    }));
                                                    setDepartmentItems({
                                                      ...departmentItems,
                                                      [deptId]: updatedItems
                                                    });
                                                  }
                                                  return { ...d, direct_qty: val };
                                                }
                                                return d;
                                              });
                                              setOrgDepartments(updatedDepts);
                                            }
                                          }}
                                          className="w-24 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#2d8d9b]"
                                        />
                                      </div>
                                    )}

                                    <div className="text-right min-w-[90px] border-l border-zinc-200 pl-4">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Units</p>
                                      <p className="text-xs font-mono font-black text-[#2d8d9b]">{totalUnits} Units</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Department Product Items */}
                                <div className="space-y-4">
                                  {deptItems.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-2xl">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No product lines added yet</p>
                                      <p className="text-[9px] font-semibold text-zinc-300 mt-1">Click "Add Product Line" below to add items for this department</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {deptItems.map((item: ManualItem, idx: number) => {
                                        // Inline render adapted for department items
                                        const { mainFabricCost, att1Cost, att2Cost, samCost, unitTotal: calculatedUnitTotal } = getItemCosts(item);
                                        const unitTotal = (quotationType === 'READYMADE' || isAccessoryType) ? (parseFloat(item.price) || 0) : calculatedUnitTotal;
                                        const totalItemCost = unitTotal * (parseInt(item.quantity) || 0);

                                        const matchedDeptProduct = (allProducts || []).find((p: any) => {
                                          if (item.product_id && String(p.id) === String(item.product_id)) return true;
                                          if (!item.art_number) return false;
                                          const clean = item.art_number.trim().toLowerCase();
                                          const cleanNoDash = clean.replace(/[-\s]/g, '');
                                          const pArt = (p.art_number || '').trim().toLowerCase();
                                          const pArtNoDash = pArt.replace(/[-\s]/g, '');
                                          return pArt === clean || (cleanNoDash.length >= 3 && pArtNoDash === cleanNoDash);
                                        });

                                        const deptFilteredProducts = allProducts.filter((p: any) => {
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
                                          
                                          // Filter by gender: boys/girls/unisex
                                          const deptGender = (dept.gender || '').toLowerCase();
                                          const prodGender = (p.gender || '').toLowerCase();
                                          let matchesGender = true;
                                          if (deptGender === 'male' || deptGender === 'boy' || deptGender === 'boys' || deptGender === '1' || deptGender === 'm') {
                                            matchesGender = prodGender === 'male' || prodGender === 'boys' || prodGender === 'boy' || prodGender === 'unisex' || prodGender === 'all' || prodGender === '1' || !prodGender;
                                          } else if (deptGender === 'female' || deptGender === 'girl' || deptGender === 'girls' || deptGender === '2' || deptGender === 'f') {
                                            matchesGender = prodGender === 'female' || prodGender === 'girls' || prodGender === 'girl' || prodGender === 'unisex' || prodGender === 'all' || prodGender === '2' || !prodGender;
                                          } else if (deptGender && deptGender !== 'unisex' && deptGender !== 'all') {
                                            matchesGender = prodGender === deptGender || prodGender === 'unisex' || prodGender === 'all' || !prodGender;
                                          }

                                          if (quotationType === 'READYMADE') {
                                            const parsed = parseMaterialsField(p.materials);
                                            return isCorrectCategory && matchesGender && parsed.type?.toLowerCase() === 'trade_readymade';
                                          }
                                          if (quotationType === 'STANDARD') {
                                            const parsed = parseMaterialsField(p.materials);
                                            return isCorrectCategory && matchesGender && parsed.type?.toLowerCase() === 'readymade';
                                          }
                                          return isCorrectCategory && matchesGender;
                                        });

                                        return (
                                          <div key={item.id || idx} className="bg-zinc-50/50 border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                                            {quotationType === 'FABRIC_SET' ? (
                                              <div className="p-4 bg-white border-b border-zinc-100">
                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                  {/* Quantity */}
                                                  <div className="w-24">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Quantity</p>
                                                    <input
                                                      type="number" min="1" placeholder="1"
                                                      value={item.quantity}
                                                      onChange={(e) => updateDeptItem(idx, { quantity: e.target.value })}
                                                      className={inputCls}
                                                    />
                                                  </div>

                                                  <div className="flex items-center gap-6 ml-auto">
                                                    {/* Unit Cost Display */}
                                                    <div className="text-right self-center">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Unit Cost</p>
                                                      <p className="text-xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                                                        ₹{unitTotal.toFixed(2)}
                                                      </p>
                                                      {parseInt(item.quantity) > 1 && (
                                                        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                                          × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                                                        </p>
                                                      )}
                                                    </div>

                                                    {/* Delete */}
                                                    <button
                                                      onClick={() => removeDeptItem(idx)}
                                                      className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-center"
                                                    >
                                                      <Trash2 size={14} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="p-5 bg-white border-b border-zinc-100">
                                                {/* ── TOP SECTION: ART NUMBER & QUICK SPEC IDENTIFIER ── */}
                                                <div className="mb-4 pb-3 border-b border-zinc-150 bg-sky-50/40 -mx-5 -mt-5 p-4 rounded-t-2xl flex items-center justify-between gap-4 flex-wrap">
                                                  <div className="flex items-center gap-3 flex-wrap flex-1">
                                                    <div className="min-w-[240px] max-w-[340px] flex-1">
                                                      <div className="flex items-center justify-between mb-1">
                                                        <label className="text-[10px] font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                                          <Hash size={13} className="text-sky-600" />
                                                          ART Number
                                                        </label>
                                                        {matchedDeptProduct && (
                                                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                                            <CheckCircle2 size={10} className="text-emerald-600" /> Auto-loaded: {matchedDeptProduct.name}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="relative">
                                                        <input
                                                          type="text"
                                                          list={`art-list-dept-${deptId}-${idx}`}
                                                          value={item.art_number || ''}
                                                          onChange={(e) => {
                                                            const val = e.target.value;
                                                            const updates = handleApplyArtNumber(val, item, dept?.baseDeptName || dept?.name || '');
                                                            updateDeptItem(idx, updates);
                                                          }}
                                                          placeholder="Enter ART # to auto-load product..."
                                                          className="w-full px-3 py-2 text-xs font-mono font-black border border-sky-300 rounded-xl text-sky-950 bg-white placeholder:text-zinc-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs"
                                                        />
                                                        <datalist id={`art-list-dept-${deptId}-${idx}`}>
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
                                                  {/* Product Type */}
                                                  <div className="min-w-[140px]">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product Type</p>
                                                    <select
                                                      className={selectCls}
                                                      value={item.product_type_id}
                                                      onChange={(e) => updateDeptItem(idx, { product_type_id: e.target.value, product_id: '', sam_value: '', design_number: '' })}
                                                    >
                                                      <option value="">Select type...</option>
                                                      {displayProductTypes.map((pt: any) => (
                                                        <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                                                      ))}
                                                    </select>
                                                  </div>

                                                  {/* Product */}
                                                  <div className="flex-1 min-w-[180px]">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product</p>
                                                    <select
                                                      className={`${selectCls} ${!item.product_type_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                      value={item.product_id || ''}
                                                      disabled={!item.product_type_id}
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        const prod = allProducts.find((p: any) => String(p.id) === val);
                                                        const updates: Partial<ManualItem> = {
                                                          product_id: val,
                                                          product_type_id: String(prod?.product_type_id || item.product_type_id || ''),
                                                          product_name: prod?.name || '',
                                                          name: prod?.name || ''
                                                        };
                                                        if (isAccessoryType) {
                                                          if (prod) {
                                                            const basePrice = parseFloat(prod.base_price || prod.retail_sam_value || '0') || 0;
                                                            updateDeptItem(idx, {
                                                              product_id: val,
                                                              product_type_id: String(prod.product_type_id || item.product_type_id || ''),
                                                              art_number: prod.art_number || item.art_number || '',
                                                              price: basePrice > 0 ? basePrice.toFixed(2) : (item.price || '0.00'),
                                                              size_breakdown: {
                                                                ...(item.size_breakdown || {}),
                                                                selected_size: prod.base_size || 'Free Size',
                                                                is_accessory: true
                                                              }
                                                            });
                                                          } else {
                                                            updateDeptItem(idx, { product_id: '', art_number: '', price: '' });
                                                          }
                                                          return;
                                                        }
                                                        if (prod) {
                                                          updates.sam_value = prod.sam_value !== null ? String(prod.sam_value) : '';

                                                          // Automatically resolve class/grade fabric and trim consumption
                                                          const autoDefaults = getAutoProductDefaults({
                                                            prod,
                                                            isSchool,
                                                            deptName: dept?.baseDeptName || dept?.name || '',
                                                            fabricsList,
                                                            buttonsList,
                                                            threadsList,
                                                            trimsList,
                                                            trimCategories
                                                          });
                                                          if (autoDefaults) {
                                                            updates.main_fabric_meters = autoDefaults.main_fabric_meters;
                                                            updates.attachment_fabric1_meters = autoDefaults.attachment_fabric1_meters;
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
                                                          } else {
                                                            updates.art_number = prod.art_number || item.art_number || '';
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
                                                        }
                                                        updateDeptItem(idx, updates);
                                                      }}
                                                    >
                                                      <option value="">{isAccessoryType ? 'Select accessory...' : (item.product_type_id ? 'Select product...' : 'Select type first')}</option>
                                                      {deptFilteredProducts.map((p: any) => (
                                                        <option key={p.id} value={String(p.id)}>
                                                          {p.name}{p.art_number ? ` (${p.art_number})` : ''}{isAccessoryType && p.base_price ? ` — ₹${parseFloat(p.base_price).toFixed(2)}` : ''}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>

                                                  {/* Selected Size (for MANUAL and ACCESSORIES type) */}
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
                                                          onChange={(e) => updateDeptItem(idx, {
                                                            size_breakdown: { ...(item.size_breakdown || {}), selected_size: e.target.value, is_accessory: true }
                                                          })}
                                                          className={inputCls}
                                                        />
                                                      ) : (
                                                        <select
                                                          className={selectCls}
                                                          value={item.size_breakdown?.selected_size || ''}
                                                          onChange={(e) => updateDeptItem(idx, {
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
                                                        </select>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* SAM / Unit Price */}
                                                  {(quotationType === 'READYMADE' || isAccessoryType) ? (
                                                    <div className="w-28">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-[#2d8d9b] mb-1.5 font-bold">Unit Price (₹)</p>
                                                      <input
                                                        type="number" step="0.01" min="0" placeholder="0.00"
                                                        value={item.price}
                                                        onChange={(e) => updateDeptItem(idx, { price: e.target.value })}
                                                        className={inputCls}
                                                      />
                                                    </div>
                                                  ) : (
                                                    <div className="w-24">
                                                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Product SAM</p>
                                                      <input
                                                        type="number" step="any" min="0" placeholder="0"
                                                        value={item.sam_value}
                                                        onChange={(e) => updateDeptItem(idx, { sam_value: e.target.value })}
                                                        className={inputCls}
                                                      />
                                                    </div>
                                                  )}

                                                  {/* Quantity */}
                                                  <div className="w-20">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">Quantity</p>
                                                    <input
                                                      type="number" min="1" placeholder="1"
                                                      value={item.quantity}
                                                      onChange={(e) => updateDeptItem(idx, { quantity: e.target.value })}
                                                      className={inputCls}
                                                    />
                                                  </div>

                                                  {/* Unit Cost Display */}
                                                  <div className="ml-auto text-right self-center">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                                      {(quotationType === 'READYMADE' || isAccessoryType) ? 'Unit Price' : 'Unit Cost'}
                                                    </p>
                                                    <p className="text-xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                                                      ₹{unitTotal.toFixed(2)}
                                                    </p>
                                                    {parseInt(item.quantity) > 1 && (
                                                      <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                                                        × {item.quantity} = <span className="text-[#3a525d] font-black">₹{totalItemCost.toFixed(2)}</span>
                                                      </p>
                                                    )}
                                                  </div>

                                                  {/* Delete */}
                                                  <button
                                                    onClick={() => removeDeptItem(idx)}
                                                    className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 self-start mt-5"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                            )}

                                            {/* Material Cost Breakdown (STANDARD only) */}
                                            {quotationType !== 'READYMADE' && !isAccessoryType && (
                                              <div className="p-5" style={{ display: 'block' }}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">Material Cost Breakdown</p>
                                                <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                                                  <table className="w-full text-xs border-collapse">
                                                    <thead>
                                                      <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                                                        <th className="p-3 text-left w-32">Component</th>
                                                        <th className="p-3 text-left">Item Selection</th>
                                                        <th className="p-3 text-left w-24">Meters / Qty</th>
                                                        <th className="p-3 text-left w-24">Fabric Width</th>
                                                        <th className="p-3 text-left w-36">Fabric SAM</th>
                                                        <th className="p-3 text-right w-24">Cost (₹)</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-50">

                                                      {/* ── Main Fabric (MANDATORY) ── */}
                                                      {(() => {
                                                        const mainFab = fabricsList.find((f: any) => String(f.id) === item.fabric_id);
                                                        return (
                                                          <tr className="hover:bg-zinc-50/50">
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-[#2d8d9b] flex-shrink-0"></span>
                                                                <span className="font-black text-[#3a525d]">Main Fabric</span>
                                                                <span className="text-red-400 font-black text-[10px]">*</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
                                                                className={selectCls}
                                                                value={item.fabric_id}
                                                                onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  const updates: Partial<ManualItem> = { fabric_id: val, main_fabric_rate: '0.00' };
                                                                  if (val && !item.main_fabric_sam) updates.main_fabric_sam = '6.777';
                                                                  updateDeptItem(idx, updates);
                                                                }}
                                                              >
                                                                <option value="">Select fabric...</option>
                                                                {fabricsList.map((f: any) => (
                                                                  <option key={f.id} value={String(f.id)}>
                                                                    {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                              {item.fabric_id && (
                                                                <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                                                                  Trans: ₹{getRateForFabric(item.fabric_id)}/m | Margin: {getMarginForFabric(item.fabric_id)}%
                                                                </div>
                                                              )}
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.1" min="0" placeholder="0.0"
                                                                  value={item.main_fabric_meters}
                                                                  onChange={(e) => updateDeptItem(idx, { main_fabric_meters: e.target.value })}
                                                                  className={`${inputCls} w-20`}
                                                                />
                                                                <span className="text-zinc-400 font-bold text-[10px]">m</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <span className="font-semibold text-zinc-600">
                                                                {mainFab?.width ? `${mainFab.width}"` : '—'}
                                                              </span>
                                                            </td>
                                                            <td className="p-3">
                                                              {item.fabric_id ? (
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                                                                  <input
                                                                    type="number" step="any" min="0" placeholder="0.00"
                                                                    value={item.main_fabric_sam}
                                                                    onChange={(e) => updateDeptItem(idx, { main_fabric_sam: e.target.value })}
                                                                    className={`${inputCls} w-24 px-2 py-1 text-left`}
                                                                  />
                                                                </div>
                                                              ) : (
                                                                <span className="text-zinc-300 italic text-[10px]">—</span>
                                                              )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <span className={`font-mono font-black ${mainFabricCost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                                                                ₹{mainFabricCost.toFixed(2)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })()}

                                                      {/* ── Attachment Fabric 1 (OPTIONAL) ── */}
                                                      {(() => {
                                                        const att1Fab = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric1_id);
                                                        const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
                                                        return (
                                                          <tr className="hover:bg-zinc-50/50">
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0"></span>
                                                                <span className="font-semibold text-zinc-500">Att. Fabric 1</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
                                                                className={selectCls}
                                                                value={item.attachment_fabric1_id}
                                                                onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  const updates: Partial<ManualItem> = { attachment_fabric1_id: val, attachment_fabric1_rate: '0.00' };
                                                                  if (val && !item.attachment_fabric1_sam) updates.attachment_fabric1_sam = '6.777';
                                                                  updateDeptItem(idx, updates);
                                                                }}
                                                              >
                                                                <option value="">Select Att. Fabric 1 (Optional)...</option>
                                                                {fabricsList.map((f: any) => (
                                                                  <option key={f.id} value={String(f.id)}>
                                                                    {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                              {item.attachment_fabric1_id && (
                                                                <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                                                                  Trans: ₹{getRateForFabric(item.attachment_fabric1_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric1_id)}%
                                                                </div>
                                                              )}
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.1" min="0" placeholder="0.0"
                                                                  value={item.attachment_fabric1_meters}
                                                                  onChange={(e) => updateDeptItem(idx, { attachment_fabric1_meters: e.target.value })}
                                                                  className={`${inputCls} w-20`}
                                                                />
                                                                <span className="text-zinc-400 font-bold text-[10px]">m</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <span className="font-semibold text-zinc-600">
                                                                {att1Fab?.width ? `${att1Fab.width}"` : '—'}
                                                              </span>
                                                            </td>
                                                            <td className="p-3">
                                                              {item.attachment_fabric1_id ? (
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                                                                  <input
                                                                    type="number" step="any" min="0" placeholder="0.00"
                                                                    value={item.attachment_fabric1_sam}
                                                                    onChange={(e) => updateDeptItem(idx, { attachment_fabric1_sam: e.target.value })}
                                                                    className={`${inputCls} w-24 px-2 py-1 text-left`}
                                                                  />
                                                                </div>
                                                              ) : (
                                                                <span className="text-zinc-300 italic text-[10px]">—</span>
                                                              )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <span className={`font-mono font-black ${att1Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                                                                ₹{att1Cost.toFixed(2)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })()}

                                                      {/* ── Attachment Fabric 2 (OPTIONAL) ── */}
                                                      {(() => {
                                                        const att2Fab = fabricsList.find((f: any) => String(f.id) === item.attachment_fabric2_id);
                                                        const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
                                                        return (
                                                          <tr className="hover:bg-zinc-50/50">
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-zinc-200 flex-shrink-0"></span>
                                                                <span className="font-semibold text-zinc-450">Att. Fabric 2</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
                                                                className={selectCls}
                                                                value={item.attachment_fabric2_id}
                                                                onChange={(e) => {
                                                                  const val = e.target.value;
                                                                  const updates: Partial<ManualItem> = { attachment_fabric2_id: val, attachment_fabric2_rate: '0.00' };
                                                                  if (val && !item.attachment_fabric2_sam) updates.attachment_fabric2_sam = '6.777';
                                                                  updateDeptItem(idx, updates);
                                                                }}
                                                              >
                                                                <option value="">Select Att. Fabric 2 (Optional)...</option>
                                                                {fabricsList.map((f: any) => (
                                                                  <option key={f.id} value={String(f.id)}>
                                                                    {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                              {item.attachment_fabric2_id && (
                                                                <div className="text-[9px] text-[#2d8d9b] font-bold mt-1">
                                                                  Trans: ₹{getRateForFabric(item.attachment_fabric2_id)}/m | Margin: {getMarginForFabric(item.attachment_fabric2_id)}%
                                                                </div>
                                                              )}
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.1" min="0" placeholder="0.0"
                                                                  value={item.attachment_fabric2_meters}
                                                                  onChange={(e) => updateDeptItem(idx, { attachment_fabric2_meters: e.target.value })}
                                                                  className={`${inputCls} w-20`}
                                                                />
                                                                <span className="text-zinc-400 font-bold text-[10px]">m</span>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <span className="font-semibold text-zinc-600">
                                                                {att2Fab?.width ? `${att2Fab.width}"` : '—'}
                                                              </span>
                                                            </td>
                                                            <td className="p-3">
                                                              {item.attachment_fabric2_id ? (
                                                                <div className="flex items-center gap-1">
                                                                  <span className="text-zinc-400 font-bold text-[10px]">₹</span>
                                                                  <input
                                                                    type="number" step="any" min="0" placeholder="0.00"
                                                                    value={item.attachment_fabric2_sam}
                                                                    onChange={(e) => updateDeptItem(idx, { attachment_fabric2_sam: e.target.value })}
                                                                    className={`${inputCls} w-24 px-2 py-1 text-left`}
                                                                  />
                                                                </div>
                                                              ) : (
                                                                <span className="text-zinc-300 italic text-[10px]">—</span>
                                                              )}
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <span className={`font-mono font-black ${att2Cost > 0 ? 'text-[#3a525d]' : 'text-zinc-300'}`}>
                                                                ₹{att2Cost.toFixed(2)}
                                                              </span>
                                                            </td>
                                                          </tr>
                                                        );
                                                      })()}

                                                      {/* ── Dynamic Database Trims ── */}
                                                      {((item.trims && item.trims.length > 0) ? item.trims : [
                                                        { id: 'btn', trim_id: item.button_id || '', category: 'Buttons', count: item.button_count || '0', uom: 'pcs' },
                                                        { id: 'thr', trim_id: item.thread_id || '', category: 'Thread', count: item.thread_count || '1', uom: 'spools' }
                                                      ]).map((trimItem: any, trimIdx: number) => {
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
                                                                <select
                                                                  className="text-[11px] font-bold text-zinc-700 bg-transparent border-0 border-b border-dashed border-zinc-300 hover:border-zinc-500 focus:outline-none focus:border-[#2d8d9b] py-0.5 pr-2 cursor-pointer max-w-[110px]"
                                                                  value={trimCat}
                                                                  onChange={(e) => {
                                                                    const newCat = e.target.value;
                                                                    const newMeta = getTrimCategoryMeta(newCat);
                                                                    updateDeptItemTrim(idx, trimIdx, {
                                                                      category: newCat,
                                                                      uom: newMeta.defaultUom
                                                                    });
                                                                  }}
                                                                >
                                                                  {allTrimCategories.map((c: string) => (
                                                                    <option key={c} value={c}>{c}</option>
                                                                  ))}
                                                                </select>
                                                              </div>
                                                            </td>
                                                            <td className="p-3">
                                                              <select
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

                                                                  updateDeptItemTrim(idx, trimIdx, {
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
                                                              </select>
                                                            </td>
                                                            <td className="p-3">
                                                              <div className="flex items-center gap-1.5">
                                                                <input
                                                                  type="number" step="0.5" min="0" placeholder="0"
                                                                  value={isThr ? (trimItem.count || item.thread_count || '1') : (trimItem.count || '')}
                                                                  onChange={(e) => updateDeptItemTrim(idx, trimIdx, { count: e.target.value })}
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
                                                              <span className="text-[#2d8d9b] font-black uppercase text-[10px] tracking-wider italic">Included</span>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                              <div className="flex items-center justify-end gap-2">
                                                                <span className="font-mono font-black text-zinc-300">₹0.00</span>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => removeDeptItemTrim(idx, trimIdx)}
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
                                                              onClick={() => addDeptItemTrim(idx, 'Trim')}
                                                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2d8d9b] hover:text-[#1b5b64] uppercase tracking-wider transition-colors"
                                                            >
                                                              <Plus size={13} strokeWidth={2.5} /> Add Trim
                                                            </button>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Quick:</span>
                                                              {['Zipper', 'Elastic', 'Label', 'Interlining', 'Velcro'].map(cat => (
                                                                <button
                                                                  key={cat}
                                                                  type="button"
                                                                  onClick={() => addDeptItemTrim(idx, cat)}
                                                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 transition-colors"
                                                                >
                                                                  + {cat}
                                                                </button>
                                                              ))}
                                                            </div>
                                                          </div>
                                                        </td>
                                                      </tr>

                                                    </tbody>
                                                    {/* ── Total Footer ── */}
                                                    <tfoot>
                                                      <tr className="border-t-2 border-[#2d8d9b]/20 bg-[#2d8d9b]/5">
                                                        <td colSpan={5} className="p-4 font-black text-[10px] uppercase tracking-widest text-[#3a525d]">
                                                          Total Unit Cost
                                                        </td>
                                                        <td className="p-4 text-right">
                                                          <span className="font-black text-lg text-[#2d8d9b] font-mono">
                                                            ₹{unitTotal.toFixed(2)}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    </tfoot>
                                                  </table>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-3 items-center mt-4 flex-wrap">
                                  <Button
                                    onClick={addDeptItem}
                                    className="h-10 px-5 bg-[#3a525d]/8 hover:bg-[#3a525d] hover:!text-white !text-[#3a525d] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-[#3a525d]/20 transition-all"
                                  >
                                    <Plus size={13} strokeWidth={3} /> Add Product Line for {dept.division ? `${deptName} (${dept.division})` : deptName}
                                  </Button>

                                  {(() => {
                                    const otherDepts = selectedDepts.filter((d: any) => String(d.id) !== deptId);
                                    if (otherDepts.length === 0) return null;
                                    return (
                                      <div className="relative">
                                        <select
                                          value=""
                                          onChange={(e) => {
                                            const fromDeptId = e.target.value;
                                            if (!fromDeptId) return;
                                            const fromItems = (departmentItems || {})[fromDeptId] || [];
                                            if (fromItems.length === 0) {
                                              toast.error('The selected department has no product lines to copy');
                                              return;
                                            }
                                            // Clone items with new random IDs and adjust quantity
                                            const clonedItems = fromItems.map((item: any) => ({
                                              ...item,
                                              id: Date.now() + Math.random(),
                                              quantity: String(totalUnits || 1)
                                            }));
                                            if (setDepartmentItems) {
                                              setDepartmentItems({
                                                ...(departmentItems || {}),
                                                [deptId]: clonedItems
                                              });
                                              toast.success(`Copied ${clonedItems.length} product lines successfully!`);
                                            }
                                          }}
                                          className="h-10 px-4 pr-8 text-[10px] font-black uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl transition-all cursor-pointer appearance-none focus:outline-none"
                                        >
                                          <option value="" disabled>Copy Config From...</option>
                                          {otherDepts.map((od: any) => {
                                            const odItemsCount = ((departmentItems || {})[String(od.id)] || []).length;
                                            const nameOption = od.grade || od.name || 'Dept';
                                            return (
                                              <option key={od.id} value={String(od.id)}>
                                                {od.division ? `${nameOption} (${od.division})` : nameOption} ({odItemsCount} item{odItemsCount !== 1 ? 's' : ''})
                                              </option>
                                            );
                                          })}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-indigo-500">
                                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                          </svg>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              );
            }

            // No departments selected — flat manualItems mode
            return (
              <>
                <div className="space-y-4">
                  {manualItems.map((item, idx) => renderManualItemCard(item, idx))}
                </div>

                <Button
                  onClick={addNewItem}
                  className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 !text-black rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-200"
                >
                  <Plus size={14} strokeWidth={3} /> Add Product Item Line
                </Button>
              </>
            );
          })()}
        </>
      )}


      {/* ═══ RAW FABRICS — SOLD SEPARATELY ═══ */}
      {/* This section is for customers who want to PURCHASE FABRICS alongside their garment/product order */}
      {/* Visible for STANDARD (Readymade) and READYMADE (Trade Readymade) quotation types */}
      {quotationType !== 'FABRIC' && quotationType !== 'FABRIC_SET' && !isAccessoryType && (
        <div className="mt-10 rounded-[2rem] overflow-hidden border-2 border-[#2d8d9b]/20 shadow-lg shadow-[#2d8d9b]/5">
          {/* Section Banner Header */}
          <div className="bg-gradient-to-r from-[#2d8d9b]/10 via-[#2d8d9b]/5 to-transparent px-6 py-4 border-b border-[#2d8d9b]/15 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/15 flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-[#2d8d9b]" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-[#3a525d] tracking-tight">Raw Fabrics — Sold Separately</h4>
              <p className="text-[10px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-80 mt-0.5">
                Optional · Customer purchases fabric rolls in addition to products
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase bg-[#2d8d9b]/10 text-[#2d8d9b] border border-[#2d8d9b]/20 tracking-widest">
              {separateFabrics.length} Line{separateFabrics.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-5 bg-white space-y-4">
            {separateFabrics.length > 0 ? (
              <div className="border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs align-middle">
                  <thead>
                    <tr className="bg-[#2d8d9b]/5 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                      <th className="p-3">Fabric Item Selection</th>
                      <th className="p-3 text-center w-32">Meters</th>
                      <th className="p-3 text-center w-36">Rate/Meter (₹)</th>
                      <th className="p-3 text-right w-36">Total Cost (₹)</th>
                      <th className="p-3 text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-650">
                    {separateFabrics.map((sf, idx) => {
                      const meters = parseFloat(sf.meters) || 0;
                      const rate = parseFloat(sf.rate) || 0;
                      const totalCost = meters * rate;

                      return (
                        <tr key={sf.id || idx} className="hover:bg-zinc-50/50 bg-white">
                          <td className="p-2">
                            <select
                              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-zinc-200 rounded-lg text-[#3a525d] focus:outline-none focus:border-[#2d8d9b] bg-white"
                              value={sf.fabric_id}
                              onChange={(e) => updateSeparateFabric(idx, { fabric_id: e.target.value })}
                            >
                              <option value="">Select fabric...</option>
                              {fabricsList.map((f: any) => (
                                <option key={f.id} value={String(f.id)}>
                                  {f.name}{f.width ? ` (${f.width}")` : ''}{f.shade ? ` – ${f.shade}` : ''}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="px-2.5 py-2 text-xs font-bold border border-zinc-200 rounded-xl text-[#3a525d] text-center transition-all w-full"
                              value={sf.meters}
                              onChange={(e) => updateSeparateFabric(idx, { meters: e.target.value })}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="px-2.5 py-2 text-xs font-mono font-bold border border-zinc-200 rounded-xl text-[#2d8d9b] text-center transition-all w-full"
                              value={sf.rate}
                              onChange={(e) => updateSeparateFabric(idx, { rate: e.target.value })}
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-black text-[#2d8d9b] pr-4">
                            ₹{totalCost.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeSeparateFabric(idx)}
                              className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 mx-auto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[#2d8d9b]/15 bg-[#2d8d9b]/3">
                      <td colSpan={3} className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Raw Fabric Cost</td>
                      <td className="p-3 text-right font-black text-lg text-[#2d8d9b] font-mono">
                        ₹{separateFabrics.reduce((sum, sf) => sum + (parseFloat(sf.meters) || 0) * (parseFloat(sf.rate) || 0), 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-[#2d8d9b]/20 rounded-2xl bg-[#2d8d9b]/3">
                <Package size={28} className="text-[#2d8d9b]/40 mx-auto mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No fabric lines added yet</p>
                <p className="text-[10px] font-semibold text-zinc-350 mt-1">Click the button below to add fabric selling lines</p>
              </div>
            )}

            <Button
              onClick={addSeparateFabric}
              className="h-12 px-6 bg-[#2d8d9b]/10 hover:bg-[#2d8d9b] hover:!text-white !text-[#2d8d9b] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-[#2d8d9b]/25 transition-all"
            >
              <Plus size={14} strokeWidth={3} /> Add Fabric Selling Line
            </Button>
          </div>
        </div>
      )}

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
          className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
        >
          Expenses Setup <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
