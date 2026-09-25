'use client';

import React, { useState } from 'react';
import CatalogManager from '../../_components/CatalogManager';
import { CircleDot, Disc, Layers } from 'lucide-react';

export default function TrimsCatalogPage() {
  const [activeTrim, setActiveTrim] = useState<'buttons' | 'threads'>('buttons');

  return (
    <div className="space-y-6">
      {/* Sub-navigation / Trim Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#3a525d]">Trims Catalog</h2>
            <p className="text-[11px] font-bold text-zinc-400">Select trim category to view specifications, vendor assignments, and pricing</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100/80 p-1.5 rounded-xl border border-zinc-200/60">
          <button
            type="button"
            onClick={() => setActiveTrim('buttons')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTrim === 'buttons'
                ? 'bg-white text-[#2d8d9b] shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <CircleDot size={14} />
            Button Catalog
          </button>
          <button
            type="button"
            onClick={() => setActiveTrim('threads')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTrim === 'threads'
                ? 'bg-white text-[#2d8d9b] shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Disc size={14} />
            Thread Catalog
          </button>
        </div>
      </div>

      {/* Dynamic Catalog Component */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTrim === 'buttons' ? (
          <CatalogManager
            key="buttons-catalog"
            type="buttons"
            title="Button Catalog"
            subtitle="Styles & Fastener Types"
          />
        ) : (
          <CatalogManager
            key="threads-catalog"
            type="threads"
            title="Thread Catalog"
            subtitle="Color Codes & Tensile Strength"
          />
        )}
      </div>
    </div>
  );
}
