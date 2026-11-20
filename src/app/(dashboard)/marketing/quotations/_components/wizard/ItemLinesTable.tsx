'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Shirt, Layers, Package, ChevronDown, Sparkles } from 'lucide-react';
import type { ItemKind, ManualItem } from '../../page';
import { ITEM_KIND_LABELS, getItemKind, lineAmount } from '../../_lib/itemLines';

export interface ItemLineView {
  item: ManualItem;
  index: number; // index in the underlying manualItems array
  title: string;
  subtitle?: string;
}

interface ItemLinesTableProps {
  lines: ItemLineView[];
  onAdd: (kind: ItemKind) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onChangeQty: (index: number, value: string) => void;
  onChangeRate: (index: number, value: string) => void;
  onChangeName?: (index: number, value: string) => void;
  onAddCustom?: (item: { name: string; quantity: string; price: string }) => void;
}

const KIND_OPTIONS: { kind: ItemKind; label: string; hint: string; icon: React.ReactNode }[] = [
  { kind: 'CUSTOM', label: 'Custom Item', hint: 'Direct item, qty & rate entry', icon: <Sparkles size={14} /> },
  { kind: 'READYMADE', label: 'Readymades', hint: 'In-house garments: fabric, trims & SAM', icon: <Shirt size={14} /> },
  { kind: 'FABRIC', label: 'Fabrics', hint: 'Fabric by the meter', icon: <Layers size={14} /> },
  { kind: 'ACCESSORY', label: 'Accessories', hint: 'Accessories & trade readymades', icon: <Package size={14} /> },
];

const KIND_BADGE: Record<ItemKind, string> = {
  CUSTOM: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  READYMADE: 'bg-[#FFF1F1] text-[#C82A2B] border-[#C82A2B]/20',
  FABRIC: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCESSORY: 'bg-amber-50 text-amber-700 border-amber-200',
};

const cellInput = 'w-full px-2.5 py-1.5 text-xs font-bold font-mono border border-zinc-200 rounded-lg text-zinc-900 text-right focus:outline-none focus:border-[#C82A2B] focus:ring-1 focus:ring-[#C82A2B]/20 bg-white';

