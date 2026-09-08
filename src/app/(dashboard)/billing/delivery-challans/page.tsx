'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import { Truck, Printer, Eye, Plus, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeliveryChallansPage() {
  const [orderId, setOrderId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [packages, setPackages] = useState('2');
  const [notes, setNotes] = useState('');

  const [generatedDC, setGeneratedDC] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'customer' | 'office'>('customer');

  const handleCreateDC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/delivery-challans', {
        order_id: Number(orderId),
        vehicle_no: vehicleNo,
        transporter_name: transporterName,
        total_packages: Number(packages),
        notes
      });
      toast.success(`Delivery Challan (${res.data.dc_no}) created!`);
      setGeneratedDC(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate Delivery Challan');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-400" />
            Delivery Challan (DC) Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            P1.4 Scope — Customer copy (without pricing) vs Office copy (with pricing) tied to Sales Order.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            New Delivery Challan
          </h2>
          <form onSubmit={handleCreateDC} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sales Order ID</label>
              <input
                type="number"
                required
                placeholder="e.g. 1"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  placeholder="e.g. KA-01-AB-1234"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transporter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Express Logistics"
                  value={transporterName}
                  onChange={e => setTransporterName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Total Packages / Cartons</label>
              <input
                type="number"
                min="1"
                value={packages}
                onChange={e => setPackages(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Dispatch Remarks</label>
              <textarea
                placeholder="Delivery notes, driver details..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm"
                rows={2}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-md transition"
            >
              Generate Delivery Challan
            </button>
          </form>
        </div>

        {/* Print Preview & Dual Copy View */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Document Print Format</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setPrintMode('customer')}
                  className={`px-3 py-1 rounded-lg transition ${printMode === 'customer' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
                >
                  Customer Copy (No Pricing)
                </button>
                <button
                  onClick={() => setPrintMode('office')}
                  className={`px-3 py-1 rounded-lg transition ${printMode === 'office' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
                >
                  Office Copy (With Pricing)
                </button>
              </div>
            </div>

            {generatedDC ? (
              <div className="mt-4 p-4 border border-dashed border-slate-300 rounded-xl space-y-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm font-bold text-indigo-600">{generatedDC.dc_no}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full">
                    {printMode === 'customer' ? 'CUSTOMER COPY' : 'OFFICE COPY'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-700">
                  <p><span className="font-semibold">Order Reference:</span> ORD-#{generatedDC.order_id}</p>
                  <p><span className="font-semibold">Dispatch Date:</span> {generatedDC.dispatch_date}</p>
                  <p><span className="font-semibold">Vehicle:</span> {generatedDC.vehicle_no || 'N/A'}</p>
                  <p><span className="font-semibold">Packages:</span> {generatedDC.total_packages} Boxes</p>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs">
                  <p className="font-semibold mb-1 text-slate-900">Enclosed Items Overview:</p>
                  <div className="bg-white p-2 rounded border space-y-1">
                    <div className="flex justify-between font-mono">
                      <span>Standard School Blazer (Size 34)</span>
                      <span>15 pcs {printMode === 'office' ? '₹22,500' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-slate-400 py-12">
                Fill form and click "Generate Delivery Challan" to view print preview.
              </div>
            )}
          </div>

          {generatedDC && (
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print {printMode === 'customer' ? 'Customer Copy' : 'Office Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
