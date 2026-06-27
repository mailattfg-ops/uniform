'use client';

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Organization, ProductType, Quotation, SeparateFabricItem } from '../page';

// Steps imports
import WizardStep1 from './wizard/WizardStep1';
import WizardStep2 from './wizard/WizardStep2';
import WizardStep3 from './wizard/WizardStep3';
import WizardStep4 from './wizard/WizardStep4';
import WizardStep5 from './wizard/WizardStep5';

// Fabric scaling multipliers per size
const SIZE_FABRIC_MULTIPLIERS: Record<string, number> = {
  'XS': 0.85,
  'S': 0.90,
  'M': 1.00,
  'L': 1.10,
  'XL': 1.20,
  'XXL': 1.35,
};

interface ManualItem {
  id: number;
  product_type_id: string;
  product_id?: string;
  fabric_id: string;
  main_fabric_meters: string;
  main_fabric_rate: string;
  main_fabric_sam: string;
  attachment_fabric1_id: string;
  attachment_fabric1_meters: string;
  attachment_fabric1_rate: string;
  attachment_fabric1_sam: string;
  attachment_fabric2_id: string;
  attachment_fabric2_meters: string;
  attachment_fabric2_rate: string;
  attachment_fabric2_sam: string;
  button_id: string;
  button_count: string;
  thread_id: string;
  thread_count: string;
  sam_value: string;
  design_number: string;
  quantity: string;
  price: string;
  size_breakdown?: any;
}

interface TemplateLineItem {
  product_id: number;
  art_number: string;
  product_name: string;
  gender: string;
  sam_value: number | null;
  materials: string | null;
  product_type: string | null;
  design_id: string | null;
  design_code: string | null;
  design_number_override: string; // editable
  price_override: string;          // optional price per unit
  template_quantity: number | null;
}

