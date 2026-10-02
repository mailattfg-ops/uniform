'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Ruler, GripVertical, AlertTriangle, Tag, Layers, Check, Pencil, Info, X } from 'lucide-react';
import api from '@/lib/api';
import toast from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ProductType {
  id: number;
  name: string;
}

interface MeasurementField {
  id: number;
  label: string;
  unit: string;
  display_order: number;
  is_required: boolean;
  product_type_id?: number | null;
  product_types?: { id: number; name: string } | null;
  description?: string | null;
}

export default function MeasuresArchitectPage() {
  const [fields, setFields] = useState<MeasurementField[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  
  // New Metric Form State
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('Inches');
  const [newFieldProductType, setNewFieldProductType] = useState<string>('');
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldDescription, setNewFieldDescription] = useState('');

  // Edit Metric Modal State
  const [editingField, setEditingField] = useState<MeasurementField | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUnit, setEditUnit] = useState('Inches');
  const [editProductType, setEditProductType] = useState<string>('');
  const [editRequired, setEditRequired] = useState(true);
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, typesRes] = await Promise.all([
        api.get('/measurements/config'),
        api.get('/product-types').catch(() => ({ data: [] }))
      ]);

      setFields((configRes.data || []).sort((a: any, b: any) => a.display_order - b.display_order));
      setProductTypes(typesRes.data || []);
    } catch {
      toast.error('Failed to load measures registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync new metric product type with active tab selection
  useEffect(() => {
    if (selectedProductType === 'all' || selectedProductType === 'universal') {
      setNewFieldProductType('');
    } else {
      setNewFieldProductType(selectedProductType);
    }
  }, [selectedProductType]);

  // Filtered fields based on active tab
  const filteredFields = useMemo(() => {
    if (selectedProductType === 'all') return fields;
    if (selectedProductType === 'universal') return fields.filter(f => !f.product_type_id);
    return fields.filter(f => String(f.product_type_id) === String(selectedProductType));
  }, [fields, selectedProductType]);

  const handleOpenEdit = (field: MeasurementField) => {
    setEditingField(field);
    setEditLabel(field.label);
    setEditUnit(field.unit || 'Inches');
    setEditProductType(field.product_type_id ? String(field.product_type_id) : '');
    setEditRequired(field.is_required);
    setEditDescription(field.description || '');
  };

  const handleUpdateField = async () => {
    if (!editingField) return;
    const trimmedLabel = editLabel.trim();
    if (!trimmedLabel) {
      toast.error('Label cannot be empty');
      return;
    }

    setIsUpdating(true);
    try {
      const targetTypeId = editProductType ? parseInt(editProductType) : null;
      const payload = {
        label: trimmedLabel,
        unit: editUnit || 'Inches',
        is_required: editRequired,
        product_type_id: targetTypeId,
        description: editDescription.trim() || null
      };

      const res = await api.put(`/measurements/config/${editingField.id}`, payload);
      setFields(prev => prev.map(f => f.id === editingField.id ? { ...f, ...res.data, description: payload.description } : f));
      setEditingField(null);
      toast.success('Metric updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update metric');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddField = async () => {
    const trimmedName = newFieldName.trim();
    if (!trimmedName) return;

    if (trimmedName.length < 2) {
      toast.error('Label Name must be at least 2 characters');
      return;
    }

    if (!/^[a-zA-Z0-9\s\-\.\/]+$/.test(trimmedName)) {
      toast.error('Label Name contains invalid characters');
      return;
    }

    // Check duplicate within the same product type scope
    const targetTypeId = newFieldProductType ? parseInt(newFieldProductType) : null;
    const isDuplicate = fields.some(f => {
      const sameName = f.label.toLowerCase() === trimmedName.toLowerCase();
      const sameType = (f.product_type_id || null) === targetTypeId;
      return sameName && sameType;
    });

    if (isDuplicate) {
      const typeName = productTypes.find(t => t.id === targetTypeId)?.name || 'Universal';
      toast.error(`A metric named "${trimmedName}" already exists for ${typeName}`);
      return;
    }

    setIsSaving(true);
    try {
      const newField = {
        label: trimmedName,
        unit: newFieldUnit || 'Inches',
        display_order: fields.length + 1,
        is_required: newFieldRequired,
        product_type_id: targetTypeId,
        description: newFieldDescription.trim() || null
      };

      await api.post('/measurements/config', newField);
      setNewFieldName('');
      setNewFieldDescription('');
      fetchData();
      toast.success('Metric added to measures registry');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add metric');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteField = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/measurements/config/${deletingId}`);
      setFields(fields.filter(f => f.id !== deletingId));
      toast.success('Metric removed');
    } catch {
      toast.error('Cannot delete: This metric might be in use by existing records.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-[#2d8d9b]/10 border-t-[#2d8d9b] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-[#3a525d]">Measures Architect</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2d8d9b] mt-1 opacity-70">
            Master Measurement Registry &bull; Scoped by Garment Product Type
          </p>
        </div>
      </div>

      {/* Product Type Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedProductType('all')}
          className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            selectedProductType === 'all'
              ? 'bg-[#3a525d] text-white shadow-lg shadow-[#3a525d]/20 ring-2 ring-[#3a525d]/30'
              : 'bg-white text-zinc-500 border border-zinc-200 hover:border-[#2d8d9b]/50 hover:bg-zinc-50'
          }`}
        >
          <Layers size={13} />
          All Metrics ({fields.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedProductType('universal')}
          className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
            selectedProductType === 'universal'
              ? 'bg-[#2d8d9b] text-white shadow-lg shadow-[#2d8d9b]/20 ring-2 ring-[#2d8d9b]/30'
              : 'bg-white text-zinc-500 border border-zinc-200 hover:border-[#2d8d9b]/50 hover:bg-zinc-50'
          }`}
        >
          <Ruler size={13} />
          Universal ({fields.filter(f => !f.product_type_id).length})
        </button>

        {productTypes.map((pt) => {
          const count = fields.filter(f => f.product_type_id === pt.id).length;
          const isActive = String(selectedProductType) === String(pt.id);

          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => setSelectedProductType(String(pt.id))}
              className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-[#2d8d9b] text-white shadow-lg shadow-[#2d8d9b]/20 ring-2 ring-[#2d8d9b]/30'
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:border-[#2d8d9b]/50 hover:bg-zinc-50'
              }`}
            >
              <Tag size={12} />
              {pt.name} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* ADD NEW METRIC CARD */}
        <div className="lg:col-span-1">
          <Card className="p-8 border-none bg-[#3a525d] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-2xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg italic tracking-tighter">Define Metric</h3>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                    Scoped to Product Type
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-2 block">
                    Product Type
                  </label>
                  <Select
                    name="metric_product_type"
                    options={[
                      { label: 'Universal / All Garments', value: '' },
                      ...productTypes.map(t => ({ label: t.name, value: t.id.toString() }))
                    ]}
                    value={newFieldProductType}
                    onChange={(val) => setNewFieldProductType(val)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-2 block">
                    Metric Name
                  </label>
                  <Input 
                    placeholder="e.g. Length, Chest, Waist, Inseam..." 
                    value={newFieldName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 30 && /^[a-zA-Z0-9\s\-\.\/]*$/.test(val)) {
                        setNewFieldName(val);
                      }
                    }}
                    maxLength={30}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-2 block">
                    Unit of Measure
                  </label>
                  <Input 
                    placeholder="e.g. Inches or cm" 
                    value={newFieldUnit}
                    onChange={(e) => setNewFieldUnit(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-2 block">
                    Measuring Guide / Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. From top waistband along outer leg seam down to shoe top..."
                    value={newFieldDescription}
                    onChange={(e) => setNewFieldDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f2994a] transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
                    Mandatory in Sizing Form
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewFieldRequired(!newFieldRequired)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      newFieldRequired ? 'bg-emerald-400 text-white' : 'bg-white/20 text-transparent'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                </div>

                <Button 
                  onClick={handleAddField}
                  disabled={!newFieldName || isSaving}
                  isLoading={isSaving}
                  className="w-full h-14 rounded-2xl bg-[#f2994a] hover:bg-[#d4813a] text-white font-black uppercase text-[10px] tracking-widest shadow-lg border-none transition-all mt-4"
                >
                  Save Metric To Registry
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-6 p-5 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-start gap-3">
            <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <p className="text-[10px] font-bold text-blue-900 leading-relaxed uppercase tracking-tight">
              Metrics with the same name (like &quot;Length&quot;) can now be defined separately for each product type (e.g. Shirt Length vs. Trouser Length) with distinct measuring guides.
            </p>
          </div>
        </div>

        {/* METRICS LIST FOR SELECTED TAB */}
        <div className="lg:col-span-2 space-y-4">
          <div className="px-6 py-2.5 bg-zinc-50 rounded-2xl inline-flex items-center gap-2 border border-zinc-200/80 mb-2">
            <Ruler size={13} className="text-[#2d8d9b]" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Showing {filteredFields.length} of {fields.length} Configured Metrics
            </span>
          </div>

          <div className="space-y-3">
            {filteredFields.map((field) => {
              const matchedType = field.product_types || productTypes.find(pt => pt.id === field.product_type_id);

              return (
                <Card key={field.id} className="p-6 border border-zinc-100 shadow-lg hover:shadow-xl transition-all group bg-white rounded-3xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-[#2d8d9b] group-hover:bg-[#2d8d9b]/5 transition-all shrink-0 mt-1">
                        <GripVertical size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h4 className="text-lg font-black italic tracking-tight text-[#3a525d] group-hover:text-[#2d8d9b] transition-colors">
                            {field.label}
                          </h4>
                          {matchedType ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                              {matchedType.name}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200">
                              Universal
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">
                          Unit: {field.unit || 'Inches'}
                        </p>

                        {field.description && (
                          <div className="mt-3 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 flex items-start gap-2.5 text-zinc-600 text-xs">
                            <Info size={14} className="text-[#2d8d9b] shrink-0 mt-0.5" />
                            <p className="leading-relaxed font-medium">{field.description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        field.is_required 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-zinc-50 text-zinc-400 border-zinc-100'
                      }`}>
                        {field.is_required ? 'Mandatory' : 'Optional'}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(field)}
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-[#2d8d9b] hover:bg-[#2d8d9b]/10 transition-colors"
                        title="Edit Metric & Description"
                      >
                        <Pencil size={16} />
                      </button>

                      <Button
                        onClick={() => setDeletingId(field.id)}
                        variant="secondary"
                        className="p-2.5 text-zinc-300 hover:text-red-500 transition-colors bg-transparent border-none shadow-none"
                        title="Delete Metric"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredFields.length === 0 && (
              <div className="py-20 text-center space-y-2 bg-zinc-50/50 rounded-3xl border border-dashed border-zinc-200 p-8">
                <Tag size={32} className="mx-auto text-zinc-300" />
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  No metrics configured for this selection yet
                </p>
                <p className="text-[11px] text-zinc-400 font-bold">
                  Use the &quot;Define Metric&quot; panel on the left to add standard points of measure.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deletingId}
        title="Remove Measurement Metric?"
        message="Are you sure you want to remove this metric from your registry? Historical records will not be affected, but it will be hidden from new sizing entries."
        confirmLabel="Permanently Delete"
        cancelLabel="Keep Metric"
        variant="danger"
        onConfirm={handleDeleteField}
        onCancel={() => setDeletingId(null)}
      />

      {/* EDIT METRIC MODAL */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-7 max-w-lg w-full shadow-2xl border border-zinc-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2d8d9b]/10 flex items-center justify-center text-[#2d8d9b]">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#3a525d]">Edit Metric &amp; Guide</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Update metric specifications &amp; instructions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5 block">
                  Product Type Scope
                </label>
                <Select
                  name="edit_product_type"
                  options={[
                    { label: 'Universal / All Garments', value: '' },
                    ...productTypes.map(t => ({ label: t.name, value: t.id.toString() }))
                  ]}
                  value={editProductType}
                  onChange={(val) => setEditProductType(val)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5 block">
                    Metric Name
                  </label>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="e.g. Length, Waist..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5 block">
                    Unit of Measure
                  </label>
                  <Input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="e.g. Inches or cm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3a525d] mb-1.5 block">
                  Measuring Guide / Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. From top waistband along outer leg seam down to ankle/shoe top..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#2d8d9b]/20 focus:border-[#2d8d9b] transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#3a525d]">
                  Mandatory in Sizing Form
                </span>
                <button
                  type="button"
                  onClick={() => setEditRequired(!editRequired)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    editRequired ? 'bg-emerald-500 text-white' : 'bg-zinc-200 text-transparent'
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <Button
                variant="secondary"
                onClick={() => setEditingField(null)}
                className="h-11 px-5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateField}
                isLoading={isUpdating}
                className="h-11 px-6 rounded-xl bg-[#2d8d9b] hover:bg-[#236f7a] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#2d8d9b]/20"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