export default function ItemLinesTable({
  lines,
  onAdd,
  onEdit,
  onDelete,
  onChangeQty,
  onChangeRate,
  onChangeName,
  onAddCustom
}: ItemLinesTableProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fast entry inputs for custom quotation (Sl No, Item, qty, rate, amount)
  const [customItem, setCustomItem] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customRate, setCustomRate] = useState('');
  const itemInputRef = useRef<HTMLInputElement>(null);

  const parsedQty = parseFloat(customQty) || 0;
  const parsedRate = parseFloat(customRate) || 0;
  const computedTotal = parsedQty * parsedRate;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customItem.trim()) return;
    if (!(parsedQty > 0)) return;
    if (customRate === '' || isNaN(parsedRate) || parsedRate < 0) return;

    if (onAddCustom) {
      onAddCustom({
        name: customItem.trim(),
        quantity: customQty,
        price: customRate
      });
      setCustomItem('');
      setCustomQty('1');
      setCustomRate('');
      itemInputRef.current?.focus();
    }
  };

  const grandTotal = lines.reduce((sum, l) => sum + lineAmount(l.item), 0);

  return (
    <div className="space-y-4">
      {/* CUSTOM QUOTATION INPUT CARD */}
      <div className="bg-gradient-to-r from-zinc-50 via-white to-zinc-50 border-2 border-zinc-200 hover:border-[#C82A2B]/40 rounded-2xl p-5 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C82A2B] animate-pulse" />
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Custom Quotation Input
            </h4>
            <span className="text-[10px] font-bold text-zinc-400">
              (Sl No is assigned automatically · Enter Item, Qty, Rate to compute Total Amount)
            </span>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="h-9 px-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold uppercase tracking-wider text-[10px] flex items-center gap-2 border border-zinc-200 transition-all"
            >
              <Plus size={13} strokeWidth={2.5} /> Add Catalog Line <ChevronDown size={12} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                {KIND_OPTIONS.map(opt => (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (opt.kind === 'CUSTOM') {
                        itemInputRef.current?.focus();
                      } else {
                        onAdd(opt.kind);
                      }
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-[#FFF1F1] flex items-start gap-3 transition-colors border-b border-zinc-100 last:border-b-0"
                  >
                    <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${KIND_BADGE[opt.kind]}`}>{opt.icon}</span>
                    <span>
                      <span className="block text-xs font-black text-zinc-900">{opt.label}</span>
                      <span className="block text-[10px] font-semibold text-zinc-400">{opt.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleAddCustom} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Sl No (comes automatically) */}
          <div className="sm:col-span-1 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block text-center">
              Sl No
            </label>
            <div className="h-11 flex items-center justify-center font-mono font-black text-xs bg-zinc-100 text-zinc-700 rounded-xl border border-zinc-200 select-none">
              #{lines.length + 1}
            </div>
          </div>

          {/* Item */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">
              Item
            </label>
            <input
              ref={itemInputRef}
              type="text"
              placeholder="Enter item name / description (e.g. Formal Blazer, Custom Shirt...)"
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              className="h-11 w-full px-3.5 text-xs font-bold border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/20 bg-white"
            />
          </div>

          {/* Qty */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block text-right">
              Qty
            </label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Qty"
              value={customQty}
              onChange={(e) => setCustomQty(e.target.value)}
              className="h-11 w-full px-3 text-xs font-mono font-bold border border-zinc-200 rounded-xl text-zinc-900 text-right focus:outline-none focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/20 bg-white"
            />
          </div>

          {/* Rate */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block text-right">
              Rate (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              className="h-11 w-full px-3 text-xs font-mono font-bold border border-zinc-200 rounded-xl text-zinc-900 text-right focus:outline-none focus:border-[#C82A2B] focus:ring-2 focus:ring-[#C82A2B]/20 bg-white"
            />
          </div>

          {/* Amount (Total) */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-[#C82A2B] block text-right">
              Amount (Total)
            </label>
            <div className="h-11 px-3 flex items-center justify-end font-mono font-black text-xs text-[#C82A2B] bg-[#FFF1F1] rounded-xl border border-[#C82A2B]/20">
              ₹{computedTotal.toFixed(2)}
            </div>
          </div>

          <div className="sm:col-span-12 flex justify-between items-center pt-1">
            <span className="text-[10px] text-zinc-400 font-semibold">
              Tip: Press Enter in any field or click Add Item to append.
            </span>
            <button
              type="submit"
              disabled={!customItem.trim() || !(parsedQty > 0) || customRate === ''}
              className="h-9 px-5 bg-[#C82A2B] hover:bg-[#A81D1E] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 shadow-md shadow-[#C82A2B]/20 transition-all active:scale-95"
            >
              <Plus size={13} strokeWidth={3} /> Add Item
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
              <th className="p-3 w-16 text-center">SL No.</th>
              <th className="p-3">Item</th>
              <th className="p-3 w-32 text-right">Quantity</th>
              <th className="p-3 w-36 text-right">Rate (₹)</th>
              <th className="p-3 w-36 text-right">Amount (₹)</th>
              <th className="p-3 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  <p className="text-xs font-black text-zinc-400">No items yet</p>
                  <p className="text-[10px] font-semibold text-zinc-400 mt-1">Use the input above to quickly add custom quotation items, or "Add Catalog Line" for pre-configured garments.</p>
                </td>
              </tr>
            ) : (
              lines.map((l, i) => {
                const kind = getItemKind(l.item);
                return (
                  <tr key={l.item.id} className="hover:bg-zinc-50/60">
                    <td className="p-3 text-center text-xs font-black text-zinc-500">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider shrink-0 ${KIND_BADGE[kind]}`}>
                          {ITEM_KIND_LABELS[kind]}
                        </span>
                        {kind === 'CUSTOM' ? (
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={l.item.name || l.item.product_name || ''}
                              onChange={e => onChangeName ? onChangeName(l.index, e.target.value) : undefined}
                              className="w-full px-2 py-1 text-xs font-bold border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-[#C82A2B] bg-white"
                              placeholder="Custom item name..."
                            />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-xs font-black text-zinc-900 truncate">{l.title}</p>
                            {l.subtitle && <p className="text-[10px] font-semibold text-zinc-400 truncate">{l.subtitle}</p>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step={kind === 'FABRIC' ? '0.01' : '1'}
                          value={l.item.quantity}
                          onChange={e => onChangeQty(l.index, e.target.value)}
                          className={cellInput}
                        />
                        {kind === 'FABRIC' && <span className="text-[9px] font-black text-zinc-400">m</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.item.price}
                        onChange={e => onChangeRate(l.index, e.target.value)}
                        className={cellInput}
                      />
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-black text-zinc-900">
                      {lineAmount(l.item).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="Edit item"
                          onClick={() => onEdit(l.index)}
                          className="w-8 h-8 rounded-lg bg-zinc-50 text-zinc-500 hover:bg-zinc-900 hover:text-white border border-zinc-200 flex items-center justify-center transition-all"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title="Delete item"
                          onClick={() => onDelete(l.index)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white border border-red-100 flex items-center justify-center transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="bg-zinc-50 border-t border-zinc-200">
                <td colSpan={4} className="p-3 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Total</td>
                <td className="p-3 text-right font-mono text-sm font-black text-[#C82A2B]">₹{grandTotal.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
