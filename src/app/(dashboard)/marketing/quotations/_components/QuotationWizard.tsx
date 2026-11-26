'use client';

import React, { useState, useEffect } from 'react';
import toast from '@/components/ui/toast';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Organization, ProductType, SeparateFabricItem, ManualItem, TemplateLineItem } from '../page';
import { formatFabricDisplayName } from '@/lib/fabricFormatter';
import { getItemKind, getLineError, parseQty, toSeparateFabrics, fabricLineFromSeparate, formatProductDisplayName } from '../_lib/itemLines';

// Map a saved quotation item back into an editable item line.
// legacyType is the old metrics_summary.quotation_type, used to infer the kind of older items.
const savedItemToLine = (item: any, legacyType?: string): ManualItem => {
  const sb = item.size_breakdown || {};
  const kind = getItemKind(item, legacyType);
  return {
    id: item.id || Date.now() + Math.random(),
    item_kind: kind,
    product_type_id: String(item.product_type_id || ''),
    product_id: String(sb.product_id || item.product_id || ''),
    product_name: kind === 'CUSTOM' ? (item.product_name || item.name || sb.product_name || item.manual_item_name || 'Custom Item') : (formatProductDisplayName(item) || sb.product_name || item.product_name || ''),
    name: kind === 'CUSTOM' ? (item.name || item.product_name || sb.name || item.manual_item_name || 'Custom Item') : (formatProductDisplayName(item) || item.name || sb.product_name || item.product_name || ''),
    art_number: sb.art_number || item.art_number || '',
    fabric_id: String(sb.fabric_id || ''),
    main_fabric_meters: String(sb.main_fabric_meters || ''),
    main_fabric_rate: String(sb.main_fabric_rate || ''),
    main_fabric_sam: String(sb.main_fabric_sam || ''),
    attachment_fabric1_id: String(sb.attachment_fabric1_id || ''),
    attachment_fabric1_meters: String(sb.attachment_fabric1_meters || ''),
    attachment_fabric1_rate: String(sb.attachment_fabric1_rate || ''),
    attachment_fabric1_sam: String(sb.attachment_fabric1_sam || ''),
    attachment_fabric2_id: String(sb.attachment_fabric2_id || ''),
    attachment_fabric2_meters: String(sb.attachment_fabric2_meters || ''),
    attachment_fabric2_rate: String(sb.attachment_fabric2_rate || ''),
    attachment_fabric2_sam: String(sb.attachment_fabric2_sam || ''),
    button_id: String(sb.button_id || ''),
    button_count: String(sb.button_count || ''),
    thread_id: String(sb.thread_id || ''),
    thread_count: String(sb.thread_count || ''),
    trims: kind === 'READYMADE'
      ? (sb.trims || [
          { id: 'btn', trim_id: String(sb.button_id || ''), category: 'Buttons', name: 'Buttons', count: String(sb.button_count || '10'), uom: 'pcs', unit_price: 0 },
          { id: 'thr', trim_id: String(sb.thread_id || ''), category: 'Thread', name: 'Thread', count: String(sb.thread_count || ''), uom: 'spools', unit_price: 0 }
        ])
      : (sb.trims || []),
    sam_value: String(sb.sam_value || ''),
    design_number: String(sb.design_number || ''),
    brand_tier: sb.brand_tier || '',
    quantity: String(item.quantity ?? ''),
    price: String(item.unit_price ?? ''),
    // Keep the saved rate as-is; the user can switch back to the calculated rate in the item modal
    rate_manual: true,
    qty_mode: 'direct_products',
    department_id: sb.department_id ? String(sb.department_id) : '',
    department_name: sb.department_name || '',
    gender: sb.gender || '',
    size_breakdown: sb
  };
};

// Saved separate-fabric items become fabric lines
const savedQuoteToLines = (fullQuote: any): ManualItem[] => {
  const legacyType = fullQuote.metrics_summary?.quotation_type;
  const rawItems: any[] = fullQuote.items || [];
  const lines: ManualItem[] = [];
  rawItems.forEach((item: any) => {
    if (item.size_breakdown?.is_separate_fabric) {
      lines.push(fabricLineFromSeparate({
        id: item.id || Date.now() + Math.random(),
        fabric_id: String(item.size_breakdown?.fabric_id || ''),
        meters: String(item.size_breakdown?.meters || item.quantity || ''),
        rate: String(item.size_breakdown?.rate || item.unit_price || '')
      }));
    } else {
      lines.push(savedItemToLine(item, legacyType));
    }
  });
  // Very old quotations kept separate fabrics only in metrics_summary
  const hasFabricItems = rawItems.some((it: any) => it.size_breakdown?.is_separate_fabric);
  if (!hasFabricItems && Array.isArray(fullQuote.metrics_summary?.separate_fabrics)) {
    fullQuote.metrics_summary.separate_fabrics.forEach((sf: SeparateFabricItem) => lines.push(fabricLineFromSeparate(sf)));
  }
  return lines;
};

// Steps imports
import WizardStep1 from './wizard/WizardStep1';
import WizardStep2 from './wizard/WizardStep2';
import WizardStep4 from './wizard/WizardStep4';

// Fabric scaling multipliers per size
const SIZE_FABRIC_MULTIPLIERS: Record<string, number> = {
  'XS': 0.85,
  'S': 0.90,
  'M': 1.00,
  'L': 1.10,
  'XL': 1.20,
  'XXL': 1.35,
};

