'use client';

import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Building2, 
  Ruler, 
  Scale, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Percent,
  Calendar,
  Layers,
  Users
} from 'lucide-react';

interface Organization {
  id: number;
  name: string;
}

interface ProductType {
  id: number;
  name: string;
}

interface QuotationItem {
  product_type_id: number;
  product_type_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  size_breakdown: Record<string, number>;
  fabric_cost_per_item: number;
  accessories_cost_per_item: number;
  labor_cost_per_item: number;
}

interface Quotation {
  id: number;
  quotation_no: string;
  title: string;
  organization_id: number;
  organizations?: { name: string };
  estimated_expenses: number;
  total_estimated_time: string;
  production_days_estimate: number;
  expected_delivery_date: string | null;
  profit_margin_percent: number;
  final_quote_value: number;
  status: string;
  items?: any[];
  metrics_summary: {
    total_entities?: number;
    measured?: number;
    pending?: number;
    missing?: number;
    sizes?: Record<string, number>;
  };
  created_at: string;
}

// Fabric scaling multipliers per size
const SIZE_FABRIC_MULTIPLIERS: Record<string, number> = {
  'XS': 0.85,
  'S': 0.90,
  'M': 1.00,
  'L': 1.10,
  'XL': 1.20,
  'XXL': 1.35,
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'details'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Quotation | null>(null);

  interface ManualItem {
    id: number;
    product_type_id: string;
    fabric_id: string;
    sam_value: string;
    design_number: string;
    quantity: string;
    price: string;
  }

  // --- Quotation Compiler Wizard State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNo, setQuoteNo] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  // Dynamic Branching & Manual Data states
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    { id: Date.now(), product_type_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
  ]);
  const [fabricsList, setFabricsList] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // Branch A editable template line items (design number and price are overrideable)
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
  const [templateLineItems, setTemplateLineItems] = useState<TemplateLineItem[]>([]);

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

  // Profit variables
  const [profitMargin, setProfitMargin] = useState('30');

  // Load baseline data
  useEffect(() => {
    fetchQuotations();
    fetchOrganizations();
    fetchProductTypes();
    fetchFabrics();
    fetchProducts();
  }, []);

  const fetchFabrics = async () => {
    try {
      const res = await api.get('/inventory/fabrics');
      setFabricsList(res.data || []);
    } catch (err) {
      console.error('Failed to load fabrics list', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setAllProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products list', err);
    }
  };

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
    } catch (err) {
      toast.error('Failed to retrieve quotations registry');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data);
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  const fetchProductTypes = async () => {
    try {
      const res = await api.get('/product-types');
      setProductTypes(res.data);
    } catch (err) {
      console.error('Failed to load product types', err);
    }
  };

  // Triggers measurement and sizing calculation for selected org
  const handleOrgSelection = async (orgId: string) => {
    setSelectedOrgId(orgId);
    if (!orgId) return;

    setIsAnalyzing(true);
    try {
      const res = await api.get(`/quotations/calculate/${orgId}`);
      setOrgAnalysis(res.data);

      // Seed editable template line items from backend response
      const rawItems = res.data?.template_line_items || [];
      setTemplateLineItems(rawItems.map((item: any) => ({
        ...item,
        design_number_override: item.design_code || '',
        price_override: ''
      })));
      
      const measurementsExist = res.data && res.data.measured_count > 0;
      setHasMeasurements(measurementsExist);
      
      if (!measurementsExist) {
        setManualItems([
          { id: Date.now(), product_type_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
        ]);
      }
      
      // Auto fill a title if empty
      const orgName = organizations.find(o => String(o.id) === String(orgId))?.name || 'Customer';
      setQuoteTitle(`Uniform Contract for ${orgName}`);
      
      if (measurementsExist) {
        toast.success('Member sizing profiles analyzed successfully!');
      } else {
        toast.success('No sizing metrics exist. Wizard will use manual product entry list.');
      }
    } catch (err: any) {
      toast.error('Failed to run measurement analysis');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isManualItemsValid = () => {
    if (manualItems.length === 0) return false;
    return manualItems.every(item => 
      item.product_type_id !== '' &&
      item.fabric_id !== '' &&
      parseFloat(item.sam_value) > 0 &&
      parseInt(item.quantity) > 0 &&
      parseFloat(item.price) > 0
    );
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
      // Calculate from manual entry inputs (SAM is standard allowed minutes, so sum(sam_value * quantity / 60))
      manualItems.forEach(item => {
        const sam = parseFloat(item.sam_value) || 0;
        const qty = parseInt(item.quantity) || 0;
        totalHours += (sam * qty) / 60;
      });
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

    // Simple calendar day calculation
    const start = new Date(projectStartDate);
    let daysAdded = 0;
    let current = new Date(start);

    // Skip weekends (optional premium detail, but we can do a standard business days calc)
    while (daysAdded < workingDays) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip Sat/Sun
        daysAdded++;
      }
    }

    setDeliveryDate(current.toISOString().split('T')[0]);
  }, [baseProductionHours, extraCustomizationHours, tailorsCount, dailyShiftHours, projectStartDate, orgAnalysis]);

  // Run dynamic expense calculations based on active sizes
  const getCalculatedExpenses = () => {
    const baseFabric = parseFloat(baseFabricCost) || 0;
    const baseAcc = parseFloat(accCost) || 0;
    const baseLabor = parseFloat(laborCost) || 0;

    let totalFabricExpense = 0;
    let totalAccExpense = 0;
    let totalLaborExpense = 0;

    if (hasMeasurements) {
      // Sum details based on sizing distribution
      orgAnalysis.entities.forEach((entity: any) => {
        const size = (entity.suggested_size || 'M').toUpperCase();
        const mult = SIZE_FABRIC_MULTIPLIERS[size] !== undefined ? SIZE_FABRIC_MULTIPLIERS[size] : 1.00;
        
        totalFabricExpense += (baseFabric * mult);
        totalAccExpense += baseAcc;
        totalLaborExpense += baseLabor;
      });
    } else {
      // Sum details based on manual product items
      manualItems.forEach(item => {
        const qty = parseInt(item.quantity) || 0;
        totalFabricExpense += (baseFabric * qty);
        totalAccExpense += (baseAcc * qty);
        totalLaborExpense += (baseLabor * qty);
      });
    }

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

    let finalValue = 0;
    let qty = 0;

    if (hasMeasurements) {
      const markupPrice = expenses.total * (1 + marginPercent / 100);
      finalValue = markupPrice;
      qty = orgAnalysis.total_entities || 1;
    } else {
      // For manual entries, finalValue is the sum of entered product quantities * entered prices
      manualItems.forEach(item => {
        const q = parseInt(item.quantity) || 0;
        const p = parseFloat(item.price) || 0;
        finalValue += q * p;
        qty += q;
      });
      if (qty === 0) qty = 1;
    }

    const profit = finalValue - expenses.total;
    const avgSellingPrice = finalValue / qty;

    return {
      expenses: expenses.total,
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

    if (hasMeasurements) {
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
      // Map manual items
      payloadItems = manualItems.map(item => {
        const qty = parseInt(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const selectedProduct = productTypes.find(p => String(p.id) === String(item.product_type_id));
        totalQty += qty;
        return {
          product_type_id: parseInt(item.product_type_id),
          product_type_name: selectedProduct?.name || 'Uniform Item',
          quantity: qty,
          unit_price: price,
          total_price: qty * price,
          fabric_id: item.fabric_id || null,
          sam_value: item.sam_value ? parseFloat(item.sam_value) : null,
          design_number: item.design_number || null,
          is_manual: true,
          size_breakdown: {
            fabric_id: item.fabric_id || null,
            sam_value: item.sam_value ? parseFloat(item.sam_value) : null,
            design_number: item.design_number || null,
            is_manual: true
          },
          fabric_cost_per_item: parseFloat(baseFabricCost) || 0,
          accessories_cost_per_item: parseFloat(accCost) || 0,
          labor_cost_per_item: parseFloat(laborCost) || 0
        };
      });
    }

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
        sizes: hasMeasurements ? orgAnalysis.size_distribution : {}
      },
      items: payloadItems
    };

    const loadingToast = toast.loading('Compiling and saving Formal Quotation...');
    try {
      await api.post('/quotations', payload);
      toast.success('Formal Quotation compiled and saved to registry!', { id: loadingToast });
      resetWizard();
      setActiveTab('list');
      fetchQuotations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to register quotation', { id: loadingToast });
    }
  };

  const handleDeleteQuotation = async () => {
    if (!deleteCandidate) return;
    try {
      await api.delete(`/quotations/${deleteCandidate.id}`);
      toast.success('Quotation removed successfully!');
      fetchQuotations();
    } catch (err) {
      toast.error('Failed to remove quotation');
    } finally {
      setDeleteCandidate(null);
    }
  };

  const handleViewDetails = async (quote: Quotation) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/quotations/${quote.id}`);
      setSelectedQuotation(res.data);
      setActiveTab('details');
    } catch (err) {
      toast.error('Failed to load quotation details');
    } finally {
      setIsLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setQuoteTitle('');
    setQuoteNo('');
    setSelectedOrgId('');
    setSelectedProductTypeId('');
    setBaseFabricCost('15.00');
    setAccCost('3.00');
    setLaborCost('8.50');
    setBaseProductionHours('2.0');
    setExtraCustomizationHours('0.25');
    setTailorsCount('5');
    setDailyShiftHours('8');
    setProfitMargin('30');
    setTemplateLineItems([]);
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
  };

  // --- Table Columns Definition ---
  const columns: Column<Quotation>[] = [
    {
      header: 'Quote Code & Title',
      accessor: (q) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2d8d9b]/5 rounded-2xl flex items-center justify-center text-[#2d8d9b] border border-[#2d8d9b]/10 shadow-sm">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#3a525d]">{q.title}</p>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{q.quotation_no}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: (q) => (
        <p className="text-xs font-black text-zinc-600">{q.organizations?.name || 'N/A'}</p>
      )
    },
    {
      header: 'Quote Value',
      accessor: (q) => (
        <div>
          <p className="text-sm font-black text-[#2d8d9b]">${Number(q.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Exp: ${Number(q.estimated_expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      )
    },
    {
      header: 'Sizing Analysis',
      accessor: (q) => (
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-green-50 text-green-600 border border-green-100">
            {q.metrics_summary?.measured || 0} Meas
          </span>
          {q.metrics_summary?.missing && q.metrics_summary.missing > 0 ? (
            <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
              <AlertTriangle size={10} /> {q.metrics_summary.missing} Missing
            </span>
          ) : null}
        </div>
      )
    },
    {
      header: 'Lead Time & Delivery',
      accessor: (q) => (
        <div>
          <p className="text-xs font-bold text-zinc-600">{q.production_days_estimate} Prod Days</p>
          <p className="text-[10px] font-black text-[#3a525d] mt-0.5">
            🚚 {q.expected_delivery_date ? new Date(q.expected_delivery_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </p>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (q) => {
        const colors: Record<string, string> = {
          'Draft': 'bg-zinc-50 text-zinc-600 border-zinc-100',
          'Sent': 'bg-blue-50 text-blue-600 border-blue-100',
          'Approved': 'bg-green-50 text-green-600 border-green-100',
          'Rejected': 'bg-red-50 text-red-600 border-red-100',
        };
        return (
          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${colors[q.status] || colors.Draft}`}>
            {q.status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: (q) => (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleViewDetails(q)}
            className="w-10 h-10 rounded-xl bg-[#2d8d9b]/5 text-[#2d8d9b] hover:bg-[#2d8d9b] hover:text-white transition-all flex items-center justify-center border border-[#2d8d9b]/10"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => setDeleteCandidate(q)}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100"
            title="Remove Quotation"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d] flex items-center gap-3">
            Marketing Quotations
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            {activeTab === 'list' && 'Client Contract proposals & custom sizing estimates'}
            {activeTab === 'create' && `Quotation Compiler Wizard - Step ${currentStep} of 5`}
            {activeTab === 'details' && 'Detailed Expense Breakdown & Delivery Timelines'}
          </p>
        </div>

        {activeTab === 'list' ? (
          <Button 
            onClick={() => setActiveTab('create')}
            className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-[#3a525d]/20 gap-3"
          >
            <Plus size={20} strokeWidth={3} />
            Compile Quotation
          </Button>
        ) : (
          <Button 
            variant="secondary"
            onClick={() => { resetWizard(); setActiveTab('list'); setSelectedQuotation(null); }}
            className="h-16 px-10 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Registry
          </Button>
        )}
      </div>

      {/* 1. LIST REGISTRY TAB */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
              <div className="w-14 h-14 bg-[#2d8d9b]/10 rounded-2xl flex items-center justify-center text-[#2d8d9b]">
                <Layers size={24} />
              </div>
              <div>
                <p className="text-2xl font-black italic text-[#3a525d]">{quotations.length}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Quotations</p>
              </div>
            </Card>

            <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-2xl font-black italic text-green-600">
                  {quotations.filter(q => q.status === 'Approved').length}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Approved Quotes</p>
              </div>
            </Card>

            <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
              <div className="w-14 h-14 bg-[#3a525d]/10 rounded-2xl flex items-center justify-center text-[#3a525d]">
                <Scale size={24} />
              </div>
              <div>
                <p className="text-2xl font-black italic text-[#3a525d]">
                  ${quotations.reduce((acc, q) => acc + Number(q.final_quote_value), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Total Registry Value</p>
              </div>
            </Card>

            <Card className="p-6 border border-zinc-100 flex items-center gap-5 shadow-sm rounded-3xl">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-2xl font-black italic text-amber-600">
                  {quotations.filter(q => q.status === 'Draft').length}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Pending Drafts</p>
              </div>
            </Card>
          </div>

          <DataTable 
            columns={columns}
            data={quotations}
            isLoading={isLoading}
            searchPlaceholder="Search compiled quotations by title or code..."
          />
        </div>
      )}

      {/* 2. COMPILED WIZARD TAB */}
      {activeTab === 'create' && (
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${
                  currentStep === step.idx 
                    ? 'bg-[#3a525d] border-[#3a525d] text-white shadow-lg' 
                    : currentStep > step.idx 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-white border-zinc-200 text-zinc-400'
                }`}>
                  {currentStep > step.idx ? <Check size={16} strokeWidth={3} /> : step.idx}
                </div>
                <span className={`text-xs font-black uppercase tracking-wider hidden md:inline ${
                  currentStep === step.idx ? 'text-[#3a525d]' : 'text-zinc-400'
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
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="border-b border-zinc-100 pb-6">
                  <h3 className="text-2xl font-black italic text-[#3a525d]">Select Customer & Proposal Title</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">Define customer association context</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Customer Organization</label>
                    <Select 
                      options={organizations.map(o => ({ label: o.name, value: String(o.id) }))}
                      value={selectedOrgId}
                      onChange={handleOrgSelection}
                      placeholder="Select Customer Organization..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Quotation Contract Title</label>
                    <Input 
                      placeholder="e.g. Formal Uniform Proposal"
                      value={quoteTitle}
                      onChange={(e) => setQuoteTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Manual Quote No (Optional)</label>
                    <Input 
                      placeholder="e.g. QT-99081 (Leave blank to auto generate)"
                      value={quoteNo}
                      onChange={(e) => setQuoteNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    disabled={!selectedOrgId || !quoteTitle.trim() || isAnalyzing}
                    onClick={() => setCurrentStep(2)}
                    className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
                  >
                    {isAnalyzing ? 'Analyzing Sizing...' : 'Sizing Audit & Next'} <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: SIZING AUDIT & MEASUREMENT CHECKS */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="border-b border-zinc-100 pb-6 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="text-2xl font-black italic text-[#3a525d]">Sizing & Measurement Audits</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
                      Live verification of measurements profiles
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10">
                      {hasMeasurements ? `${orgAnalysis.total_entities} Entities` : `${manualItems.reduce((acc, it) => acc + (parseInt(it.quantity) || 0), 0)} Custom Units`}
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

                    {/* DYNAMIC WARNING BLOCK */}
                    {orgAnalysis.missing_count > 0 && (
                      <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex gap-4 text-amber-800">
                        <AlertTriangle className="shrink-0 text-amber-600" size={24} />
                        <div className="space-y-1">
                          <p className="text-sm font-black italic">⚠️ High Compliance Warning: Missing Measurements Found</p>
                          <p className="text-xs leading-relaxed font-semibold">
                            There are <strong>{orgAnalysis.missing_count} member(s)</strong> in this organization without active or completed measurement profiles. 
                            To build standard pricing estimates, the wizard will allocate default sizes (Standard Size M) for these members. 
                            We recommend that the customer submits their metrics to ensure a perfect fit prior to final manufacturing start.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* MERGED UNIFIED SIZING AUDIT TABLE */}
                    {templateLineItems.length === 0 ? (
                      <div className="p-6 bg-amber-50/50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs">
                        <AlertTriangle className="shrink-0 text-amber-600" size={18} />
                        <div>
                          <p className="font-black">No Template Configured</p>
                          <p className="font-medium mt-0.5">This organization has no template with linked products. Please configure a uniform template first via Admin &gt; Templates.</p>
                        </div>
                      </div>
                    ) : (() => {
                      // Deduplicate by product_id — merge rows with same product
                      const mergedMap = new Map<number, TemplateLineItem & { _indices: number[] }>();
                      templateLineItems.forEach((item, idx) => {
                        const key = item.product_id;
                        if (mergedMap.has(key)) {
                          const existing = mergedMap.get(key)!;
                          // Combine design numbers if different
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

                      // Compute qty per merged item
                      const getQty = (item: TemplateLineItem) => orgAnalysis.entities.filter((ent: any) => {
                        if (ent.measurement_status !== 'Completed') return false;
                        const eg = (ent.gender || '').toLowerCase();
                        const ig = (item.gender || '').toLowerCase();
                        if (ig === 'unisex' || ig === 'all') return true;
                        if (ig === 'male' || ig === 'm') return eg === 'male' || eg === 'm';
                        if (ig === 'female' || ig === 'f') return eg === 'female' || eg === 'f';
                        return false;
                      }).length;

                      // Totals
                      const totalQty = mergedItems.reduce((s, item) => s + getQty(item), 0);
                      const totalSAMMin = mergedItems.reduce((s, item) => s + (item.sam_value ? item.sam_value * getQty(item) : 0), 0);
                      const totalPrice = mergedItems.reduce((s, item) => {
                        const p = parseFloat(item.price_override || '0');
                        return s + (p > 0 ? p * getQty(item) : 0);
                      }, 0);

                      return (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center gap-2">
                            <Layers size={14} className="text-[#2d8d9b]" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product & Design Sizing Audit</h4>
                            <span className="ml-auto text-[9px] font-bold text-[#2d8d9b] uppercase tracking-widest opacity-70">Design numbers & prices are editable</span>
                          </div>
                          <div className="border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-[#2d8d9b]/5 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                                  <th className="p-3">ART Number</th>
                                  <th className="p-3">Product Name</th>
                                  <th className="p-3">Gender</th>
                                  <th className="p-3">Design Number</th>
                                  <th className="p-3">Material</th>
                                  <th className="p-3 font-mono">SAM</th>
                                  <th className="p-3 text-right">Quantity</th>
                                  <th className="p-3 w-28">Price/Unit ($)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                                {mergedItems.map((item, mi) => {
                                  const qty = getQty(item);
                                  const firstIdx = item._indices[0];
                                  return (
                                    <tr key={mi} className="hover:bg-zinc-50/50 bg-white">
                                      <td className="p-3 font-black text-[#2d8d9b]">{item.art_number || '—'}</td>
                                      <td className="p-3 text-zinc-800">{item.product_name}</td>
                                      <td className="p-3 capitalize text-zinc-500">{item.gender}</td>
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          placeholder={item.design_code || 'e.g. DN-001'}
                                          className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
                                          value={templateLineItems[firstIdx]?.design_number_override || ''}
                                          onChange={(e) => {
                                            const updated = [...templateLineItems];
                                            item._indices.forEach(i => {
                                              updated[i] = { ...updated[i], design_number_override: e.target.value };
                                            });
                                            setTemplateLineItems(updated);
                                          }}
                                        />
                                      </td>
                                      <td className="p-3 text-zinc-400">{item.materials || '—'}</td>
                                      <td className="p-2">
                                        <input
                                          type="number"
                                          step="0.0001"
                                          min="0"
                                          placeholder="min"
                                          className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
                                          value={templateLineItems[firstIdx]?.sam_value ?? ''}
                                          onChange={(e) => {
                                            const updated = [...templateLineItems];
                                            item._indices.forEach(i => {
                                              updated[i] = { ...updated[i], sam_value: e.target.value === '' ? null : parseFloat(e.target.value) };
                                            });
                                            setTemplateLineItems(updated);
                                          }}
                                        />
                                      </td>
                                      <td className="p-3 text-right font-black text-[#3a525d]">{qty > 0 ? <span>{qty} <span className="text-zinc-400 font-normal">Units</span></span> : <span className="text-zinc-300">0</span>}</td>
                                      <td className="p-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="Optional"
                                          className="w-full bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-[#2d8d9b] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]/30 transition-all"
                                          value={templateLineItems[firstIdx]?.price_override || ''}
                                          onChange={(e) => {
                                            const updated = [...templateLineItems];
                                            item._indices.forEach(i => {
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
                              {/* TOTALS FOOTER */}
                              <tfoot>
                                <tr className="bg-[#3a525d]/5 border-t-2 border-[#2d8d9b]/20 text-[#3a525d] font-black text-xs">
                                  <td colSpan={5} className="p-3 text-[10px] uppercase tracking-widest text-zinc-400">Totals</td>
                                  <td className="p-3 font-mono font-black text-[#3a525d]">
                                    {totalSAMMin > 0 ? `${Math.round(totalSAMMin * 10) / 10} min` : '—'}
                                  </td>
                                  <td className="p-3 text-right font-black text-[#3a525d]">
                                    {totalQty} <span className="text-zinc-400 font-normal text-[10px]">Units</span>
                                  </td>
                                  <td className="p-3 font-mono font-black text-[#2d8d9b]">
                                    {totalPrice > 0 ? `$${totalPrice.toFixed(2)}` : '—'}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    })()}




                  </>
                ) : (
                  <>
                    {/* BRANCH B (NO MEASUREMENTS): PREMIUM INTERACTIVE MULTI-ENTRY TABLE */}
                    <div className="space-y-4">
                      <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-3xl flex gap-3 text-amber-800 text-xs">
                        <AlertTriangle className="shrink-0 text-amber-600" size={20} />
                        <div>
                          <p className="font-black">No Sizing/Measurement Metrics Found (Branch B)</p>
                          <p className="font-medium mt-0.5">Please define the custom garment lines manually using the interactive multi-line entry grid below. Ensure all fields are correctly populated.</p>
                        </div>
                      </div>

                      <div className="border border-zinc-150 rounded-3xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                              <th className="p-4">Product Type</th>
                              <th className="p-4">Fabric Type</th>
                              <th className="p-4 w-28">SAM Value (min)</th>
                              <th className="p-4">Design / Material Details</th>
                              <th className="p-4 w-24">Quantity</th>
                              <th className="p-4 w-28">Price / Unit ($)</th>
                              <th className="p-4 text-center w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-700">
                            {manualItems.map((item, index) => (
                              <tr key={item.id} className="hover:bg-zinc-50/50">
                                <td className="p-3">
                                  <select 
                                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b] transition-all"
                                    value={item.product_type_id}
                                    onChange={(e) => {
                                      const updated = [...manualItems];
                                      updated[index].product_type_id = e.target.value;
                                      setManualItems(updated);
                                    }}
                                  >
                                    <option value="">Select product...</option>
                                    {productTypes.map(pt => (
                                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3">
                                  <select 
                                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b] transition-all"
                                    value={item.fabric_id}
                                    onChange={(e) => {
                                      const updated = [...manualItems];
                                      updated[index].fabric_id = e.target.value;
                                      setManualItems(updated);
                                    }}
                                  >
                                    <option value="">Select fabric...</option>
                                    {fabricsList.map(f => (
                                      <option key={f.id} value={f.id}>{f.brand_name} - {f.shade} ({f.width}")</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3">
                                  <input 
                                    type="number"
                                    step="0.0001"
                                    placeholder="2.5"
                                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                                    value={item.sam_value}
                                    onChange={(e) => {
                                      const updated = [...manualItems];
                                      updated[index].sam_value = e.target.value;
                                      setManualItems(updated);
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <input 
                                    type="text"
                                    placeholder="e.g. Navy, slim fit"
                                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-[#3a525d] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                                    value={item.design_number}
                                    onChange={(e) => {
                                      const updated = [...manualItems];
                                      updated[index].design_number = e.target.value;
                                      setManualItems(updated);
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <input 
                                    type="number"
                                    min="1"
                                    placeholder="50"
                                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const updated = [...manualItems];
                                      updated[index].quantity = e.target.value;
                                      setManualItems(updated);
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <input 
                                    type="number"
                                    step="0.01"
                                    placeholder="35.00"
                                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2d8d9b] focus:outline-none focus:ring-1 focus:ring-[#2d8d9b]"
                                    value={item.price}
                                    onChange={(e) => {
                                      const updated = [...manualItems];
                                      updated[index].price = e.target.value;
                                      setManualItems(updated);
                                    }}
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <button 
                                    disabled={manualItems.length === 1}
                                    onClick={() => {
                                      setManualItems(manualItems.filter((_, i) => i !== index));
                                    }}
                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100 disabled:opacity-30 disabled:hover:bg-red-50 disabled:hover:text-red-500"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <Button
                        onClick={() => {
                          setManualItems([
                            ...manualItems,
                            { id: Date.now(), product_type_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
                          ]);
                        }}
                        className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 text-[#3a525d] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 border border-zinc-250"
                      >
                        <Plus size={14} strokeWidth={3} />
                        Add Product Item Line
                      </Button>
                    </div>
                  </>
                )}

                <div className="flex justify-between pt-6 border-t border-zinc-100">
                  <Button 
                    disabled={isAnalyzing}
                    variant="secondary" 
                    onClick={() => setCurrentStep(1)}
                    className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Back
                  </Button>
                  <Button
                    disabled={!hasMeasurements && !isManualItemsValid()}
                    onClick={() => setCurrentStep(3)}
                    className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
                  >
                    Expenses Setup <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: INTERACTIVE EXPENSES & COST SCALING */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="border-b border-zinc-100 pb-6">
                  <h3 className="text-2xl font-black italic text-[#3a525d]">Expenses & Sizing Compiler</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
                    Sizing multipliers scale fabric expenses automatically based on metrics
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product Type</label>
                    <Select 
                      options={productTypes.map(pt => ({ label: pt.name, value: String(pt.id) }))}
                      value={selectedProductTypeId}
                      onChange={setSelectedProductTypeId}
                      placeholder="Select Product..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Base Fabric Cost ($)</label>
                    <Input 
                      type="number"
                      placeholder="15.00"
                      value={baseFabricCost}
                      onChange={(e) => setBaseFabricCost(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Accessories Fee per Item ($)</label>
                    <Input 
                      type="number"
                      placeholder="3.00"
                      value={accCost}
                      onChange={(e) => setAccCost(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Labor Cost per Item ($)</label>
                    <Input 
                      type="number"
                      placeholder="8.50"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value)}
                    />
                  </div>
                </div>

                {/* COST SCALING ENGINE REPORT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* MULTIPLIER TABLE / MANUAL SUMMARY PANEL */}
                  {!hasMeasurements && (
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Manual Items Expenses Summary (Branch B)</h4>
                      <div className="border border-zinc-150 rounded-3xl overflow-hidden bg-white shadow-sm text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                              <th className="p-3">Product Type</th>
                              <th className="p-3">Fabric</th>
                              <th className="p-3 font-mono">SAM</th>
                              <th className="p-3 text-right">Quantity</th>
                              <th className="p-3 text-right">Unit Expense</th>
                              <th className="p-3 text-right">Total Expense</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                            {manualItems.map((item, index) => {
                              const pTypeName = productTypes.find(pt => String(pt.id) === String(item.product_type_id))?.name || 'Garment';
                              const fabricBrand = fabricsList.find(f => f.id === item.fabric_id)?.brand_name || 'Fabric';
                              const qty = parseInt(item.quantity) || 0;
                              const unitExpense = (parseFloat(baseFabricCost) || 0) + (parseFloat(accCost) || 0) + (parseFloat(laborCost) || 0);
                              return (
                                <tr key={item.id || index} className="hover:bg-zinc-50/50 bg-white">
                                  <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                                  <td className="p-3 text-zinc-400">{fabricBrand}</td>
                                  <td className="p-3 font-mono">{item.sam_value || '0'} min</td>
                                  <td className="p-3 text-right font-black text-zinc-800">{qty}</td>
                                  <td className="p-3 text-right font-mono">${unitExpense.toFixed(2)}</td>
                                  <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">${(unitExpense * qty).toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* INTERACTIVE DYNAMIC CARD */}
                  <Card className="p-8 border-2 border-dashed border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2rem] flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#2d8d9b]">
                        <Scale size={20} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Compiler Outputs</h4>
                      </div>
                      
                      <div className="space-y-3 divide-y divide-zinc-100 font-semibold text-sm">
                        <div className="flex justify-between py-2 text-zinc-500">
                          <span>Fabric Expense:</span>
                          <span className="font-mono text-zinc-800 font-black">${getCalculatedExpenses().fabric.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-zinc-500">
                          <span>Accessories Fee:</span>
                          <span className="font-mono text-zinc-800 font-black">${getCalculatedExpenses().accessories.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-zinc-500">
                          <span>Production Labor:</span>
                          <span className="font-mono text-zinc-800 font-black">${getCalculatedExpenses().labor.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200/50 pt-4 mt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60">Calculated Expenses</p>
                      <p className="text-4xl font-black italic tracking-tighter text-[#3a525d] font-mono mt-1">
                        ${getCalculatedExpenses().total.toFixed(2)}
                      </p>
                    </div>
                  </Card>
                </div>

                <div className="flex justify-between pt-6 border-t border-zinc-100">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(2)}
                    className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Back
                  </Button>
                  <Button
                    disabled={hasMeasurements ? !selectedProductTypeId : false}
                    onClick={() => setCurrentStep(4)}
                    className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
                  >
                    Timeline & Profit <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: TIMELINE, CAPACITY & PROFIT ANALYSIS */}
            {currentStep === 4 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="border-b border-zinc-100 pb-6">
                  <h3 className="text-2xl font-black italic text-[#3a525d]">Timeline & Profitability Compiler</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
                    Manage lead capacity schedules and define profit markups
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* TIMELINE SETTINGS */}
                  <div className="lg:col-span-2 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Labor Capacity Parameters</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {hasMeasurements ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Base Production Hours / Garment</label>
                            <Input 
                              type="number"
                              value={baseProductionHours}
                              onChange={(e) => setBaseProductionHours(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Customization Offset Hours (XL/XXL)</label>
                            <Input 
                              type="number"
                              value={extraCustomizationHours}
                              onChange={(e) => setExtraCustomizationHours(e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="md:col-span-2 bg-[#2d8d9b]/5 p-5 rounded-2xl border border-[#2d8d9b]/15 flex items-center gap-3 text-[#3a525d]">
                          <Clock size={20} className="text-[#2d8d9b] shrink-0" />
                          <div className="text-xs">
                            <p className="font-black">Garment Labor Hours Overridden (Branch B)</p>
                            <p className="font-semibold text-zinc-500 mt-0.5">Labor requirements are calculated dynamically from the exact SAM (Standard Allowed Minutes) values entered in Step 2. Base garment hour settings are not required.</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Available Tailoring Workforce (Staff count)</label>
                        <Input 
                          type="number"
                          value={tailorsCount}
                          onChange={(e) => setTailorsCount(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Daily Work Shift Hours</label>
                        <Input 
                          type="number"
                          value={dailyShiftHours}
                          onChange={(e) => setDailyShiftHours(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Project Launch Start Date</label>
                        <Input 
                          type="date"
                          value={projectStartDate}
                          onChange={(e) => setProjectStartDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Expected Delivery Target Date</label>
                        <Input 
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] flex justify-between">
                        <span>Target Profit Markup Margin (%)</span>
                        <span className="font-black text-[#2d8d9b] font-mono text-sm">{profitMargin}%</span>
                      </label>
                      <input 
                        type="range"
                        min="5"
                        max="80"
                        value={profitMargin}
                        onChange={(e) => setProfitMargin(e.target.value)}
                        className="w-full accent-[#2d8d9b] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* LIVE TIMELINE REPORT CARD */}
                  <Card className="p-8 border border-zinc-100 bg-zinc-50/50 rounded-[2.5rem] flex flex-col justify-between">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-[#3a525d] border-b border-zinc-200 pb-4">
                        <Clock size={20} />
                        <h4 className="text-xs font-black uppercase tracking-widest">Time & Yield Estimates</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <Clock size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#3a525d]">{getCalculatedTimeMetrics().totalHours} Hours</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total Estimated Time</p>
                            {hasMeasurements && (
                              <p className="text-[9px] font-mono text-zinc-400 mt-0.5">
                                = {orgAnalysis.total_entities} entities &times; {parseFloat(baseProductionHours) || 0} hrs/garment
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#3a525d]">{getCalculatedTimeMetrics().workingDays} Working Days</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Production Days Estimate</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-green-600">
                              {deliveryDate ? new Date(deliveryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Expected Delivery Date</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-zinc-200/60 pt-4 space-y-2 text-xs font-bold text-zinc-500">
                        <div className="flex justify-between">
                          <span>Expenses:</span>
                          <span className="font-mono text-[#3a525d]">${getCalculatedQuoteTotals().expenses.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Markup Profit:</span>
                          <span className="font-mono text-green-600">+${getCalculatedQuoteTotals().profit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#2d8d9b] font-black">
                          <span>Suggested Retail / Item:</span>
                          <span className="font-mono">${getCalculatedQuoteTotals().avgSellingPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 pt-4 mt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Contract Value</p>
                      <p className="text-4xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-1">
                        ${getCalculatedQuoteTotals().finalValue.toFixed(2)}
                      </p>
                    </div>
                  </Card>
                </div>

                <div className="flex justify-between pt-6 border-t border-zinc-100">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(3)}
                    className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(5)}
                    className="h-16 px-10 bg-[#3a525d] hover:bg-[#2d8d9b] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3"
                  >
                    Compile Proposal & Review <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: COMPILE PROPOSAL & FINAL REVIEW */}
            {currentStep === 5 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="border-b border-zinc-100 pb-6">
                  <h3 className="text-2xl font-black italic text-[#3a525d]">Quotation Contract Proposal Review</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] mt-1 opacity-70">
                    Verify compliance, delivery, and pricing values before submission
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* QUOTE SUMMARY SUMMARY */}
                  <div className="md:col-span-2 space-y-6">
                    <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">Contract Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-zinc-500">
                        <div>
                          <p className="text-[9px] uppercase text-zinc-400">Proposal Title</p>
                          <p className="text-sm font-black text-[#3a525d] mt-1">{quoteTitle}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-zinc-400">Customer Organization</p>
                          <p className="text-sm font-black text-[#3a525d] mt-1">
                            {organizations.find(o => String(o.id) === String(selectedOrgId))?.name || 'Customer'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-zinc-400">Contract Number</p>
                          <p className="text-sm font-black text-[#3a525d] mt-1">{quoteNo || 'Auto Generated'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-zinc-400">Product Model</p>
                          <p className="text-sm font-black text-[#3a525d] mt-1">
                            {hasMeasurements 
                              ? (productTypes.find(p => String(p.id) === String(selectedProductTypeId))?.name || 'Uniform Item')
                              : 'Multiple Manual Garment Lines'
                            }
                          </p>
                        </div>
                      </div>
                    </Card>

                    {hasMeasurements ? (
                      <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">Sizing Breakdown summary</h4>
                        <div className="flex gap-2 flex-wrap">
                          {Object.keys(orgAnalysis.size_distribution).map(size => (
                            <div key={size} className="bg-zinc-50 border border-zinc-150 px-3.5 py-2 rounded-xl text-xs font-bold text-[#3a525d]">
                              <strong>{size}</strong>: {orgAnalysis.size_distribution[size]} Units
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-8 border border-zinc-100 rounded-3xl space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100 pb-2">Product Items Details</h4>
                        <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-150">
                                <th className="p-3">Product Type</th>
                                <th className="p-3">Fabric Option</th>
                                <th className="p-3 font-mono">SAM</th>
                                <th className="p-3">Design Number</th>
                                <th className="p-3 text-right">Quantity</th>
                                <th className="p-3 text-right">Unit Price</th>
                                <th className="p-3 text-right">Total Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                              {manualItems.map((item, idx) => {
                                const pTypeName = productTypes.find(pt => String(pt.id) === String(item.product_type_id))?.name || 'Unknown';
                                const fabricName = fabricsList.find(f => f.id === item.fabric_id)?.brand_name || 'Custom';
                                return (
                                  <tr key={item.id || idx} className="hover:bg-zinc-50/50 bg-white">
                                    <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                                    <td className="p-3 text-zinc-500">{fabricName}</td>
                                    <td className="p-3 font-mono">{item.sam_value} min</td>
                                    <td className="p-3">{item.design_number || 'N/A'}</td>
                                    <td className="p-3 text-right font-black">{item.quantity}</td>
                                    <td className="p-3 text-right font-mono">${parseFloat(item.price || '0').toFixed(2)}</td>
                                    <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">
                                      ${((parseInt(item.quantity) || 0) * (parseFloat(item.price || '0'))).toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* REVENUE MATRIX */}
                  <Card className="p-8 border border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2.5rem] space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#2d8d9b] border-b border-[#2d8d9b]/10 pb-4">Financial Summary</h4>
                    
                    <div className="space-y-4 text-sm font-semibold text-zinc-600">
                      <div className="flex justify-between">
                        <span>Total Items count:</span>
                        <span className="font-black text-[#3a525d]">{orgAnalysis.total_entities} Units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Production Expenses:</span>
                        <span className="font-mono text-zinc-800 font-black">${getCalculatedExpenses().total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Markup Margin %:</span>
                        <span className="font-black text-green-600 font-mono">+{profitMargin}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Suggested unit retail:</span>
                        <span className="font-mono">${getCalculatedQuoteTotals().avgSellingPrice.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t border-zinc-200 pt-4 flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Quotation value</p>
                          <p className="text-3xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-0.5">
                            ${getCalculatedQuoteTotals().finalValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {orgAnalysis.missing_count > 0 && (
                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex gap-3 text-xs font-bold text-amber-700">
                    <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                    <p>
                      <strong>Compliance Notice:</strong> Saving this contract with {orgAnalysis.missing_count} missing measurements will proceed using standard average sizes (M) for manufacturing price forecasts.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t border-zinc-100">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentStep(4)}
                    className="h-16 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSaveQuotation}
                    className="h-16 px-12 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl shadow-green-600/20"
                  >
                    ✅ Complete & Register Quotation
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 3. QUOTATION DETAILED VIEW TAB */}
      {activeTab === 'details' && selectedQuotation && (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
          
          <Card className="p-10 border border-zinc-100 rounded-[3rem] shadow-2xl space-y-8 bg-white">
            
            {/* OVERVIEW PANEL HEADER */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-6 flex-wrap gap-4">
              <div>
                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#2d8d9b]/5 text-[#2d8d9b] border border-[#2d8d9b]/10 tracking-widest">
                  {selectedQuotation.quotation_no}
                </span>
                <h3 className="text-3xl font-black italic tracking-tighter text-[#3a525d] mt-2">{selectedQuotation.title}</h3>
                <p className="text-xs font-bold text-zinc-400 mt-1">Registered: {new Date(selectedQuotation.created_at).toLocaleDateString()}</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-4 py-2 rounded-2xl bg-zinc-50 border border-zinc-100 text-sm font-black text-[#3a525d]">
                  Status: <strong className="text-[#2d8d9b] uppercase">{selectedQuotation.status}</strong>
                </span>
              </div>
            </div>

            {/* TWO COLUMN DETAILS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* PRIMARY VARIABLES */}
              <div className="md:col-span-2 space-y-6">
                
                {/* CORE SPECS CARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Customer Client</p>
                    <p className="text-base font-black text-[#3a525d] mt-1">{selectedQuotation.organizations?.name || 'Customer'}</p>
                  </Card>

                  <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Target Product</p>
                    <p className="text-base font-black text-[#3a525d] mt-1">
                      {selectedQuotation.items && selectedQuotation.items.some((item: any) => item.size_breakdown?.is_manual)
                        ? 'Multiple Manual Garment Lines'
                        : ((selectedQuotation as any).items?.[0]?.product_types?.name || 'Uniform item')
                      }
                    </p>
                  </Card>

                  <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Production Time</p>
                    <p className="text-base font-black text-[#3a525d] mt-1">{selectedQuotation.total_estimated_time || 'N/A'}</p>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">({selectedQuotation.production_days_estimate} Production Days)</p>
                  </Card>

                  <Card className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expected Delivery Schedule</p>
                    <p className="text-base font-black text-[#2d8d9b] mt-1">
                      {selectedQuotation.expected_delivery_date 
                        ? new Date(selectedQuotation.expected_delivery_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) 
                        : 'N/A'}
                    </p>
                  </Card>
                </div>

                {/* PRODUCT ITEMS TABLE (FOR MANUAL MODE) OR SIZING MAP */}
                {selectedQuotation.items && selectedQuotation.items.some((item: any) => item.size_breakdown?.is_manual) ? (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Product Lines Breakdown</h4>
                    <div className="border border-zinc-150 rounded-2xl overflow-hidden text-xs bg-white shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-[#3a525d] border-b border-zinc-100">
                            <th className="p-3">Product Type</th>
                            <th className="p-3">Fabric Options</th>
                            <th className="p-3">SAM Value</th>
                            <th className="p-3">Design Number</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-semibold text-zinc-600">
                          {selectedQuotation.items.map((item: any, idx: number) => {
                            const pTypeName = item.product_types?.name || 'Uniform Item';
                            const fabricId = item.size_breakdown?.fabric_id;
                            const fabricBrand = fabricsList.find(f => f.id === fabricId)?.brand_name || 'Custom Fabric';
                            return (
                              <tr key={item.id || idx}>
                                <td className="p-3 font-black text-[#3a525d]">{pTypeName}</td>
                                <td className="p-3 text-zinc-500">{fabricBrand}</td>
                                <td className="p-3 font-mono">{item.size_breakdown?.sam_value || 'N/A'} min</td>
                                <td className="p-3">{item.size_breakdown?.design_number || 'N/A'}</td>
                                <td className="p-3 text-right font-black">{item.quantity}</td>
                                <td className="p-3 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                                <td className="p-3 text-right font-black text-[#2d8d9b] font-mono">${Number(item.total_price).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#3a525d]">Sizing Aggregation Details</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedQuotation.metrics_summary?.sizes && Object.keys(selectedQuotation.metrics_summary.sizes).map(sz => (
                        <div key={sz} className="bg-zinc-50 border border-zinc-150 px-4 py-2.5 rounded-xl text-xs font-bold text-[#3a525d]">
                          <strong>{sz}</strong>: {selectedQuotation.metrics_summary.sizes?.[sz] || 0} Units
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* REVENUE STATISTICS CARD */}
              <Card className="p-8 border border-[#2d8d9b]/20 bg-[#2d8d9b]/5 rounded-[2.5rem] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#3a525d]">
                    <Scale size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">Financial Audit</h4>
                  </div>

                  <div className="space-y-3 divide-y divide-zinc-200/50 text-sm font-semibold">
                    <div className="flex justify-between py-2 text-zinc-500">
                      <span>Total Entities Quantity:</span>
                      <span className="text-[#3a525d] font-black">{selectedQuotation.metrics_summary?.total_entities || 0} Items</span>
                    </div>
                    <div className="flex justify-between py-2 text-zinc-500">
                      <span>Accumulated Expenses:</span>
                      <span className="font-mono text-[#3a525d]">${Number(selectedQuotation.estimated_expenses).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-zinc-500">
                      <span>Profit Markup Margin:</span>
                      <span className="font-mono text-green-600">+{selectedQuotation.profit_margin_percent}%</span>
                    </div>
                    <div className="flex justify-between py-2 text-zinc-500">
                      <span>Suggested Retail/Item:</span>
                      <span className="font-mono text-[#2d8d9b] font-black">
                        ${(Number(selectedQuotation.final_quote_value) / (selectedQuotation.metrics_summary?.total_entities || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-4 mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d8d9b] opacity-60 font-black">Formal Quotation Price</p>
                  <p className="text-4xl font-black italic tracking-tighter text-[#2d8d9b] font-mono mt-1">
                    ${Number(selectedQuotation.final_quote_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* CONFIRMATION FOR DELETION */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Remove Formal Quotation"
        message="Are you sure you want to permanently delete this quotation proposal? This operation is irreversible."
        onConfirm={handleDeleteQuotation}
        onCancel={() => setDeleteCandidate(null)}
        confirmLabel="Yes, Delete Proposal"
        variant="danger"
      />
    </div>
  );
}