interface QuotationWizardProps {
  editingQuotationId: number | null;
  organizations: Organization[];
  productTypes: ProductType[];
  fabricsList: any[];
  allProducts: any[];
  buttonsList: any[];
  threadsList: any[];
  inwardRates: any[];
  fabricMargins: any[];
  samConfigurations: any[];
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function QuotationWizard({
  editingQuotationId,
  organizations,
  productTypes,
  fabricsList,
  allProducts,
  buttonsList,
  threadsList,
  inwardRates,
  fabricMargins,
  samConfigurations,
  onClose,
  onSaveSuccess,
}: QuotationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNo, setQuoteNo] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [groupDesignCombinations, setGroupDesignCombinations] = useState<any[]>([]);
  const [selectedGroupDesignId, setSelectedGroupDesignId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [gstPercent, setGstPercent] = useState('18');
  const [salesType, setSalesType] = useState<string>('WHOLESALE');
  const [customerType, setCustomerType] = useState<string>('DIRECT');
  const [quotationType, setQuotationType] = useState<string>('STANDARD');
  const isFabric = quotationType === 'FABRIC' || quotationType === 'FABRIC_SET';
  const isSetType = quotationType === 'READYMADE_SET' || quotationType === 'FABRIC_SET' || quotationType === 'MANUAL';
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
  const [departmentItems, setDepartmentItems] = useState<Record<string, ManualItem[]>>({});

  // Dynamic Branching & Manual Data states
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    {
      id: Date.now(), product_type_id: '', product_id: '',
      fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
      attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
      attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
      button_id: '', button_count: '', thread_id: '', thread_count: '',
      sam_value: '', design_number: '', quantity: '1', price: ''
    }
  ]);
  const [separateFabrics, setSeparateFabrics] = useState<SeparateFabricItem[]>([]);
  const [templateLineItems, setTemplateLineItems] = useState<TemplateLineItem[]>([]);
  const [isInitializingEdit, setIsInitializingEdit] = useState(false);
  // Ref to prevent the quotationType change effect from resetting items during edit initialization
  const isLoadingForEditRef = useRef(false);
  // Track the quotationType that was set DURING initialization so we don't reset on it
  const editLoadedQuotationTypeRef = useRef<string | null>(null);

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
  const [status, setStatus] = useState<string>('Pending');
  const [extraCharges, setExtraCharges] = useState<{ label: string; quantity: string; rate: string }[]>([
    { label: '', quantity: '1', rate: '0' }
  ]);

  // Reset items when quotation type changes — but NOT during edit initialization
  useEffect(() => {
    // Skip reset if we are in the middle of loading data for editing
    if (isLoadingForEditRef.current) return;
    // Skip reset if this quotationType was the one loaded from the edit data
    if (editLoadedQuotationTypeRef.current !== null && editLoadedQuotationTypeRef.current === quotationType) {
      editLoadedQuotationTypeRef.current = null; // Clear the guard after first skip
      return;
    }

    // Reset manual items when quotation type changes
    setManualItems([{
      id: Date.now(), product_type_id: '', product_id: '',
      fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
      attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
      attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
      button_id: '', button_count: '', thread_id: '', thread_count: '',
      sam_value: '', design_number: '', quantity: '1', price: '',
      size_breakdown: {}
    }]);
    setDepartmentItems({});
  }, [quotationType]);

  // If in edit mode, fetch detailed quotation data and initialize state
  useEffect(() => {
    if (!editingQuotationId) {
      resetWizard();
      return;
    }

    const loadQuotationForEditing = async () => {
      isLoadingForEditRef.current = true;
      setIsInitializingEdit(true);
      try {
        const res = await api.get(`/quotations/${editingQuotationId}`);
        const fullQuote = res.data;

        setQuoteTitle(fullQuote.title);
        setQuoteNo(fullQuote.quotation_no || '');
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
        setGstPercent(String(fullQuote.metrics_summary?.gst_percent ?? '18'));
        setStatus(fullQuote.status || 'Pending');

        if (fullQuote.metrics_summary?.sales_type) {
          setSalesType(fullQuote.metrics_summary.sales_type);
        }
        if (fullQuote.metrics_summary?.customer_type) {
          setCustomerType(fullQuote.metrics_summary.customer_type);
        }
        if (fullQuote.metrics_summary?.quotation_type) {
          // Store the type being loaded so the reset effect skips it
          editLoadedQuotationTypeRef.current = fullQuote.metrics_summary.quotation_type;
          setQuotationType(fullQuote.metrics_summary.quotation_type);
        } else {
          editLoadedQuotationTypeRef.current = 'STANDARD';
          setQuotationType('STANDARD');
        }

        if (fullQuote.metrics_summary?.extra_charges && Array.isArray(fullQuote.metrics_summary.extra_charges)) {
          setExtraCharges(fullQuote.metrics_summary.extra_charges);
        } else {
          setExtraCharges([{ label: '', quantity: '1', rate: '0' }]);
        }

        // Filter out separate fabric items from standard quotation items
        const rawQuoteItems = fullQuote.items || [];
        const standardQuoteItems = rawQuoteItems.filter((item: any) => !item.size_breakdown?.is_separate_fabric);

        // Extract separate fabrics from the items array as a primary/fallback source
        const separateFabricsFromItems = rawQuoteItems
          .filter((item: any) => item.size_breakdown?.is_separate_fabric === true)
          .map((item: any) => ({
            id: item.id || Date.now() + Math.random(),
            fabric_id: String(item.size_breakdown?.fabric_id || ''),
            meters: String(item.size_breakdown?.meters || item.quantity || ''),
            rate: String(item.size_breakdown?.rate || item.unit_price || '')
          }));

        if (separateFabricsFromItems.length > 0) {
          setSeparateFabrics(separateFabricsFromItems);
        } else if (fullQuote.metrics_summary?.separate_fabrics && Array.isArray(fullQuote.metrics_summary.separate_fabrics)) {
          setSeparateFabrics(fullQuote.metrics_summary.separate_fabrics);
        } else {
          setSeparateFabrics([]);
        }

        const firstItem = standardQuoteItems?.[0];
        if (firstItem) {
          setBaseFabricCost(String(firstItem.fabric_cost_per_item || '15.00'));
          setAccCost(String(firstItem.accessories_cost_per_item || '3.00'));
          setLaborCost(String(firstItem.labor_cost_per_item || '8.50'));
        }

        const hasManual = standardQuoteItems.some((it: any) => it.size_breakdown?.is_manual === true || it.size_breakdown?.is_set === true);

        if (hasManual) {
          setHasMeasurements(false);
          const deptItemsMap: Record<string, ManualItem[]> = {};
          const nonDeptItems: ManualItem[] = [];

          standardQuoteItems.forEach((item: any) => {
            const mappedItem: ManualItem = {
              id: item.id || Date.now() + Math.random(),
              product_type_id: String(item.product_type_id),
              product_id: String(item.size_breakdown?.product_id || ''),
              fabric_id: String(item.size_breakdown?.fabric_id || ''),
              main_fabric_meters: String(item.size_breakdown?.main_fabric_meters || ''),
              main_fabric_rate: String(item.size_breakdown?.main_fabric_rate || ''),
              main_fabric_sam: String(item.size_breakdown?.main_fabric_sam || ''),
              attachment_fabric1_id: String(item.size_breakdown?.attachment_fabric1_id || ''),
              attachment_fabric1_meters: String(item.size_breakdown?.attachment_fabric1_meters || ''),
              attachment_fabric1_rate: String(item.size_breakdown?.attachment_fabric1_rate || ''),
              attachment_fabric1_sam: String(item.size_breakdown?.attachment_fabric1_sam || ''),
              attachment_fabric2_id: String(item.size_breakdown?.attachment_fabric2_id || ''),
              attachment_fabric2_meters: String(item.size_breakdown?.attachment_fabric2_meters || ''),
              attachment_fabric2_rate: String(item.size_breakdown?.attachment_fabric2_rate || ''),
              attachment_fabric2_sam: String(item.size_breakdown?.attachment_fabric2_sam || ''),
              button_id: String(item.size_breakdown?.button_id || ''),
              button_count: String(item.size_breakdown?.button_count || ''),
              thread_id: String(item.size_breakdown?.thread_id || ''),
              thread_count: String(item.size_breakdown?.thread_count || ''),
              sam_value: String(item.size_breakdown?.sam_value || ''),
              design_number: String(item.size_breakdown?.design_number || ''),
              quantity: String(item.quantity),
              price: String(item.unit_price),
              size_breakdown: item.size_breakdown
            };

            const deptId = item.size_breakdown?.department_id;
            if (deptId) {
              const deptIdStr = String(deptId);
              if (!deptItemsMap[deptIdStr]) {
                deptItemsMap[deptIdStr] = [];
              }
              deptItemsMap[deptIdStr].push(mappedItem);
            } else {
              nonDeptItems.push(mappedItem);
            }
          });

          if (Object.keys(deptItemsMap).length > 0) {
            setDepartmentItems(deptItemsMap);
          } else {
            setDepartmentItems({});
          }

          if (nonDeptItems.length > 0) {
            setManualItems(nonDeptItems);
          } else {
            setManualItems([
              {
                id: Date.now(), product_type_id: '', product_id: '',
                fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
                attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
                attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
                button_id: '', button_count: '', thread_id: '', thread_count: '',
                sam_value: '', design_number: '', quantity: '1', price: ''
              }
            ]);
          }
        } else {
          setHasMeasurements(true);
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

        setCurrentStep(2); // Jump straight to edit page specs/sizing
      } catch (err: any) {
        toast.error('Failed to load quotation details for editing');
        console.error(err);
      } finally {
        setIsInitializingEdit(false);
        // Allow quotationType effect to reset items for future manual type changes
        isLoadingForEditRef.current = false;
      }
    };

    loadQuotationForEditing();
  }, [editingQuotationId]);

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
        thread_count: String(prod.thread_count || '0'),
        sam_value: String(prod.sam_value || ''),
        design_number: String(prod.design_number || ''),
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
      const rawQuoteItems = fullQuote.items || [];
      const standardItems = rawQuoteItems.filter((item: any) => !item.size_breakdown?.is_separate_fabric);
      
      const mapped = standardItems.map((item: any) => ({
        id: item.id || Date.now() + Math.random(),
        product_type_id: String(item.product_type_id || ''),
        product_id: String(item.size_breakdown?.product_id || ''),
        fabric_id: String(item.size_breakdown?.fabric_id || ''),
        main_fabric_meters: String(item.size_breakdown?.main_fabric_meters || ''),
        main_fabric_rate: String(item.size_breakdown?.main_fabric_rate || '0.00'),
        main_fabric_sam: String(item.size_breakdown?.main_fabric_sam || ''),
        attachment_fabric1_id: String(item.size_breakdown?.attachment_fabric1_id || ''),
        attachment_fabric1_meters: String(item.size_breakdown?.attachment_fabric1_meters || ''),
        attachment_fabric1_rate: String(item.size_breakdown?.attachment_fabric1_rate || '0.00'),
        attachment_fabric1_sam: String(item.size_breakdown?.attachment_fabric1_sam || ''),
        attachment_fabric2_id: String(item.size_breakdown?.attachment_fabric2_id || ''),
        attachment_fabric2_meters: String(item.size_breakdown?.attachment_fabric2_meters || ''),
        attachment_fabric2_rate: String(item.size_breakdown?.attachment_fabric2_rate || '0.00'),
        attachment_fabric2_sam: String(item.size_breakdown?.attachment_fabric2_sam || ''),
        button_id: String(item.size_breakdown?.button_id || ''),
        button_count: String(item.size_breakdown?.button_count || ''),
        thread_id: String(item.size_breakdown?.thread_id || ''),
        thread_count: String(item.size_breakdown?.thread_count || ''),
        sam_value: String(item.size_breakdown?.sam_value || ''),
        design_number: String(item.size_breakdown?.design_number || ''),
        quantity: String(item.quantity || '1'),
        price: String(item.unit_price || '')
      }));

      // Map separate fabrics from previous order
      const separateFabricsFromItems = rawQuoteItems
        .filter((item: any) => item.size_breakdown?.is_separate_fabric === true)
        .map((item: any) => ({
          id: item.id || Date.now() + Math.random(),
          fabric_id: String(item.size_breakdown?.fabric_id || ''),
          meters: String(item.size_breakdown?.meters || item.quantity || ''),
          rate: String(item.size_breakdown?.rate || item.unit_price || '')
        }));

      if (separateFabricsFromItems.length > 0) {
        setSeparateFabrics(separateFabricsFromItems);
      } else if (fullQuote.metrics_summary?.separate_fabrics && Array.isArray(fullQuote.metrics_summary.separate_fabrics)) {
        setSeparateFabrics(fullQuote.metrics_summary.separate_fabrics);
      } else {
        setSeparateFabrics([]);
      }

      setManualItems(mapped);
      setQuoteTitle(`${fullQuote.title} (Copy)`);
      if (fullQuote.metrics_summary?.sales_type) {
        setSalesType(fullQuote.metrics_summary.sales_type);
      }
      if (fullQuote.metrics_summary?.customer_type) {
        setCustomerType(fullQuote.metrics_summary.customer_type);
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
      setDepartmentItems({});
      return;
    }

    setHasMeasurements(false);
    const orgName = organizations.find(o => String(o.id) === String(orgId))?.name || 'Customer';
    setQuoteTitle(`Uniform Contract for ${orgName}`);

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

  const handleStep1Next = () => {
    if (!isSetType) {
      // Clear selected departments for Normal/Flat types
      const cleared = orgDepartments.map(d => ({ ...d, selected: false }));
      setOrgDepartments(cleared);
      setCurrentStep(2);
      return;
    }

    // Validate selected departments if any
    const selectedDepts = orgDepartments.filter(d => d.selected);
    if (selectedDepts.length > 0) {
      // Auto-calculate total quantity from selected departments
      const totalSets = selectedDepts.reduce((sum, d) => sum + (parseInt(d.persons, 10) * parseInt(d.sets, 10)), 0);
      if (totalSets > 0) {
        const updated = manualItems.map(item => ({
          ...item,
          quantity: String(totalSets)
        }));
        setManualItems(updated);
      }
    }
    setCurrentStep(2);
  };

  const isManualItemsValid = () => {
    // READYMADE_SET and MANUAL: department items with product + manually entered price
    if (quotationType === 'READYMADE_SET' || quotationType === 'MANUAL') {
      const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
      const hasDepts = selectedDepts.length > 0;
      if (hasDepts) {
        return selectedDepts.every(dept => {
          const items = departmentItems[String(dept.id)] || [];
          if (items.length === 0) return false;
          return items.every(item =>
            item.product_type_id !== '' &&
            item.product_id !== '' &&
            item.price !== '' &&
            parseFloat(item.price) >= 0 &&
            parseInt(item.quantity) > 0 &&
            (quotationType !== 'MANUAL' || (item.size_breakdown?.selected_size && item.size_breakdown.selected_size !== ''))
          );
        });
      }
      if (manualItems.length === 0) return false;
      return manualItems.every(item =>
        item.product_type_id !== '' &&
        item.product_id !== '' &&
        item.price !== '' &&
        parseFloat(item.price) >= 0 &&
        parseInt(item.quantity) > 0 &&
        (quotationType !== 'MANUAL' || (item.size_breakdown?.selected_size && item.size_breakdown.selected_size !== ''))
      );
    }

    // FABRIC_SET: department or flat items with fabric + meters (no SAM)
    if (quotationType === 'FABRIC_SET') {
      const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
      const hasDepts = selectedDepts.length > 0;
      if (hasDepts) {
        return selectedDepts.every(dept => {
          const items = departmentItems[String(dept.id)] || [];
          if (items.length === 0) return false;
          return items.every(item =>
            item.fabric_id !== '' &&
            parseFloat(item.main_fabric_meters) > 0 &&
            parseInt(item.quantity) > 0
          );
        });
      }
      if (manualItems.length === 0) return false;
      return manualItems.every(item =>
        item.fabric_id !== '' &&
        parseFloat(item.main_fabric_meters) > 0 &&
        parseInt(item.quantity) > 0
      );
    }

    // FABRIC (normal): flat items with fabric + meters (no SAM, no departments)
    if (quotationType === 'FABRIC') {
      if (manualItems.length === 0) return false;
      return manualItems.every(item =>
        item.fabric_id !== '' &&
        parseFloat(item.main_fabric_meters) > 0 &&
        parseInt(item.quantity) > 0
      );
    }

    // STANDARD (Readymade Normal): flat items requiring product type + product + main fabric + meters
    if (manualItems.length === 0) return false;
    return manualItems.every(item =>
      item.product_type_id !== '' &&
      item.product_id !== '' &&
      item.fabric_id !== '' &&
      parseFloat(item.main_fabric_meters) > 0 &&
      parseInt(item.quantity) > 0
    );
  };

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

  const calculateFabricCost = (fabricId: string, metersStr: string, fabricSamStr: string, productTypeId: string) => {
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
      const brandType = (fabric.brand_type || '').toLowerCase();
      if (brandType.includes('branded') && !brandType.includes('semi')) {
        marginPct = parseFloat(marginRow.branded) || 0;
      } else if (brandType.includes('semi')) {
        marginPct = parseFloat(marginRow.semi_branded) || 0;
      } else {
        marginPct = parseFloat(marginRow.non_branded) || 0;
      }
    }
    
    // Formula: Cost = ((Fabric SAM * 24) + Inward Transport) * (1 + Margin / 100) * 1.05 * meters
    return ((fabricSam * 24) + transportCost) * (1 + marginPct / 100) * 1.05 * meters;
  };

  const computeItemUnitCost = (item: ManualItem) => {
    const productSAMCost = isFabric ? 0 : calculateProductSAMCost(item.sam_value, item.quantity);
    const mainFabricCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
    const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
    const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
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
    } else {
      const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
      const hasDepartments = selectedDepts.length > 0;

      if (hasDepartments) {
        selectedDepts.forEach(dept => {
          const deptId = String(dept.id);
          const items = departmentItems[deptId] || [];
          items.forEach(item => {
            const sam = parseFloat(item.sam_value) || 0;
            const qty = parseInt(item.quantity) || 0;
            totalHours += (sam * qty) / 60;
          });
        });
      } else {
        // Calculate from manual entry inputs
        manualItems.forEach(item => {
          const sam = isFabric ? 0 : (parseFloat(item.sam_value) || 0);
          const qty = parseInt(item.quantity) || 0;
          totalHours += (sam * qty) / 60;
        });
      }
    }

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
  }, [baseProductionHours, extraCustomizationHours, tailorsCount, dailyShiftHours, projectStartDate, orgAnalysis, manualItems, departmentItems, orgDepartments, hasMeasurements]);

  // Run dynamic expense calculations based on active sizes
  const getCalculatedExpenses = () => {
    // For department price-entry types (READYMADE_SET, MANUAL): sum price * qty directly
    if (quotationType === 'READYMADE_SET' || quotationType === 'MANUAL') {
      let totalCost = 0;
      const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
      const hasDepts = selectedDepts.length > 0;
      if (hasDepts) {
        selectedDepts.forEach((dept: any) => {
          const items = departmentItems[String(dept.id)] || [];
          items.forEach((item: any) => {
            totalCost += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
          });
        });
      } else {
        manualItems.forEach(item => {
          totalCost += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
        });
      }
      return { fabric: 0, accessories: 0, labor: totalCost, total: totalCost };
    }

    const baseFabric = parseFloat(baseFabricCost) || 0;
    const baseAcc = parseFloat(accCost) || 0;
    const baseLabor = parseFloat(laborCost) || 0;

    let totalFabricExpense = 0;
    let totalAccExpense = 0;
    let totalLaborExpense = 0;

    const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
    const hasDepartments = selectedDepts.length > 0;

    if (hasDepartments) {
      selectedDepts.forEach(dept => {
        const deptId = String(dept.id);
        const items = departmentItems[deptId] || [];
        items.forEach(item => {
          const qty = parseInt(item.quantity) || 0;
          const mainCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
          const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
          const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
          totalFabricExpense += (mainCost + att1Cost + att2Cost) * qty;

          totalAccExpense += 0;

          const productSAMCost = calculateProductSAMCost(item.sam_value, item.quantity);
          totalLaborExpense += productSAMCost * qty;
        });
      });
    } else if (hasMeasurements) {
      // Sum details based on sizing distribution
      orgAnalysis.entities.forEach((entity: any) => {
        const size = (entity.suggested_size || 'M').toUpperCase();
        const mult = SIZE_FABRIC_MULTIPLIERS[size] !== undefined ? SIZE_FABRIC_MULTIPLIERS[size] : 1.00;

        totalFabricExpense += (baseFabric * mult);
        totalAccExpense += baseAcc;
        totalLaborExpense += baseLabor;
      });
    } else {
      // Manual items: sum per-item computed costs
      manualItems.forEach(item => {
        const qty = parseInt(item.quantity) || 0;
        const mainCost = calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id);
        const att1Cost = calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id);
        const att2Cost = calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id);
        totalFabricExpense += (mainCost + att1Cost + att2Cost) * qty;

        totalAccExpense += 0;

        const productSAMCost = isFabric ? 0 : calculateProductSAMCost(item.sam_value, item.quantity);
        totalLaborExpense += productSAMCost * qty;
      });
    }

    // Add separate fabrics expenses using calculateFabricCost to correctly compute marked up fabric expense
    separateFabrics.forEach(sf => {
      const cost = calculateFabricCost(sf.fabric_id, sf.meters, '6.777', '');
      totalFabricExpense += cost;
    });

    const totalExpenses = totalFabricExpense + totalAccExpense + totalLaborExpense;
    return {
      fabric: Math.round(totalFabricExpense * 100) / 100,
      accessories: Math.round(totalAccExpense * 100) / 100,
      labor: Math.round(totalLaborExpense * 100) / 100,
      total: Math.round(totalExpenses * 100) / 100
    };
  };

  // Compile overall quotation pricing parameters
  const getCalculatedQuoteTotals = () => {
    const expenses = getCalculatedExpenses();
    const marginPercent = parseFloat(profitMargin) || 0;

    let preTaxSubtotal = 0;
    let qty = 0;

    const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
    const hasDepartments = selectedDepts.length > 0;

    if (hasDepartments) {
      selectedDepts.forEach(dept => {
        const deptId = String(dept.id);
        const items = departmentItems[deptId] || [];
        items.forEach(item => {
          const q = parseInt(item.quantity) || 0;
          const p = parseFloat(item.price) || 0;
          preTaxSubtotal += q * p;
          qty += q;
        });
      });
      if (qty === 0) qty = 1;
    } else if (hasMeasurements) {
      const markupPrice = expenses.total * (1 + marginPercent / 100);
      preTaxSubtotal = markupPrice;
      qty = orgAnalysis.total_entities || 1;
    } else {
      // For manual entries, preTaxSubtotal is the sum of entered product quantities * entered prices
      manualItems.forEach(item => {
        const q = parseInt(item.quantity) || 0;
        const p = parseFloat(item.price) || 0;
        preTaxSubtotal += q * p;
        qty += q;
      });
      if (qty === 0) qty = 1;
    }

    // Add separate fabrics to subtotal
    separateFabrics.forEach(sf => {
      const q = parseFloat(sf.meters) || 0;
      const r = parseFloat(sf.rate) || 0;
      preTaxSubtotal += q * r;
    });

    // Add extra charges to the subtotal
    let totalExtraCharges = 0;
    extraCharges.forEach(ec => {
      const q = parseFloat(ec.quantity) || 0;
      const r = parseFloat(ec.rate) || 0;
      totalExtraCharges += q * r;
    });
    preTaxSubtotal += totalExtraCharges;

    const gstRate = parseFloat(gstPercent) || 0;
    const gstValue = preTaxSubtotal * (gstRate / 100);
    const finalValue = preTaxSubtotal + gstValue;
    const profit = preTaxSubtotal - expenses.total;
    const avgSellingPrice = preTaxSubtotal / qty;

    return {
      expenses: expenses.total,
      subtotal: Math.round(preTaxSubtotal * 100) / 100,
      gstValue: Math.round(gstValue * 100) / 100,
      finalValue: Math.round(finalValue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      avgSellingPrice: Math.round(avgSellingPrice * 100) / 100
    };
  };

  // Commit and save the quotation Wizard
  const handleSaveQuotation = async () => {
    const totals = getCalculatedQuoteTotals();
    const expenses = getCalculatedExpenses();
    const timeMetrics = getCalculatedTimeMetrics();

    let payloadItems: any[] = [];
    let totalQty = 0;

    const selectedDepts = (orgDepartments || []).filter((d: any) => d.selected);
    const hasDepartments = selectedDepts.length > 0;

    if (hasDepartments) {
      selectedDepts.forEach(dept => {
        const deptId = String(dept.id);
        const items = departmentItems[deptId] || [];
        items.forEach(item => {
          const qty = parseInt(item.quantity) || 0;
          const price = parseFloat(item.price) || 0;
          const selectedProduct = productTypes.find(p => String(p.id) === String(item.product_type_id));
          totalQty += qty;
          payloadItems.push({
            product_type_id: parseInt(item.product_type_id),
            product_type_name: selectedProduct?.name || 'Uniform Item',
            quantity: qty,
            unit_price: price,
            total_price: qty * price,
            is_manual: true,
            size_breakdown: {
              is_manual: true,
              department_id: dept.id,
              department_name: dept.name,
              product_id: item.product_id || null,
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
              sam_value: item.sam_value ? parseFloat(item.sam_value) : null,
              design_number: item.design_number || null,
              computed_unit_cost: price,
              selected_size: item.size_breakdown?.selected_size || null
            },
            fabric_cost_per_item: calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id) +
                                  calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id) +
                                  calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id),
            accessories_cost_per_item: 0,
            labor_cost_per_item: calculateProductSAMCost(item.sam_value, item.quantity)
          });
        });
      });
    } else if (hasMeasurements) {
      const selectedProduct = productTypes.find(p => String(p.id) === String(selectedProductTypeId));
      totalQty = orgAnalysis.total_entities;
      payloadItems = [{
        product_type_id: parseInt(selectedProductTypeId),
        product_type_name: selectedProduct?.name || 'Uniform Item',
        quantity: totalQty,
        unit_price: totals.avgSellingPrice,
        total_price: totals.finalValue,
        size_breakdown: orgAnalysis.size_distribution,
        fabric_cost_per_item: totalQty > 0 ? (expenses.fabric / totalQty) : 0,
        accessories_cost_per_item: parseFloat(accCost) || 0,
        labor_cost_per_item: parseFloat(laborCost) || 0
      }];
    } else {
      // Map manual items with extended material breakdown
      payloadItems = manualItems
        .map(item => {
          const qty = parseInt(item.quantity) || 0;
          // Price-based types use entered price; all others use computeItemUnitCost
          const isPriceBased = quotationType === 'READYMADE_SET' || quotationType === 'MANUAL';
          const unitCost = isPriceBased ? (parseFloat(item.price) || 0) : computeItemUnitCost(item);
          const selectedProduct = productTypes.find(p => String(p.id) === String(item.product_type_id));
          totalQty += qty;

          if (isPriceBased) {
            return {
              product_type_id: parseInt(item.product_type_id) || null,
              product_type_name: selectedProduct?.name || 'Item',
              quantity: qty,
              unit_price: unitCost,
              total_price: qty * unitCost,
              is_manual: true,
              size_breakdown: {
                is_manual: true,
                product_id: item.product_id || null,
                design_number: item.design_number || null,
                computed_unit_cost: unitCost,
                is_readymade: true,
                selected_size: item.size_breakdown?.selected_size || null
              },
              fabric_cost_per_item: 0,
              accessories_cost_per_item: 0,
              labor_cost_per_item: 0
            };
          }

          return {
            product_type_id: parseInt(item.product_type_id),
            product_type_name: selectedProduct?.name || 'Uniform Item',
            quantity: qty,
            unit_price: unitCost,
            total_price: qty * unitCost,
            is_manual: true,
            size_breakdown: {
              is_manual: true,
              product_id: item.product_id || null,
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
              sam_value: item.sam_value ? parseFloat(item.sam_value) : null,
              design_number: item.design_number || null,
              computed_unit_cost: unitCost,
              class_name: item.size_breakdown?.class_name || null
            },
            fabric_cost_per_item: calculateFabricCost(item.fabric_id, item.main_fabric_meters, item.main_fabric_sam, item.product_type_id) +
                                  calculateFabricCost(item.attachment_fabric1_id, item.attachment_fabric1_meters, item.attachment_fabric1_sam, item.product_type_id) +
                                  calculateFabricCost(item.attachment_fabric2_id, item.attachment_fabric2_meters, item.attachment_fabric2_sam, item.product_type_id),
            accessories_cost_per_item: 0,
            labor_cost_per_item: isFabric ? 0 : calculateProductSAMCost(item.sam_value, item.quantity)
          };
        });
    }

    // Append separate fabrics as standard items in the quotation payload
    separateFabrics.forEach(sf => {
      const fabric = fabricsList.find((f: any) => String(f.id) === String(sf.fabric_id));
      const fabricName = fabric ? (fabric.brand_name || fabric.name || 'Custom Fabric') : 'Custom Fabric';
      const shade = fabric?.shade ? ` (Shade: ${fabric.shade})` : '';
      const width = fabric?.width ? ` - Width: ${fabric.width}"` : '';
      const qty = parseFloat(sf.meters) || 0;
      const rate = parseFloat(sf.rate) || 0;

      payloadItems.push({
        product_type_id: null,
        product_type_name: `Fabric: ${fabricName}${shade}${width}`,
        quantity: qty,
        unit_price: rate,
        total_price: qty * rate,
        is_manual: true,
        size_breakdown: {
          is_separate_fabric: true,
          fabric_id: sf.fabric_id,
          meters: qty,
          rate: rate
        },
        fabric_cost_per_item: calculateFabricCost(sf.fabric_id, '1', '6.777', ''),
        accessories_cost_per_item: 0,
        labor_cost_per_item: 0
      });
    });

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
        pre_tax_subtotal: totals.subtotal,
        sales_type: salesType,
        customer_type: customerType,
        quotation_type: quotationType,
        extra_charges: extraCharges,
        separate_fabrics: separateFabrics,
        project_start_date: projectStartDate,
        departments: selectedDepts.map((d: any) => ({
          id: d.id,
          name: d.name,
          division: d.division,
          persons: parseInt(d.persons, 10) || 0,
          sets: parseInt(d.sets, 10) || 0
        })),
        classes: []
      },
      items: payloadItems
    };

    const loadingToast = toast.loading(editingQuotationId ? 'Updating Formal Quotation...' : 'Compiling and saving Formal Quotation...');
    try {
      let response;
      if (editingQuotationId) {
        response = await api.put(`/quotations/${editingQuotationId}`, {
          ...payload,
          status: status
        });
        toast.success('Formal Quotation updated successfully!', { id: loadingToast });
      } else {
        response = await api.post('/quotations', {
          ...payload,
          status: status
        });
        toast.success('Formal Quotation compiled and saved to registry!', { id: loadingToast });
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
    setCurrentStep(1);
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
    setDepartmentItems({});
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
    setQuotationType('STANDARD');
    setTemplateLineItems([]);
    setCoverLetter('');
    setGstPercent('18');
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
    setManualItems([
      {
        id: Date.now(), product_type_id: '', product_id: '',
        fabric_id: '', main_fabric_meters: '', main_fabric_rate: '', main_fabric_sam: '',
        attachment_fabric1_id: '', attachment_fabric1_meters: '', attachment_fabric1_rate: '', attachment_fabric1_sam: '',
        attachment_fabric2_id: '', attachment_fabric2_meters: '', attachment_fabric2_rate: '', attachment_fabric2_sam: '',
        button_id: '', button_count: '', thread_id: '', thread_count: '',
        sam_value: '', design_number: '', quantity: '1', price: ''
      }
    ]);
    setSeparateFabrics([]);
  };

  if (isInitializingEdit) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-4 border-[#2d8d9b] border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-4 font-black text-sm text-zinc-500">Initializing Quotation Editor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* STEPPER PROGRESS */}
      <div className="bg-[#2d8d9b]/5 p-6 rounded-[2rem] border border-[#2d8d9b]/10 flex justify-between items-center max-w-4xl mx-auto">
        {[
          { idx: 1, label: 'Customer' },
          { idx: 2, label: 'Sizing Audit' },
          { idx: 3, label: 'Expenses' },
          { idx: 4, label: 'Timeline & Profit' },
          { idx: 5, label: 'Review' }
        ].map(step => (
          <div key={step.idx} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${currentStep === step.idx
              ? 'bg-[#3a525d] border-[#3a525d] text-white shadow-lg'
              : currentStep > step.idx
                ? 'bg-green-500 border-green-500 text-white'
                : 'bg-white border-zinc-200 text-zinc-400'
              }`}>
              {currentStep > step.idx ? <Check size={16} strokeWidth={3} /> : step.idx}
            </div>
            <span className={`text-xs font-black uppercase tracking-wider hidden md:inline ${currentStep === step.idx ? 'text-[#3a525d]' : 'text-zinc-400'
              }`}>
              {step.label}
            </span>
            {step.idx < 5 && <ChevronRight size={16} className="text-zinc-300 hidden md:block" />}
          </div>
        ))}
      </div>

      <Card className="p-10 border border-zinc-100 rounded-[3rem] shadow-2xl shadow-zinc-100 relative overflow-hidden bg-white/80 backdrop-blur-md">
        {/* STEP 1: CUSTOMER SELECTION */}
        {currentStep === 1 && (
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
            quotationType={quotationType}
            setQuotationType={setQuotationType}
            isAnalyzing={isAnalyzing}
            onNext={handleStep1Next}
            generateAutoCoverLetter={generateAutoCoverLetter}
            previousOrders={previousOrders}
            onSelectPreviousOrder={handleSelectPreviousOrder}
            groupDesignCombinations={groupDesignCombinations}
            selectedGroupDesignId={selectedGroupDesignId}
            onSelectGroupDesign={handleSelectGroupDesign}
            orgDepartments={orgDepartments}
            setOrgDepartments={setOrgDepartments}
          />
        )}

        {/* STEP 2: SIZING AUDIT & MEASUREMENT CHECKS */}
        {currentStep === 2 && (
          <WizardStep2
            hasMeasurements={hasMeasurements}
            orgAnalysis={orgAnalysis}
            templateLineItems={templateLineItems}
            setTemplateLineItems={setTemplateLineItems}
            manualItems={manualItems}
            setManualItems={setManualItems}
            separateFabrics={separateFabrics}
            setSeparateFabrics={setSeparateFabrics}
            orgDepartments={orgDepartments}
            setOrgDepartments={setOrgDepartments}
            departmentItems={departmentItems}
            setDepartmentItems={setDepartmentItems}
            productTypes={productTypes}
            allProducts={allProducts}
            fabricsList={fabricsList}
            buttonsList={buttonsList}
            threadsList={threadsList}
            inwardRates={inwardRates}
            fabricMargins={fabricMargins}
            samConfigurations={samConfigurations}
            salesType={salesType}
            customerType={customerType}
            calculateProductSAMCost={calculateProductSAMCost}
            calculateFabricCost={calculateFabricCost}
            laborRatePerHour={laborRatePerHour}
            isAnalyzing={isAnalyzing}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
            isManualItemsValid={isManualItemsValid}
            quotationType={quotationType}
            organizations={organizations}
            selectedOrgId={selectedOrgId}
          />
        )}

        {/* STEP 3: INTERACTIVE EXPENSES & COST SCALING */}
        {currentStep === 3 && (
          <WizardStep3
            hasMeasurements={hasMeasurements}
            productTypes={productTypes}
            selectedProductTypeId={selectedProductTypeId}
            setSelectedProductTypeId={setSelectedProductTypeId}
            baseFabricCost={baseFabricCost}
            setBaseFabricCost={setBaseFabricCost}
            accCost={accCost}
            setAccCost={setAccCost}
            laborCost={laborCost}
            setLaborCost={setLaborCost}
            gstPercent={gstPercent}
            setGstPercent={setGstPercent}
            laborRatePerHour={laborRatePerHour}
            setLaborRatePerHour={setLaborRatePerHour}
            manualItems={manualItems}
            separateFabrics={separateFabrics}
            fabricsList={fabricsList}
            calculatedExpenses={getCalculatedExpenses()}
            calculateFabricCost={calculateFabricCost}
            calculateProductSAMCost={calculateProductSAMCost}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
            orgDepartments={orgDepartments}
            departmentItems={departmentItems}
            quotationType={quotationType}
            allProducts={allProducts}
          />
        )}

        {/* STEP 4: TIMELINE, CAPACITY & PROFIT ANALYSIS */}
        {currentStep === 4 && (
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
            quoteTotals={getCalculatedQuoteTotals()}
            gstPercent={gstPercent}
            setGstPercent={setGstPercent}
            extraCharges={extraCharges}
            setExtraCharges={setExtraCharges}
            status={status}
            setStatus={setStatus}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
            fabricsList={fabricsList}
          />
        )}

        {/* STEP 5: COMPILE PROPOSAL & FINAL REVIEW */}
        {currentStep === 5 && (
          <WizardStep5
            hasMeasurements={hasMeasurements}
            quoteTitle={quoteTitle}
            quoteNo={quoteNo}
            selectedOrgId={selectedOrgId}
            organizations={organizations}
            productTypes={productTypes}
            selectedProductTypeId={selectedProductTypeId}
            orgAnalysis={orgAnalysis}
            manualItems={manualItems}
            separateFabrics={separateFabrics}
            fabricsList={fabricsList}
            profitMargin={profitMargin}
            calculatedExpenses={getCalculatedExpenses()}
            quoteTotals={getCalculatedQuoteTotals()}
            gstPercent={gstPercent}
            editingQuotationId={editingQuotationId}
            onBack={() => setCurrentStep(4)}
            onSave={handleSaveQuotation}
            orgDepartments={orgDepartments}
            departmentItems={departmentItems}
            quotationType={quotationType}
          />
        )}
      </Card>
    </div>
  );
}