interface QuotationWizardProps {
  editingQuotationId: number | null;
  isRevisionMode?: boolean;
  revisedFromQuotationId?: number | null;
  initialOrgId?: number | string | null;
  organizations: Organization[];
  productTypes: ProductType[];
  fabricsList: any[];
  allProducts: any[];
  buttonsList: any[];
  threadsList: any[];
  trimsList?: any[];
  trimCategories?: any[];
  inwardRates: any[];
  fabricMargins: any[];
  samConfigurations: any[];
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function QuotationWizard({
  editingQuotationId,
  isRevisionMode = false,
  revisedFromQuotationId = null,
  initialOrgId,
  organizations,
  productTypes,
  fabricsList,
  allProducts,
  buttonsList,
  threadsList,
  trimsList = [],
  trimCategories = [],
  inwardRates,
  fabricMargins,
  samConfigurations,
  onClose,
  onSaveSuccess,
}: QuotationWizardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNo, setQuoteNo] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [groupDesignCombinations, setGroupDesignCombinations] = useState<any[]>([]);
  const [selectedGroupDesignId, setSelectedGroupDesignId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [gstPercent, setGstPercent] = useState('5');
  const [salesType, setSalesType] = useState<string>('WHOLESALE');
  const [customerType, setCustomerType] = useState<string>('DIRECT');
  const [brandTier, setBrandTier] = useState<string>('BRANDED');
  const [orgDepartments, setOrgDepartments] = useState<any[]>([]);
  const [orgClasses, setOrgClasses] = useState<any[]>([
    { id: 'Class1', name: 'Class1', selected: false, persons: '', sets: '2' },
    { id: 'Class2', name: 'Class2', selected: false, persons: '', sets: '2' },
    { id: 'Class3', name: 'Class3', selected: false, persons: '', sets: '2' },
    { id: 'Class4', name: 'Class4', selected: false, persons: '', sets: '2' },
    { id: 'Class5', name: 'Class5', selected: false, persons: '', sets: '2' },
    { id: 'Class6', name: 'Class6', selected: false, persons: '', sets: '2' },
    { id: 'Class7', name: 'Class7', selected: false, persons: '', sets: '2' },
    { id: 'Class8', name: 'Class8', selected: false, persons: '', sets: '2' },
    { id: 'Class9', name: 'Class9', selected: false, persons: '', sets: '2' },
    { id: 'Class10', name: 'Class10', selected: false, persons: '', sets: '2' },
    { id: 'Class11', name: 'Class11', selected: false, persons: '', sets: '2' },
    { id: 'Class12', name: 'Class12', selected: false, persons: '', sets: '2' },
    { id: 'C1', name: 'C1', selected: false, persons: '', sets: '2' },
    { id: 'C2', name: 'C2', selected: false, persons: '', sets: '2' },
    { id: 'Corporate', name: 'Corporate', selected: false, persons: '', sets: '2' }
  ]);

  // Dynamic Branching & Manual Data states
  const [hasMeasurements, setHasMeasurements] = useState(false);
  // All item lines of the quotation (readymades, fabrics and accessories mixed). Starts empty.
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  // Fabric lines live in manualItems; steps 3/5 and the payload still consume them in the
  // "separate fabric" shape, and the other lines as product lines.
  const separateFabrics = toSeparateFabrics(manualItems);
  const productLines = manualItems.filter(it => getItemKind(it) !== 'FABRIC');
  const [templateLineItems, setTemplateLineItems] = useState<TemplateLineItem[]>([]);
  const [isInitializingEdit, setIsInitializingEdit] = useState(false);

  // Organization analysis data
  const [orgAnalysis, setOrgAnalysis] = useState<any>({
    total_entities: 0,
    measured_count: 0,
    pending_count: 0,
    missing_count: 0,
    size_distribution: {},
    departments: [],
    entities: [],
    template_line_items: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Expense variables
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [baseFabricCost, setBaseFabricCost] = useState('15.00');
  const [accCost, setAccCost] = useState('3.00');
  const [laborCost, setLaborCost] = useState('8.50');

  // Workforce variables
  const [baseProductionHours, setBaseProductionHours] = useState('2.0');
  const [extraCustomizationHours, setExtraCustomizationHours] = useState('0.25');
  const [tailorsCount, setTailorsCount] = useState('5');
  const [dailyShiftHours, setDailyShiftHours] = useState('8');
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [laborRatePerHour, setLaborRatePerHour] = useState('50');

  // Profit variables
  const [profitMargin, setProfitMargin] = useState('0');
  const [status, setStatus] = useState<string>('Draft');
  const [extraCharges, setExtraCharges] = useState<{ label: string; quantity: string; rate: string }[]>([
    { label: '', quantity: '1', rate: '0' }
  ]);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);
  const [parentBaseQuoteNo, setParentBaseQuoteNo] = useState<string>('');

  // If in edit or revision mode, fetch detailed quotation data and initialize state
  useEffect(() => {
    const targetId = editingQuotationId || revisedFromQuotationId;
    if (!targetId) {
      resetWizard();
      return;
    }

    const loadQuotationForEditing = async () => {
      setIsInitializingEdit(true);
      try {
        const res = await api.get(`/quotations/${targetId}`);
        const fullQuote = res.data;

        if (isRevisionMode) {
          setQuoteTitle(fullQuote.title ? `${fullQuote.title} (Revised)` : 'Uniform Quotation (Revised)');
          const baseNo = fullQuote.quotation_no || `QT-${fullQuote.id}`;
          setParentBaseQuoteNo(baseNo);
          const revMatch = baseNo.match(/^(.*)-R(\d+)$/i);
          let nextNo = '';
          if (revMatch) {
            const prefix = revMatch[1];
            const nextRevNum = parseInt(revMatch[2], 10) + 1;
            nextNo = `${prefix}-R${nextRevNum}`;
          } else {
            nextNo = `${baseNo}-R1`;
          }
          setQuoteNo(nextNo);
          setStatus('Draft');
        } else {
          setQuoteTitle(fullQuote.title);
          setQuoteNo(fullQuote.quotation_no || '');
          if (fullQuote.status) {
            setStatus(fullQuote.status);
          }
        }
        setSelectedOrgId(String(fullQuote.organization_id));

        // Fetch organization departments
        try {
          const deptRes = await api.get(`/departments?orgId=${fullQuote.organization_id}`);
          const dbDepts = deptRes.data || [];
          const savedDepts = fullQuote.metrics_summary?.departments || [];
          
          // Build a map of department ID to its first item's quantity as a fallback
          const deptQtyMap: Record<string, number> = {};
          fullQuote.items?.forEach((item: any) => {
            const deptId = item.size_breakdown?.department_id;
            if (deptId) {
              const deptIdStr = String(deptId);
              if (!deptQtyMap[deptIdStr]) {
                deptQtyMap[deptIdStr] = parseInt(item.quantity) || 0;
              }
            }
          });
          const deptIdsFromItems = new Set(Object.keys(deptQtyMap));

          const mappedDepts: any[] = [];
          dbDepts.forEach((d: any) => {
            const divString = d.division || d.section || '';
            if (divString.includes(',')) {
              const parts = divString.split(',').map((p: any) => p.trim()).filter(Boolean);
              parts.forEach((part: string) => {
                const uniqueId = `${d.id}_${part}`;
                const saved = savedDepts.find((sd: any) => String(sd.id) === uniqueId);
                const isSelected = !!saved || deptIdsFromItems.has(uniqueId);
                
                let persons = '';
                let sets = '2';
                
                if (saved) {
                  persons = String(saved.persons);
                  sets = String(saved.sets || '2');
                } else if (isSelected) {
                  const qty = deptQtyMap[uniqueId] || 2;
                  sets = '2';
                  persons = String(Math.ceil(qty / 2));
                }
                
                mappedDepts.push({
                  id: uniqueId,
                  name: d.name,
                  division: part,
                  selected: isSelected,
                  persons: persons,
                  sets: sets
                });
              });
            } else {
              const uniqueId = String(d.id);
              const saved = savedDepts.find((sd: any) => String(sd.id) === uniqueId);
              const isSelected = !!saved || deptIdsFromItems.has(uniqueId);
              
              let persons = '';
              let sets = '2';
              
              if (saved) {
                persons = String(saved.persons);
                sets = String(saved.sets || '2');
              } else if (isSelected) {
                const qty = deptQtyMap[uniqueId] || 2;
                sets = '2';
                persons = String(Math.ceil(qty / 2));
              }
              
              mappedDepts.push({
                id: uniqueId,
                name: d.name,
                division: divString,
                selected: isSelected,
                persons: persons,
                sets: sets
              });
            }
          });
          setOrgDepartments(mappedDepts);
        } catch (err) {
          console.error('Failed to load organization departments for editing', err);
        }

        setDeliveryDate(fullQuote.expected_delivery_date ? new Date(fullQuote.expected_delivery_date).toISOString().split('T')[0] : '');
        setProjectStartDate(fullQuote.metrics_summary?.project_start_date || new Date().toISOString().split('T')[0]);
        setProfitMargin(String(fullQuote.profit_margin_percent));
        setCoverLetter(fullQuote.metrics_summary?.cover_letter || '');
        setGstPercent(fullQuote.metrics_summary?.gst_percent != null ? String(fullQuote.metrics_summary.gst_percent) : '5');
        setIsTaxInclusive(Boolean(fullQuote.metrics_summary?.is_tax_inclusive));
        setStatus(fullQuote.status || 'Draft'); // not user-editable; sent back unchanged on update

        if (fullQuote.metrics_summary?.sales_type) {
          setSalesType(fullQuote.metrics_summary.sales_type === 'B2B' ? 'WHOLESALE' : fullQuote.metrics_summary.sales_type);
        }
        if (fullQuote.metrics_summary?.customer_type) {
          setCustomerType(fullQuote.metrics_summary.customer_type);
        }
        if (fullQuote.metrics_summary?.brand_tier) {
          setBrandTier(fullQuote.metrics_summary.brand_tier);
        }
        if (fullQuote.metrics_summary?.extra_charges && Array.isArray(fullQuote.metrics_summary.extra_charges)) {
          setExtraCharges(fullQuote.metrics_summary.extra_charges);
        } else {
          setExtraCharges([{ label: '', quantity: '1', rate: '0' }]);
        }

        const allLines = savedQuoteToLines(fullQuote);
        const standardQuoteItems = (fullQuote.items || []).filter((item: any) => !item.size_breakdown?.is_separate_fabric);

        const firstItem = standardQuoteItems?.[0];
        if (firstItem) {
          setBaseFabricCost(String(firstItem.fabric_cost_per_item || '15.00'));
          setAccCost(String(firstItem.accessories_cost_per_item || '3.00'));
          setLaborCost(String(firstItem.labor_cost_per_item || '8.50'));
        }

        // Legacy measurement-based quotations have a single non-manual (template) item
        const isMeasurementQuote = standardQuoteItems.length > 0 &&
          !standardQuoteItems.some((it: any) => it.size_breakdown?.is_manual === true || it.size_breakdown?.is_set === true);

        if (!isMeasurementQuote) {
          setHasMeasurements(false);
          setManualItems(allLines);
        } else {
          setHasMeasurements(true);
          // Keep any fabric lines alongside the measurement template
          setManualItems(allLines.filter(l => getItemKind(l) === 'FABRIC'));
          const calcRes = await api.get(`/quotations/calculate/${fullQuote.organization_id}`);
          setOrgAnalysis(calcRes.data);

          const rawItems = calcRes.data?.template_line_items || [];
          setTemplateLineItems(rawItems.map((tmplItem: any) => {
            const matchedItem = fullQuote.items?.find((qi: any) =>
              String(qi.product_type_id) === String(tmplItem.product_type?.id || tmplItem.product_type_id)
            );
            return {
              ...tmplItem,
              design_number_override: matchedItem?.size_breakdown?.design_number || tmplItem.design_code || '',
              price_override: matchedItem ? String(matchedItem.unit_price) : ''
            };
          }));
        }
      } catch (err: any) {
        toast.error('Failed to load quotation details for editing');
        console.error(err);
      } finally {
        setIsInitializingEdit(false);
      }
    };

    loadQuotationForEditing();
  }, [editingQuotationId, revisedFromQuotationId, isRevisionMode]);

  const [allQuotations, setAllQuotations] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllQuotesAndCombinations = async () => {
      try {
        const [quotesRes, groupDesignsRes] = await Promise.all([
          api.get('/quotations'),
          api.get('/quotations/group-designs')
        ]);
        setAllQuotations(quotesRes.data || []);
        setGroupDesignCombinations(groupDesignsRes.data || []);
      } catch (err) {
        console.error('Failed to load startup registry data in wizard', err);
      }
    };
    fetchAllQuotesAndCombinations();
  }, []);

