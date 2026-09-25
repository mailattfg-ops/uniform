'use client';

import React, { useState } from 'react';
import ButtonStockPage from '../button-stock/page';
import ThreadStockPage from '../thread-stock/page';
import { CircleDot, Disc, Package } from 'lucide-react';

export default function TrimsStockHubPage() {
  const [activeTab, setActiveTab] = useState<'buttons' | 'threads'>('buttons');

  return (
    <div className="space-y-6">
      {/* Top Trims Stock Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2d8d9b]/10 text-[#2d8d9b] flex items-center justify-center font-bold">
            <Package size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#3a525d]">Trims Stock Ledger</h2>
            <p className="text-[11px] font-bold text-zinc-400">Track and adjust physical stock for buttons and sewing threads</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100/80 p-1.5 rounded-xl border border-zinc-200/60">
          <button
            type="button"
            onClick={() => setActiveTab('buttons')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'buttons'
                ? 'bg-white text-[#2d8d9b] shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <CircleDot size={14} />
            Button Stock
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('threads')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'threads'
                ? 'bg-white text-[#2d8d9b] shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Disc size={14} />
            Thread Stock
          </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'buttons' ? <ButtonStockPage /> : <ThreadStockPage />}
      </div>
    </div>
  );
}
