'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Organization, ProductType, Quotation } from '../page';

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
  sam_value: string;
  design_number: string;
  quantity: string;
  price: string;
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
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function QuotationWizard({
  editingQuotationId,
  organizations,
  productTypes,
  fabricsList,
  allProducts,
  onClose,
  onSaveSuccess,
}: QuotationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteNo, setQuoteNo] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [gstPercent, setGstPercent] = useState('18');

  // Dynamic Branching & Manual Data states
  const [hasMeasurements, setHasMeasurements] = useState(false);
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    { id: Date.now(), product_type_id: '', product_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
  ]);
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

  // Profit variables
  const [profitMargin, setProfitMargin] = useState('30');

  // If in edit mode, fetch detailed quotation data and initialize state
  useEffect(() => {
    if (!editingQuotationId) {
      resetWizard();
      return;
    }

    const loadQuotationForEditing = async () => {
      setIsInitializingEdit(true);
      try {
        const res = await api.get(`/quotations/${editingQuotationId}`);
        const fullQuote = res.data;

        setQuoteTitle(fullQuote.title);
        setQuoteNo(fullQuote.quotation_no || '');
        setSelectedOrgId(String(fullQuote.organization_id));
        setDeliveryDate(fullQuote.expected_delivery_date ? new Date(fullQuote.expected_delivery_date).toISOString().split('T')[0] : '');
        setProfitMargin(String(fullQuote.profit_margin_percent));
        setCoverLetter(fullQuote.metrics_summary?.cover_letter || '');
        setGstPercent(String(fullQuote.metrics_summary?.gst_percent ?? '18'));

        const firstItem = fullQuote.items?.[0];
        if (firstItem) {
          setBaseFabricCost(String(firstItem.fabric_cost_per_item || '15.00'));
          setAccCost(String(firstItem.accessories_cost_per_item || '3.00'));
          setLaborCost(String(firstItem.labor_cost_per_item || '8.50'));
        }

        const hasManual = fullQuote.items?.some((it: any) => it.size_breakdown?.is_manual === true);

        if (hasManual) {
          setHasMeasurements(false);
          setManualItems(fullQuote.items.map((item: any) => ({
            id: item.id || Date.now() + Math.random(),
            product_type_id: String(item.product_type_id),
            product_id: String(item.size_breakdown?.product_id || ''),
            fabric_id: String(item.size_breakdown?.fabric_id || ''),
            sam_value: String(item.size_breakdown?.sam_value || ''),
            design_number: String(item.size_breakdown?.design_number || ''),
            quantity: String(item.quantity),
            price: String(item.unit_price)
          })));
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
      }
    };

    loadQuotationForEditing();
  }, [editingQuotationId]);

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
          { id: Date.now(), product_type_id: '', product_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
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
      // Calculate from manual entry inputs
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

    let preTaxSubtotal = 0;
    let qty = 0;

    if (hasMeasurements) {
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
            is_manual: true,
            product_id: item.product_id || null
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
        sizes: hasMeasurements ? orgAnalysis.size_distribution : {},
        cover_letter: coverLetter,
        gst_percent: parseFloat(gstPercent) || 0,
        pre_tax_subtotal: totals.subtotal
      },
      items: payloadItems
    };

    const loadingToast = toast.loading(editingQuotationId ? 'Updating Formal Quotation...' : 'Compiling and saving Formal Quotation...');
    try {
      if (editingQuotationId) {
        // Find existing status so we don't break validation
        const resList = await api.get('/quotations');
        const originalStatus = resList.data?.find((q: any) => q.id === editingQuotationId)?.status || 'Pending';
        const updatedStatus = originalStatus === 'Rejected' ? 'Pending' : originalStatus;
        await api.put(`/quotations/${editingQuotationId}`, {
          ...payload,
          status: updatedStatus
        });
        toast.success('Formal Quotation updated successfully!', { id: loadingToast });
      } else {
        await api.post('/quotations', payload);
        toast.success('Formal Quotation compiled and saved to registry!', { id: loadingToast });
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

Thank you for giving Inland Uniforms the opportunity to submit our proposal for the "${contractTitle}".

We are pleased to present our comprehensive uniform solutions tailored specifically for your organization. Based on our sizing audit and detailed requirements analysis, we have compiled an optimized production schedule and cost estimate to ensure maximum comfort, perfect fit compliance, and durability.

Please find the detailed sizing breakdown and cost compilation in the attached table. We look forward to partnering with your organization to deliver top-tier corporate garments that embody your brand's identity.

Should you have any questions or require custom modifications to this proposal, please do not hesitate to reach out to our team.

Sincerely,

Operations & Accounts Team
Inland Uniforms Co.`;
    setCoverLetter(template);
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
      { id: Date.now(), product_type_id: '', product_id: '', fabric_id: '', sam_value: '', design_number: '', quantity: '1', price: '' }
    ]);
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
            isAnalyzing={isAnalyzing}
            onNext={() => setCurrentStep(2)}
            generateAutoCoverLetter={generateAutoCoverLetter}
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
            productTypes={productTypes}
            allProducts={allProducts}
            fabricsList={fabricsList}
            isAnalyzing={isAnalyzing}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
            isManualItemsValid={isManualItemsValid}
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
            manualItems={manualItems}
            fabricsList={fabricsList}
            calculatedExpenses={getCalculatedExpenses()}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
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
            tailorsCount={tailorsCount}
            setTailorsCount={setTailorsCount}
            dailyShiftHours={dailyShiftHours}
            setDailyShiftHours={setDailyShiftHours}
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
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
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
            fabricsList={fabricsList}
            profitMargin={profitMargin}
            calculatedExpenses={getCalculatedExpenses()}
            quoteTotals={getCalculatedQuoteTotals()}
            gstPercent={gstPercent}
            editingQuotationId={editingQuotationId}
            onBack={() => setCurrentStep(4)}
            onSave={handleSaveQuotation}
          />
        )}
      </Card>
    </div>
  );
}