  const handleSelectGroupDesign = (gdnId: string) => {
    setSelectedGroupDesignId(gdnId);
    if (!gdnId) return;

    const combination = groupDesignCombinations.find(c => String(c.id) === String(gdnId));
    if (!combination || !combination.products || combination.products.length === 0) {
      toast.error("No products found in this combination.");
      return;
    }

    const mapped = combination.products.map((prod: any) => {
      // Find matching fabric rate/brand if main_fabric is set
      const fabric = fabricsList.find((f: any) => String(f.id) === String(prod.main_fabric));
      
      return {
        id: Date.now() + Math.random(),
        product_type_id: String(prod.product_type_id || ''),
        product_id: String(prod.id || ''),
        fabric_id: String(prod.main_fabric || ''),
        main_fabric_meters: '1.25', // sensible default for manual creation
        main_fabric_rate: fabric ? String(fabric.cost_per_meter || '0.00') : '0.00',
        main_fabric_sam: String(prod.sam_value || ''),
        attachment_fabric1_id: String(prod.attachment_fabric1 || ''),
        attachment_fabric1_meters: prod.attachment_fabric1 ? '0.5' : '',
        attachment_fabric1_rate: '0.00',
        attachment_fabric1_sam: '',
        attachment_fabric2_id: String(prod.attachment_fabric2 || ''),
        attachment_fabric2_meters: prod.attachment_fabric2 ? '0.5' : '',
        attachment_fabric2_rate: '0.00',
        attachment_fabric2_sam: '',
        button_id: String(prod.button_id || buttonsList[0]?.id || ''),
        button_count: String(prod.button_count || '0'),
        thread_id: String(prod.thread_id || threadsList[0]?.id || ''),
        thread_count: String(prod.thread_count || ''),
        trims: [
          { id: 'btn', trim_id: String(prod.button_id || buttonsList[0]?.id || ''), category: 'Buttons', name: 'Buttons', count: String(prod.button_count || '10'), uom: 'pcs', unit_price: 0 },
          { id: 'thr', trim_id: String(prod.thread_id || threadsList[0]?.id || ''), category: 'Thread', name: 'Thread', count: String(prod.thread_count || ''), uom: 'spools', unit_price: 0 }
        ],
        sam_value: String(prod.sam_value || ''),
        design_number: String(prod.design_number || 'DNS-STANDARD'),
        item_kind: 'READYMADE' as const,
        art_number: String(prod.art_number || ''),
        quantity: '1',
        price: ''
      };
    });

    setManualItems(mapped);
    toast.success(`Loaded combination ${combination.code} with ${mapped.length} products`);
  };

  const previousOrders = allQuotations.filter(
    (q: any) => String(q.organization_id) === String(selectedOrgId) && q.id !== editingQuotationId
  );

  const handleSelectPreviousOrder = async (quote: any) => {
    const loadingToast = toast.loading('Loading previous order details...');
    try {
      const res = await api.get(`/quotations/${quote.id}`);
      const fullQuote = res.data;
      if (!fullQuote || !fullQuote.items || fullQuote.items.length === 0) {
        toast.error("This order has no products to copy.", { id: loadingToast });
        return;
      }
      // Copy the manual item lines (and fabric lines) of the previous quotation as fresh lines
      const mapped = savedQuoteToLines(fullQuote)
        .filter(l => getItemKind(l) === 'FABRIC' || l.size_breakdown?.is_manual)
        .map((l, i) => ({ ...l, id: Date.now() + i + Math.random() }));
      if (mapped.length === 0) {
        toast.error('This order has no item lines that can be copied.', { id: loadingToast });
        return;
      }

      setManualItems(mapped);
      setQuoteTitle(`${fullQuote.title} (Copy)`);
      if (fullQuote.metrics_summary?.sales_type) {
        setSalesType(fullQuote.metrics_summary.sales_type === 'B2B' ? 'WHOLESALE' : fullQuote.metrics_summary.sales_type);
      }
      if (fullQuote.metrics_summary?.customer_type) {
        setCustomerType(fullQuote.metrics_summary.customer_type);
      }
      if (fullQuote.metrics_summary?.brand_tier) {
        setBrandTier(fullQuote.metrics_summary.brand_tier);
      }
      toast.success(`Copied details from order: ${fullQuote.title}`, { id: loadingToast });
    } catch (err) {
      console.error('Failed to copy previous order items', err);
      toast.error('Failed to copy previous order details.', { id: loadingToast });
    }
  };

  const handleOrgSelection = async (orgId: string) => {
    setSelectedOrgId(orgId);
    if (!orgId) {
      setOrgDepartments([]);
      return;
    }

    setHasMeasurements(false);
    const org = organizations.find(o => String(o.id) === String(orgId));
    const orgName = org?.name || 'Customer';
    setQuoteTitle(`Uniform Contract for ${orgName}`);

    // Automatic GST Provisioning:
    // When GST details are registered for a customer, enable GST quotation
    const isB2bCustomer = Boolean(org?.is_b2b || (org?.gst_number && String(org.gst_number).trim() !== ''));
    if (isB2bCustomer) {
      setIsTaxInclusive(false); // GST quotations use Tax Exclusive pricing with distinct GST breakdown
      if (!gstPercent || gstPercent === '0') {
        setGstPercent('5'); // Default standard textile/apparel GST slab
      }
      toast.info(`Commercial / GST Customer detected (${org?.gst_number}). GST quotation active.`);
    }

    try {
      const res = await api.get(`/departments?orgId=${orgId}`);
      const mappedDepts: any[] = [];
      (res.data || []).forEach((dept: any) => {
        const divString = dept.division || dept.section || '';
        if (divString.includes(',')) {
          const parts = divString.split(',').map((p: any) => p.trim()).filter(Boolean);
          parts.forEach((part: string) => {
            mappedDepts.push({
              id: `${dept.id}_${part}`,
              name: dept.name,
              division: part,
              selected: false,
              persons: '',
              sets: '2'
            });
          });
        } else {
          mappedDepts.push({
            id: String(dept.id),
            name: dept.name,
            division: divString,
            selected: false,
            persons: '',
            sets: '2'
          });
        }
      });
      setOrgDepartments(mappedDepts);
    } catch (err) {
      console.error('Failed to fetch organization departments', err);
      toast.error('Failed to load organization departments');
    }
  };

  useEffect(() => {
    if (!editingQuotationId && initialOrgId && organizations.length > 0) {
      handleOrgSelection(String(initialOrgId));
    }
  }, [editingQuotationId, initialOrgId, organizations.length]);

  // Every item line must be complete for its kind; a quotation needs at least one line
  const isManualItemsValid = () => manualItems.length > 0 && manualItems.every(item => !getLineError(item));

  const calculateProductSAMCost = (samValueStr: string, quantityStr: string) => {
    const baseValue = parseFloat(samValueStr) || 0;
    if (baseValue === 0) return 0;
    
    const globalConfig = samConfigurations.find((c: any) => c.product_id === null && c.is_active) || samConfigurations[0];
    if (!globalConfig) return baseValue;
    
    const components = globalConfig.components || [];
    const percentageSum = components.reduce((sum: number, c: any) => sum + (parseFloat(c.value || 0) / 100 * baseValue), 0);
    const baseSAMCost = baseValue + percentageSum;
    
    const qty = parseInt(quantityStr, 10) || 1;
    const slabsW = globalConfig.wholesale_slabs || [];
    const matchingSlabW = slabsW.find((s: any) => {
      if (!s || !s.enabled) return false;
      const min = parseInt(String(s.min_qty), 10) || 0;
      const max = s.max_qty === null || s.max_qty === undefined ? null : parseInt(String(s.max_qty), 10);
      return max === null ? qty >= min : qty >= min && qty <= max;
    });
    const appliedSlabPercentW = matchingSlabW ? parseFloat(String(matchingSlabW.adjustment_percent || 0)) : 0;
    const wholesaleSAMCost = baseSAMCost * (1 + appliedSlabPercentW / 100);
    
    let finalCost = wholesaleSAMCost;
    if (salesType === 'RETAIL') {
      const slabsR = globalConfig.retail_slabs || [];
      const matchingSlabR = slabsR.find((s: any) => {
        if (!s || !s.enabled) return false;
        const min = parseInt(String(s.min_qty), 10) || 0;
        const max = s.max_qty === null || s.max_qty === undefined ? null : parseInt(String(s.max_qty), 10);
        return max === null ? qty >= min : qty >= min && qty <= max;
      });
      const appliedSlabPercentR = matchingSlabR ? parseFloat(String(matchingSlabR.adjustment_percent || 0)) : 0;
      finalCost = wholesaleSAMCost * (1 + appliedSlabPercentR / 100);
    }
    return finalCost;
  };

  const calculateFabricCost = (fabricId: string, metersStr: string, fabricSamStr: string, productTypeId: string, itemBrandTier?: string) => {
    const meters = parseFloat(metersStr) || 0;
    const fabricSam = parseFloat(fabricSamStr) || 0;
    if (!fabricId || meters === 0) return 0;
    
    const fabric = fabricsList.find((f: any) => String(f.id) === fabricId);
    if (!fabric) return 0;
    
    // Determine category from Product Type Name or Fabric Name fallback
    const pType = productTypes.find((pt: any) => String(pt.id) === String(productTypeId));
    const pTypeName = (pType?.name || '').toLowerCase();
    let category = 'SHIRTING';
    if (pTypeName.includes('suit') || pTypeName.includes('blazer') || pTypeName.includes('coat')) {
      category = 'SUITING';
    } else if (pTypeName.includes('pant') || pTypeName.includes('trouser') || pTypeName.includes('bottom') || pTypeName.includes('skirt') || pTypeName.includes('salwar')) {
      category = 'BOTTOM';
    } else if (!productTypeId || pTypeName === '') {
      const fabricName = (fabric.name || '').toLowerCase();
      if (fabricName.includes('suiting')) {
        category = 'SUITING';
      } else if (fabricName.includes('bottom') || fabricName.includes('pant') || fabricName.includes('trouser')) {
        category = 'BOTTOM';
      }
    }
    
    const widthStr = String(fabric.width || '');
    const matchedTransport = inwardRates.find(
      (r: any) => r.item?.toUpperCase() === category && String(r.width) === widthStr
    );
    const inwardRate = matchedTransport ? parseFloat(matchedTransport.rate) : 0;
    const transportCost = inwardRate; // rate per meter
    
    const marginRow = fabricMargins.find(
      (m: any) => m.sales_type?.toUpperCase() === salesType.toUpperCase() && 
                   m.customer_type?.toUpperCase() === customerType.toUpperCase()
    );
    
    let marginPct = 0;
    if (marginRow) {
      // Priority: item-level override -> quote-level brandTier -> fabric.brand_type -> default 'NON_BRANDED'
      const effectiveBrand = (itemBrandTier || brandTier || fabric.brand_type || 'NON_BRANDED').toLowerCase();
      if (effectiveBrand.includes('semi')) {
        marginPct = parseFloat(marginRow.semi_branded) || 0;
      } else if (effectiveBrand.includes('brand') && !effectiveBrand.includes('non')) {
        marginPct = parseFloat(marginRow.branded) || 0;
      } else {
        marginPct = parseFloat(marginRow.non_branded) || 0;
      }
    }
    
    // Formula: Cost = ((Fabric SAM * 24) + Inward Transport) * (1 + Margin / 100) * 1.05 * meters
    return ((fabricSam * 24) + transportCost) * (1 + marginPct / 100) * 1.05 * meters;
  };

  const computeItemUnitCost = (item: ManualItem) => {
    const productSAMCost = (
      (item.final_sam_price !== undefined && item.final_sam_price !== '' && !isNaN(parseFloat(item.final_sam_price)))
        ? parseFloat(item.final_sam_price)
        : calculateProductSAMCost(item.sam_value, item.quantity)
    );
    const mainFabricCost = (item.main_fabric_cost !== undefined && item.main_fabric_cost !== '' && !isNaN(parseFloat(item.main_fabric_cost)))
      ? parseFloat(item.main_fabric_cost)
      : calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id, item.brand_tier);
    const att1Cost = (item.attachment_fabric1_cost !== undefined && item.attachment_fabric1_cost !== '' && !isNaN(parseFloat(item.attachment_fabric1_cost)))
      ? parseFloat(item.attachment_fabric1_cost)
      : calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id, item.brand_tier);
    const att2Cost = (item.attachment_fabric2_cost !== undefined && item.attachment_fabric2_cost !== '' && !isNaN(parseFloat(item.attachment_fabric2_cost)))
      ? parseFloat(item.attachment_fabric2_cost)
      : calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id, item.brand_tier);
    return productSAMCost + mainFabricCost + att1Cost + att2Cost;
  };

  // Run lead time & delivery calculations dynamically
  const getCalculatedTimeMetrics = () => {
    const tailors = parseInt(tailorsCount) || 1;
    const dailyHrs = parseFloat(dailyShiftHours) || 8;

    let totalHours = 0;

    if (hasMeasurements) {
      const totalEntities = orgAnalysis.total_entities || 0;
      const baseHrs = parseFloat(baseProductionHours) || 0;
      const extraHrs = parseFloat(extraCustomizationHours) || 0;

      // Count entities that have XL or XXL sizes
      let customSizeCount = 0;
      Object.keys(orgAnalysis.size_distribution).forEach(sz => {
        if (['XL', 'XXL', 'XXXL'].includes(sz.toUpperCase())) {
          customSizeCount += orgAnalysis.size_distribution[sz] || 0;
        }
      });

      // Total production hours required
      totalHours = (totalEntities * baseHrs) + (customSizeCount * extraHrs);
    }

    // Readymade lines are produced in-house: their SAM drives production hours
    manualItems.forEach(item => {
      if (getItemKind(item) !== 'READYMADE') return;
      totalHours += ((parseFloat(item.sam_value) || 0) * parseQty(item)) / 60;
    });

    // Total production working days
    const totalWorkingDays = Math.ceil(totalHours / (tailors * dailyHrs)) || 0;

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      workingDays: totalWorkingDays
    };
  };

  // Automatically adjust delivery date when working days change
  useEffect(() => {
    const { workingDays } = getCalculatedTimeMetrics();
    if (!workingDays || !projectStartDate) return;

    const start = new Date(projectStartDate);
    let daysAdded = 0;
    let current = new Date(start);

    // Skip weekends
    while (daysAdded < workingDays) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        daysAdded++;
      }
    }

    setDeliveryDate(current.toISOString().split('T')[0]);
  }, [baseProductionHours, extraCustomizationHours, tailorsCount, dailyShiftHours, projectStartDate, orgAnalysis, manualItems, hasMeasurements]);

  // Run dynamic expense calculations per item line
  const getItemFabricCost = (item: ManualItem) => {
    const pick = (override: string | undefined, fabricId: string, meters: string, sam: string) =>
      (override !== undefined && override !== '' && !isNaN(parseFloat(override)))
        ? parseFloat(override)
        : calculateFabricCost(fabricId, meters, sam, item.product_type_id, item.brand_tier);
    return pick(item.main_fabric_cost, item.fabric_id, item.main_fabric_meters, item.main_fabric_sam) +
      pick(item.attachment_fabric1_cost, item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam) +
      pick(item.attachment_fabric2_cost, item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam);
  };

  const getItemSamCost = (item: ManualItem) =>
    (item.final_sam_price !== undefined && item.final_sam_price !== '' && !isNaN(parseFloat(item.final_sam_price)))
      ? parseFloat(item.final_sam_price)
      : calculateProductSAMCost(item.sam_value, item.quantity);

  const getCalculatedExpenses = () => {
    let totalFabricExpense = 0;
    let totalAccExpense = 0;
    let totalLaborExpense = 0;
    let measurementTemplate = 0;

    if (hasMeasurements) {
      // Legacy measurement quotations: sum details based on sizing distribution
      const baseFabric = parseFloat(baseFabricCost) || 0;
      const baseAcc = parseFloat(accCost) || 0;
      const baseLabor = parseFloat(laborCost) || 0;
      orgAnalysis.entities.forEach((entity: any) => {
        const size = (entity.suggested_size || 'M').toUpperCase();
        const mult = SIZE_FABRIC_MULTIPLIERS[size] !== undefined ? SIZE_FABRIC_MULTIPLIERS[size] : 1.00;
        totalFabricExpense += (baseFabric * mult);
        totalAccExpense += baseAcc;
        totalLaborExpense += baseLabor;
      });
      measurementTemplate = totalFabricExpense + totalAccExpense + totalLaborExpense;
    }

    manualItems.forEach(item => {
      const kind = getItemKind(item);
      const qty = parseQty(item);
      if (kind === 'FABRIC') {
        // Marked-up fabric cost for the meters sold
        totalFabricExpense += calculateFabricCost(item.fabric_id, item.quantity, '6.777', '', item.brand_tier);
        return;
      } else if (kind === 'ACCESSORY') {
        // Accessories / trade readymades are bought in: their rate is the expense
        totalAccExpense += (parseFloat(item.price) || 0) * qty;
      } else if (kind === 'CUSTOM') {
        totalAccExpense += 0;
      } else {
        totalFabricExpense += getItemFabricCost(item) * qty;
        totalLaborExpense += getItemSamCost(item) * qty;
      }
    });

    const totalExpenses = totalFabricExpense + totalAccExpense + totalLaborExpense;
    return {
      fabric: Math.round(totalFabricExpense * 100) / 100,
      accessories: Math.round(totalAccExpense * 100) / 100,
      labor: Math.round(totalLaborExpense * 100) / 100,
      total: Math.round(totalExpenses * 100) / 100,
      measurementTemplate: Math.round(measurementTemplate * 100) / 100
    };
  };

  // Compile overall quotation pricing parameters
  const getCalculatedQuoteTotals = () => {
    const expenses = getCalculatedExpenses();
    const marginPercent = parseFloat(profitMargin) || 0;

    let preTaxSubtotal = 0;
    let qty = 0;

    // Legacy measurement-based quotations price the sizing template at cost + margin
    if (hasMeasurements) {
      preTaxSubtotal = expenses.measurementTemplate * (1 + marginPercent / 100);
      qty = orgAnalysis.total_entities || 0;
    }

    // Item lines are priced at their own rate: Amount = Qty x Rate
    manualItems.forEach(item => {
      const q = parseQty(item);
      preTaxSubtotal += q * (parseFloat(item.price) || 0);
      if (getItemKind(item) !== 'FABRIC') qty += q; // fabric meters are not garment units
    });
    if (qty === 0) qty = 1;

    // Add extra charges to the subtotal
    let totalExtraCharges = 0;
    extraCharges.forEach(ec => {
      const q = parseFloat(ec.quantity) || 0;
      const r = parseFloat(ec.rate) || 0;
      totalExtraCharges += q * r;
    });
    preTaxSubtotal += totalExtraCharges;

    const gstRate = parseFloat(gstPercent) || 0;
    let subtotal = 0;
    let gstValue = 0;
    let finalValue = 0;

    if (isTaxInclusive) {
      // Contract Gross Price (MRP) already includes tax: calculate taxable base backwards
      finalValue = Math.round(preTaxSubtotal * 100) / 100;
      subtotal = Math.round((finalValue / (1 + gstRate / 100)) * 100) / 100;
      gstValue = Math.round((finalValue - subtotal) * 100) / 100;
    } else {
      // Standard B2B pricing: add GST forwards on top of taxable subtotal
      subtotal = Math.round(preTaxSubtotal * 100) / 100;
      gstValue = Math.round(subtotal * (gstRate / 100) * 100) / 100;
      finalValue = Math.round((subtotal + gstValue) * 100) / 100;
    }

    const profit = subtotal - expenses.total;
    const avgSellingPrice = qty > 0 ? (isTaxInclusive ? finalValue : subtotal) / qty : 0;
    const halfGst = Math.round((gstValue / 2) * 100) / 100;

    return {
      expenses: expenses.total,
      subtotal,
      gstValue,
      finalValue,
      profit: Math.round(profit * 100) / 100,
      avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
      isTaxInclusive,
      cgst: halfGst,
      sgst: Math.round((gstValue - halfGst) * 100) / 100
    };
  };

  // Commit and save the quotation Wizard
  const handleSaveQuotation = async () => {
    const totals = getCalculatedQuoteTotals();
    const expenses = getCalculatedExpenses();
    const timeMetrics = getCalculatedTimeMetrics();

    const payloadItems: any[] = [];
    let totalQty = 0;

    if (hasMeasurements) {
      // Legacy measurement-based quotation: one sizing-template item
      const selectedProduct = productTypes.find(p => String(p.id) === String(selectedProductTypeId));
      const templateQty = orgAnalysis.total_entities || 0;
      const hasExtraLines = manualItems.length > 0;
      const templateTotal = Math.round(expenses.measurementTemplate * (1 + (parseFloat(profitMargin) || 0) / 100) * 100) / 100;
      totalQty += templateQty;
      payloadItems.push({
        product_type_id: parseInt(selectedProductTypeId),
        product_type_name: selectedProduct?.name || 'Uniform Item',
        product_name: selectedProduct?.name || 'Uniform Item',
        quantity: templateQty,
        // Without extra lines keep the previous behaviour; with lines, price the template on its own
        unit_price: hasExtraLines ? (templateQty > 0 ? Math.round((templateTotal / templateQty) * 100) / 100 : 0) : totals.avgSellingPrice,
        total_price: hasExtraLines ? templateTotal : totals.finalValue,
        size_breakdown: orgAnalysis.size_distribution,
        fabric_cost_per_item: hasExtraLines ? (parseFloat(baseFabricCost) || 0) : (templateQty > 0 ? (expenses.fabric / templateQty) : 0),
        accessories_cost_per_item: parseFloat(accCost) || 0,
        labor_cost_per_item: parseFloat(laborCost) || 0
      });
    }

    // Item lines, in the order shown in the item table. Each kind keeps the item shape
    // that quotation details, job cards and the PDF already understand.
    manualItems.forEach(item => {
      const kind = getItemKind(item);
      const qty = parseQty(item);
      const rate = parseFloat(item.price) || 0;
      const dept = item.department_id
        ? { department_id: item.department_id, department_name: item.department_name || null }
        : {};

      if (kind === 'FABRIC') {
        const fabric = fabricsList.find((f: any) => String(f.id) === String(item.fabric_id));
        const fabricName = formatFabricDisplayName(fabric) || 'Custom Fabric';
        payloadItems.push({
          product_type_id: null,
          product_type_name: `Fabric: ${fabricName}`,
          quantity: qty,
          unit_price: rate,
          total_price: qty * rate,
          is_manual: true,
          size_breakdown: {
            is_separate_fabric: true,
            item_kind: 'FABRIC',
            fabric_id: item.fabric_id,
            brand_tier: item.brand_tier || brandTier,
            meters: qty,
            rate: rate,
            ...dept
          },
          fabric_cost_per_item: calculateFabricCost(item.fabric_id, '1', '6.777', '', item.brand_tier),
          accessories_cost_per_item: 0,
          labor_cost_per_item: 0
        });
        return;
      }

      if (kind === 'CUSTOM') {
        const customName = (item.name || item.product_name || 'Custom Item').trim();
        totalQty += qty;
        payloadItems.push({
          product_type_id: null,
          product_type_name: customName,
          product_name: customName,
          name: customName,
          quantity: qty,
          unit_price: rate,
          total_price: qty * rate,
          is_manual: true,
          manual_item_name: customName,
          size_breakdown: {
            is_manual: true,
            is_custom: true,
            item_kind: 'CUSTOM',
            product_name: customName,
            name: customName,
            quantity: qty,
            rate: rate,
            computed_unit_cost: rate,
            ...dept
          },
          fabric_cost_per_item: 0,
          accessories_cost_per_item: 0,
          labor_cost_per_item: 0
        });
        return;
      }

      totalQty += qty;
      const productType = productTypes.find(p => String(p.id) === String(item.product_type_id));
      const actualProduct = allProducts.find(p => String(p.id) === String(item.product_id));
      const resolvedProductName = formatProductDisplayName(actualProduct || item)
        || item.product_name || item.name || productType?.name
        || (kind === 'ACCESSORY' ? 'Accessory' : 'Uniform Item');
      const productId = item.product_id ? parseInt(item.product_id, 10) : (actualProduct?.id || null);
      const artNumber = item.art_number || actualProduct?.art_number || null;
      const materials = item.materials || actualProduct?.materials || null;

      if (kind === 'ACCESSORY') {
        payloadItems.push({
          product_type_id: parseInt(item.product_type_id) || null,
          product_type_name: productType?.name || 'Accessory',
          product_name: resolvedProductName,
          name: resolvedProductName,
          quantity: qty,
          unit_price: rate,
          total_price: qty * rate,
          is_manual: true,
          product_id: productId,
          art_number: artNumber,
          design_number: item.design_number || null,
          materials,
          size_breakdown: {
            is_manual: true,
            item_kind: 'ACCESSORY',
            is_accessory: true,
            product_id: productId,
            product_name: resolvedProductName,
            design_number: item.design_number || null,
            art_number: artNumber,
            computed_unit_cost: rate,
            selected_size: item.size_breakdown?.selected_size || null,
            gender: item.gender || null,
            materials,
            ...dept
          },
          fabric_cost_per_item: 0,
          accessories_cost_per_item: rate,
          labor_cost_per_item: 0
        });
        return;
      }

      // READYMADE (in-house): the line rate is what the customer is quoted
      const unitCost = item.price !== '' && !isNaN(parseFloat(item.price)) ? rate : computeItemUnitCost(item);
      payloadItems.push({
        product_type_id: parseInt(item.product_type_id),
        product_type_name: productType?.name || 'Uniform Item',
        product_name: resolvedProductName,
        name: resolvedProductName,
        quantity: qty,
        unit_price: unitCost,
        total_price: qty * unitCost,
        is_manual: true,
        product_id: productId,
        art_number: artNumber,
        fabric_id: item.fabric_id || null,
        attachment_fabric1_id: item.attachment_fabric1_id || null,
        attachment_fabric2_id: item.attachment_fabric2_id || null,
        button_id: item.button_id || null,
        thread_id: item.thread_id || null,
        trims: item.trims || [],
        design_number: item.design_number || null,
        materials,
        size_breakdown: {
          is_manual: true,
          item_kind: 'READYMADE',
          product_id: productId,
          product_name: resolvedProductName,
          brand_tier: item.brand_tier || brandTier,
          fabric_id: item.fabric_id || null,
          main_fabric_meters: parseFloat(item.main_fabric_meters) || null,
          main_fabric_rate: parseFloat(item.main_fabric_rate) || null,
          main_fabric_sam: parseFloat(item.main_fabric_sam) || null,
          attachment_fabric1_id: item.attachment_fabric1_id || null,
          attachment_fabric1_meters: parseFloat(item.attachment_fabric1_meters) || null,
          attachment_fabric1_rate: parseFloat(item.attachment_fabric1_rate) || null,
          attachment_fabric1_sam: parseFloat(item.attachment_fabric1_sam) || null,
          attachment_fabric2_id: item.attachment_fabric2_id || null,
          attachment_fabric2_meters: parseFloat(item.attachment_fabric2_meters) || null,
          attachment_fabric2_rate: parseFloat(item.attachment_fabric2_rate) || null,
          attachment_fabric2_sam: parseFloat(item.attachment_fabric2_sam) || null,
          button_id: item.button_id || null,
          button_count: parseFloat(item.button_count) || null,
          thread_id: item.thread_id || null,
          thread_count: parseFloat(item.thread_count) || null,
          trims: item.trims || [],
          sam_value: item.sam_value ? parseFloat(item.sam_value) : null,
          design_number: item.design_number || null,
          art_number: artNumber,
          computed_unit_cost: unitCost,
          selected_size: item.size_breakdown?.selected_size || null,
          class_name: item.size_breakdown?.class_name || null,
          gender: item.gender || null,
          materials,
          ...dept
        },
        fabric_cost_per_item: getItemFabricCost(item),
        accessories_cost_per_item: 0,
        labor_cost_per_item: getItemSamCost(item)
      });
    });

    // Departments referenced by the item lines (department is now chosen per line)
    const lineDepartments = Array.from(
      new Map(
        manualItems
          .filter(it => it.department_id)
          .map(it => {
            const d = (orgDepartments || []).find((od: any) => String(od.id) === String(it.department_id));
            return [String(it.department_id), { id: it.department_id, name: d?.name || it.department_name || '', division: d?.division || '' }] as const;
          })
      ).values()
    );
      const selectedOrg = organizations.find(o => String(o.id) === String(selectedOrgId));
      const isB2bOrder = salesType === 'B2B' || Boolean(selectedOrg?.is_b2b || selectedOrg?.gst_number);

      const payload = {
        quotation_no: quoteNo.trim() || undefined,
        title: quoteTitle.trim(),
        organization_id: parseInt(selectedOrgId),
        estimated_expenses: totals.expenses,
        total_estimated_time: `${timeMetrics.totalHours} Hours`,
        production_days_estimate: timeMetrics.workingDays,
        expected_delivery_date: deliveryDate,
        profit_margin_percent: parseFloat(profitMargin),
        final_quote_value: totals.finalValue,
        metrics_summary: {
          total_entities: hasMeasurements ? orgAnalysis.total_entities : totalQty,
          measured: hasMeasurements ? orgAnalysis.measured_count : 0,
          pending: hasMeasurements ? orgAnalysis.pending_count : 0,
          missing: hasMeasurements ? orgAnalysis.missing_count : 0,
          sizes: hasMeasurements ? orgAnalysis.size_distribution : {},
          cover_letter: coverLetter,
          gst_percent: parseFloat(gstPercent) || 0,
          is_tax_inclusive: isTaxInclusive,
          tax_amount: totals.gstValue,
          pre_tax_subtotal: totals.subtotal,
          tax_breakdown: {
            rate: parseFloat(gstPercent) || 0,
            cgst: totals.cgst,
            sgst: totals.sgst,
            total_tax: totals.gstValue
          },
          sales_type: salesType,
          customer_type: customerType,
          brand_tier: brandTier,
          // Item kinds are stored per line; the quotation itself can mix all kinds
          quotation_type: 'CUSTOM',
          item_kinds: Array.from(new Set(manualItems.map(it => getItemKind(it)))),
          is_b2b: isB2bOrder,
          customer_gstin: selectedOrg?.gst_number || null,
          customer_pan: selectedOrg?.pan_number || null,
          customer_legal_name: selectedOrg?.legal_name || selectedOrg?.name || null,
          delivery_address: selectedOrg?.delivery_address || selectedOrg?.address || null,
          delivery_city: selectedOrg?.delivery_city || selectedOrg?.city || null,
          delivery_state: selectedOrg?.delivery_state || selectedOrg?.state || null,
          delivery_pincode: selectedOrg?.delivery_pincode || selectedOrg?.pincode || null,
          delivery_country: selectedOrg?.delivery_country || selectedOrg?.country || 'India',
          extra_charges: extraCharges,
          separate_fabrics: separateFabrics,
          project_start_date: projectStartDate,
          departments: lineDepartments,
          classes: []
        },
        items: payloadItems
      };

    const loadingToast = toast.loading(
      isRevisionMode 
        ? 'Compiling Revised Quotation...' 
        : editingQuotationId 
        ? 'Updating Formal Quotation...' 
        : 'Compiling and saving Formal Quotation...'
    );
    try {
      let response;
      if (isRevisionMode && revisedFromQuotationId) {
        payload.metrics_summary = {
          ...(payload.metrics_summary as any),
          revised_from_id: revisedFromQuotationId,
          revised_from_quotation_no: parentBaseQuoteNo || quoteNo,
          is_revision: true
        } as any;
        response = await api.post('/quotations', {
          ...payload,
          quotation_no: quoteNo,
          status: 'Draft'
        });
        toast.success(`Revised Quotation #${quoteNo} compiled and saved successfully!`, { id: loadingToast });
      } else if (editingQuotationId) {
        response = await api.put(`/quotations/${editingQuotationId}`, {
          ...payload,
          status: status || 'Draft'
        });
        toast.success('Formal Quotation updated successfully!', { id: loadingToast });
      } else {
        response = await api.post('/quotations', {
          ...payload,
          status: 'Draft'
        });
        toast.success('Formal Quotation compiled and saved to registry as Draft!', { id: loadingToast });
      }

      if (response && response.data && response.data.designNumberAlreadyExists) {
        toast('Design Number already exists for this combination.', {
          icon: 'ℹ️',
          duration: 5000,
        });
      }

      resetWizard();
      onSaveSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save quotation', { id: loadingToast });
    }
  };

  const generateAutoCoverLetter = () => {
    const orgName = organizations.find(o => String(o.id) === String(selectedOrgId))?.name || 'Customer';
    const contractTitle = quoteTitle.trim() || 'Uniform Contract Proposal';
    const template = `Dear Team at ${orgName},

Thank you for giving Forma Apparels the opportunity to submit our proposal for the "${contractTitle}".

We are pleased to present our comprehensive uniform solutions tailored specifically for your organization. Based on our sizing audit and detailed requirements analysis, we have compiled an optimized production schedule and cost estimate to ensure maximum comfort, perfect fit compliance, and durability.

Please find the detailed sizing breakdown and cost compilation in the attached table. We look forward to partnering with your organization to deliver top-tier corporate garments that embody your brand's identity.

Should you have any questions or require custom modifications to this proposal, please do not hesitate to reach out to our team.

Sincerely,

Operations & Accounts Team
Forma Apparels Co.`;
    setCoverLetter(template);
  };

  const resetWizard = () => {
    setQuoteTitle('');
    setQuoteNo('');
    setSelectedOrgId('');
    setOrgDepartments([]);
    setOrgClasses([
      { id: 'Class1', name: 'Class1', selected: false, persons: '', sets: '2' },
      { id: 'Class2', name: 'Class2', selected: false, persons: '', sets: '2' },
      { id: 'Class3', name: 'Class3', selected: false, persons: '', sets: '2' },
      { id: 'Class4', name: 'Class4', selected: false, persons: '', sets: '2' },
      { id: 'Class5', name: 'Class5', selected: false, persons: '', sets: '2' },
      { id: 'Class6', name: 'Class6', selected: false, persons: '', sets: '2' },
      { id: 'Class7', name: 'Class7', selected: false, persons: '', sets: '2' },
      { id: 'Class8', name: 'Class8', selected: false, persons: '', sets: '2' },
      { id: 'Class9', name: 'Class9', selected: false, persons: '', sets: '2' },
      { id: 'Class10', name: 'Class10', selected: false, persons: '', sets: '2' },
      { id: 'Class11', name: 'Class11', selected: false, persons: '', sets: '2' },
      { id: 'Class12', name: 'Class12', selected: false, persons: '', sets: '2' },
      { id: 'C1', name: 'C1', selected: false, persons: '', sets: '2' },
      { id: 'C2', name: 'C2', selected: false, persons: '', sets: '2' },
      { id: 'Corporate', name: 'Corporate', selected: false, persons: '', sets: '2' }
    ]);
    setSelectedProductTypeId('');
    setBaseFabricCost('15.00');
    setAccCost('3.00');
    setLaborCost('8.50');
    setBaseProductionHours('2.0');
    setExtraCustomizationHours('0.25');
    setTailorsCount('5');
    setDailyShiftHours('8');
    setProfitMargin('0');
    setStatus('Pending');
    setExtraCharges([
      { label: '', quantity: '1', rate: '0' }
    ]);
    setSalesType('WHOLESALE');
    setCustomerType('DIRECT');
    setBrandTier('BRANDED');
    setTemplateLineItems([]);
    setCoverLetter('');
    setGstPercent('5');
    setIsTaxInclusive(false);
    setOrgAnalysis({
      total_entities: 0,
      measured_count: 0,
      pending_count: 0,
      missing_count: 0,
      size_distribution: {},
      departments: [],
      entities: [],
      template_line_items: []
    });
    setManualItems([]);
    setStatus('Pending Branch Approval');
  };

  if (isInitializingEdit) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-[#C82A2B] border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-4 font-black text-sm text-zinc-500">Initializing Quotation Editor...</span>
      </div>
    );
  }

  // Everything Save needs, listed in the summary panel when missing
  const missing: string[] = [];
  if (!selectedOrgId) missing.push('Select a customer');
  if (!quoteTitle.trim()) missing.push('Enter a quotation title');
  if (!hasMeasurements && manualItems.length === 0) missing.push('Add at least one item');
  else if (!hasMeasurements && !isManualItemsValid()) missing.push('Complete the highlighted item lines');
  const canSave = missing.length === 0 && !isAnalyzing && !isSaving;

  const onSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try { await handleSaveQuotation(); } finally { setIsSaving(false); }
  };

  const totals = getCalculatedQuoteTotals();
  const selectedOrgName = organizations.find(o => String(o.id) === String(selectedOrgId))?.name;
  const garmentQty = productLines.reduce((sum, it) => sum + parseQty(it), 0) + (hasMeasurements ? (orgAnalysis.total_entities || 0) : 0);
  const money = (v: number) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const sections = [
    { id: 'qw-customer', label: 'Customer', done: Boolean(selectedOrgId && quoteTitle.trim()) },
    { id: 'qw-items', label: 'Items', done: hasMeasurements || isManualItemsValid() },
    { id: 'qw-charges', label: 'Timeline & Charges', done: Boolean(deliveryDate) },
  ];
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const locked = (
    <p className="py-10 text-center text-xs font-bold text-zinc-400">Select a customer above to continue.</p>
  );

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        {/* SECTION LINKS */}
        <div className="bg-[#FFF1F1] px-4 py-3 rounded-2xl border border-[#C82A2B]/15 flex flex-wrap gap-2">
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-600 hover:bg-white hover:text-[#C82A2B] transition-colors cursor-pointer"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] border-2 ${s.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-zinc-200 text-zinc-500'}`}>
                {s.done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {s.label}
            </button>
          ))}
        </div>

        {/* 1. CUSTOMER */}
        <section id="qw-customer" className="scroll-mt-6">
          <Card className="p-6 md:p-8 border border-zinc-100 rounded-[2rem] shadow-xl shadow-zinc-100 bg-white">
            <WizardStep1
              organizations={organizations}
              selectedOrgId={selectedOrgId}
              onOrgSelection={handleOrgSelection}
              quoteTitle={quoteTitle}
              setQuoteTitle={setQuoteTitle}
              quoteNo={quoteNo}
              setQuoteNo={setQuoteNo}
              coverLetter={coverLetter}
              setCoverLetter={setCoverLetter}
              salesType={salesType}
              setSalesType={setSalesType}
              customerType={customerType}
              setCustomerType={setCustomerType}
              brandTier={brandTier}
              setBrandTier={setBrandTier}
              isAnalyzing={isAnalyzing}
              generateAutoCoverLetter={generateAutoCoverLetter}
              previousOrders={previousOrders}
              onSelectPreviousOrder={handleSelectPreviousOrder}
              groupDesignCombinations={groupDesignCombinations}
              selectedGroupDesignId={selectedGroupDesignId}
              onSelectGroupDesign={handleSelectGroupDesign}
            />
          </Card>
        </section>

        {/* 2. ITEMS (needs the customer's departments) */}
        <section id="qw-items" className="scroll-mt-6">
          <Card className="p-6 md:p-8 border border-zinc-100 rounded-[2rem] shadow-xl shadow-zinc-100 bg-white">
            {!selectedOrgId ? locked : (
              <WizardStep2
                hasMeasurements={hasMeasurements}
                orgAnalysis={orgAnalysis}
                templateLineItems={templateLineItems}
                setTemplateLineItems={setTemplateLineItems}
                manualItems={manualItems}
                setManualItems={setManualItems}
                orgDepartments={orgDepartments}
                setOrgDepartments={setOrgDepartments}
                productTypes={productTypes}
                allProducts={allProducts}
                fabricsList={fabricsList}
                buttonsList={buttonsList}
                threadsList={threadsList}
                trimsList={trimsList}
                trimCategories={trimCategories}
                inwardRates={inwardRates}
                fabricMargins={fabricMargins}
                samConfigurations={samConfigurations}
                salesType={salesType}
                customerType={customerType}
                brandTier={brandTier}
                calculateProductSAMCost={calculateProductSAMCost}
                calculateFabricCost={calculateFabricCost}
                laborRatePerHour={laborRatePerHour}
                isAnalyzing={isAnalyzing}
                isManualItemsValid={isManualItemsValid}
                organizations={organizations}
                selectedOrgId={selectedOrgId}
              />
            )}
          </Card>
        </section>

        {/* 3. TIMELINE, CHARGES & TAX */}
        <section id="qw-charges" className="scroll-mt-6">
          <Card className="p-6 md:p-8 border border-zinc-100 rounded-[2rem] shadow-xl shadow-zinc-100 bg-white">
            {!selectedOrgId ? locked : (
              <WizardStep4
                hasMeasurements={hasMeasurements}
                baseProductionHours={baseProductionHours}
                setBaseProductionHours={setBaseProductionHours}
                extraCustomizationHours={extraCustomizationHours}
                setExtraCustomizationHours={setExtraCustomizationHours}
                projectStartDate={projectStartDate}
                setProjectStartDate={setProjectStartDate}
                deliveryDate={deliveryDate}
                setDeliveryDate={setDeliveryDate}
                profitMargin={profitMargin}
                setProfitMargin={setProfitMargin}
                orgAnalysis={orgAnalysis}
                timeMetrics={getCalculatedTimeMetrics()}
                quoteTotals={totals}
                gstPercent={gstPercent}
                setGstPercent={setGstPercent}
                isTaxInclusive={isTaxInclusive}
                setIsTaxInclusive={setIsTaxInclusive}
                extraCharges={extraCharges}
                setExtraCharges={setExtraCharges}
                fabricsList={fabricsList}
              />
            )}
          </Card>
        </section>
      </div>

      {/* LIVE SUMMARY + SAVE (replaces the old Review step) */}
      <aside className="lg:sticky lg:top-6">
        <Card className="p-5 border border-zinc-100 rounded-[2rem] shadow-xl shadow-zinc-100 bg-white space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {isRevisionMode ? 'Revised Quotation' : editingQuotationId ? 'Editing Quotation' : 'New Quotation'}
            </p>
            <p className="text-sm font-black text-zinc-900 truncate">{quoteTitle.trim() || 'Untitled quotation'}</p>
            <p className="text-xs font-semibold text-zinc-500 truncate">
              {selectedOrgName || 'No customer selected'}{quoteNo ? ` • ${quoteNo}` : ''}
            </p>
          </div>

          <div className="space-y-1.5 text-xs border-t border-zinc-100 pt-3">
            <div className="flex justify-between"><span className="text-zinc-500 font-semibold">Item lines</span><span className="font-bold text-zinc-900">{manualItems.length}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 font-semibold">Garment qty</span><span className="font-bold text-zinc-900">{garmentQty}</span></div>
            {deliveryDate && (
              <div className="flex justify-between"><span className="text-zinc-500 font-semibold">Delivery</span><span className="font-bold text-zinc-900">{deliveryDate}</span></div>
            )}
          </div>

          <div className="space-y-1.5 text-xs border-t border-zinc-100 pt-3">
            <div className="flex justify-between"><span className="text-zinc-500 font-semibold">Taxable subtotal</span><span className="font-mono font-bold text-zinc-900">{money(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500 font-semibold">GST {gstPercent || 0}%{isTaxInclusive ? ' (incl.)' : ''}</span><span className="font-mono font-bold text-zinc-900">{money(totals.gstValue)}</span></div>
            <div className="flex justify-between items-baseline pt-1.5 border-t border-dashed border-zinc-200">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">Grand total</span>
              <span className="font-mono font-black text-base text-[#C82A2B]">{money(totals.finalValue)}</span>
            </div>
          </div>

          {hasMeasurements && orgAnalysis.missing_count > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex gap-2">
              <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
              <span>{orgAnalysis.missing_count} missing measurements will be priced at standard size (M).</span>
            </div>
          )}

          {missing.length > 0 && (
            <ul className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 font-semibold space-y-1">
              {missing.map(m => <li key={m}>• {m}</li>)}
            </ul>
          )}

          <Button
            disabled={!canSave}
            onClick={onSave}
            className="w-full h-12 bg-[#C82A2B] hover:bg-[#A81D1E] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[#C82A2B]/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : editingQuotationId && !isRevisionMode ? 'Update Quotation' : 'Save Quotation'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-700 cursor-pointer"
          >
            Cancel
          </button>
        </Card>
      </aside>
    </div>
  );
}
