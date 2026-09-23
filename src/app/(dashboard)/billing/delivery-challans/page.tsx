'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Truck, Printer, Package, RefreshCw, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeliveryChallan {
  id: number;
  dc_no: string;
  order_id: number;
  branch_id?: number;
  dispatch_date: string;
  vehicle_no: string;
  transporter_name: string;
  total_packages: number;
  notes: string;
  created_at: string;
  orders?: {
    id: number;
    order_no: string;
    quotation_id: number;
    quotations?: {
      quotation_no: string;
      title: string;
      final_quote_value: number;
      organizations?: { name: string; address?: string };
    };
  };
  items?: any[];
}

export default function DeliveryChallansPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingChallans, setLoadingChallans] = useState(false);

  // Form State
  const [orderId, setOrderId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [packages, setPackages] = useState('2');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Print & Preview State
  const [selectedDC, setSelectedDC] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'customer' | 'office'>('customer');
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch all orders eligible for Delivery Challans
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders');
      setOrders(res.data || []);
      if (res.data && res.data.length > 0 && !orderId) {
        setOrderId(String(res.data[0].id));
      }
    } catch (err: any) {
      console.error('Failed to fetch orders:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Delivery Challan Dispatch History
  const fetchChallans = async () => {
    try {
      setLoadingChallans(true);
      const res = await api.get('/delivery-challans');
      setChallans(res.data || []);
      if (res.data && res.data.length > 0 && !selectedDC) {
        loadDCDetails(res.data[0].id, printMode);
      }
    } catch (err: any) {
      console.error('Failed to fetch challans:', err.message);
    } finally {
      setLoadingChallans(false);
    }
  };

  // Load detailed DC with item payload (respecting customer vs office copy)
  const loadDCDetails = async (dcId: number, mode: 'customer' | 'office') => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/delivery-challans/${dcId}`, {
        params: { mode }
      });
      setSelectedDC(res.data);
    } catch (err: any) {
      toast.error('Failed to load challan details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchChallans();
  }, []);

  // When print mode changes on selected DC, re-fetch formatted payload
  useEffect(() => {
    if (selectedDC?.id) {
      loadDCDetails(selectedDC.id, printMode);
    }
  }, [printMode]);

  // Step 1: validate form and open confirmation modal
  const handleCreateDC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) {
      toast.error('Please select a valid Sales Order.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Step 2: confirmed — fire the API
  const confirmAndGenerate = async () => {
    setShowConfirmModal(false);
    try {
      setIsSubmitting(true);
      const res = await api.post('/delivery-challans', {
        order_id: Number(orderId),
        vehicle_no: vehicleNo,
        transporter_name: transporterName,
        total_packages: Number(packages),
        notes
      });
      toast.success(`Delivery Challan (${res.data.dc_no}) generated successfully!`);
      setSelectedDC(res.data);
      fetchChallans();
      setVehicleNo('');
      setTransporterName('');
      setNotes('');
    } catch (err: any) {
      const errData = err.response?.data;
      if (err.response?.status === 409 && errData?.existing_dc_id) {
        toast(`Challan ${errData.existing_dc_no} already issued for this order. Loaded for reprint.`, {
          icon: '📋',
          duration: 5000,
        });
        loadDCDetails(errData.existing_dc_id, printMode);
      } else {
        toast.error(errData?.error || 'Failed to generate Delivery Challan');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrder = orders.find(o => String(o.id) === String(orderId));

  const confirmModalDetails = [
    { label: 'Sales Order', value: selectedOrder?.order_no || `#${orderId}` },
    { label: 'Client', value: selectedOrder?.quotations?.organizations?.name || selectedOrder?.quotations?.title || '—' },
    { label: 'Vehicle No.', value: vehicleNo || 'Not specified' },
    { label: 'Transporter', value: transporterName || 'Not specified' },
    { label: 'Total Packages', value: `${packages} box(es)` },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-white/5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 tracking-tight">
            <Truck className="w-8 h-8 text-indigo-400" />
            Delivery Challan (DC) Hub
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1.5 font-medium">
            Dual-mode dispatch slips: Customer Copy (items without pricing) &amp; Office Copy (with item valuations) tied to verified Sales Orders.
          </p>
        </div>
        <button
          onClick={() => { fetchOrders(); fetchChallans(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loadingChallans ? 'animate-spin' : ''}`} />
          Refresh Dispatch Logs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Generator Form */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Create Delivery Challan</h2>
                <p className="text-xs text-slate-400">Generate dispatch slip against confirmed SO</p>
              </div>
            </div>
            {selectedOrder && (
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                {selectedOrder.status}
              </span>
            )}
          </div>

          <form onSubmit={handleCreateDC} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Select Sales Order
              </label>
              <select
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 transition"
              >
                <option value="">-- Choose Sales Order --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_no} — {o.quotations?.organizations?.name || o.quotations?.title || 'Client'} ({o.status})
                  </option>
                ))}
              </select>
              {selectedOrder && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 flex justify-between items-center">
                  <span>Client: <strong className="text-slate-900">{selectedOrder.quotations?.organizations?.name || 'N/A'}</strong></span>
                  <span>Quote: <strong className="font-mono text-indigo-600">{selectedOrder.quotations?.quotation_no}</strong></span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Vehicle Number</label>
                <input
                  type="text"
                  placeholder="e.g. KL-11-BV-8921"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Transporter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kerala Cargo Express"
                  value={transporterName}
                  onChange={e => setTransporterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Total Cartons / Packages</label>
              <input
                type="number"
                min="1"
                required
                value={packages}
                onChange={e => setPackages(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Dispatch Instructions / Remarks</label>
              <textarea
                placeholder="Driver phone number, gate entry notes, box seals..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-indigo-500 transition"
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              {isSubmitting ? 'Generating Slip...' : 'Generate Delivery Challan'}
            </button>
          </form>
        </div>

        {/* Print Preview & Dual Copy View */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="dc-no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">Challan Document Preview</h2>
                <p className="text-xs text-slate-400">Live dual-format print rendering</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60">
                <button
                  onClick={() => setPrintMode('customer')}
                  className={`px-3 py-1.5 rounded-lg transition ${printMode === 'customer' ? 'bg-white shadow-xs text-indigo-600 font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Customer Copy (No Pricing)
                </button>
                <button
                  onClick={() => setPrintMode('office')}
                  className={`px-3 py-1.5 rounded-lg transition ${printMode === 'office' ? 'bg-white shadow-xs text-indigo-600 font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Office Copy (With Pricing)
                </button>
              </div>
            </div>

            {selectedDC ? (
              <div className="dc-print-area mt-6 p-6 border-2 border-slate-200 rounded-2xl space-y-5 bg-white shadow-sm">
                {/* DC Printable Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs">F</div>
                      <span className="font-black text-base text-slate-900 tracking-wider">FORMA APPARELS</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Official Dispatch Note &amp; Transport Manifest</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-indigo-600">{selectedDC.dc_no}</div>
                    <span className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      printMode === 'customer' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}>
                      {printMode === 'customer' ? 'CUSTOMER DISPATCH SLIP (QUANTITY ONLY)' : 'OFFICE VALUATION COPY (WITH RATES)'}
                    </span>
                  </div>
                </div>

                {/* Dispatch Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Order Ref</span>
                    <strong className="text-slate-800 font-mono font-bold">{selectedDC.orders?.order_no || `ORD-#${selectedDC.order_id}`}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Dispatch Date</span>
                    <strong className="text-slate-800 font-bold">{selectedDC.dispatch_date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle</span>
                    <strong className="text-slate-800 font-bold">{selectedDC.vehicle_no || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Packages</span>
                    <strong className="text-slate-800 font-bold">{selectedDC.total_packages} Boxes</strong>
                  </div>
                </div>

                {/* Recipient Organization */}
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Recipient / Destination</span>
                    <strong className="text-slate-900 text-sm">{selectedDC.orders?.quotations?.organizations?.name || 'Authorized Customer'}</strong>
                    <span className="text-slate-500 block text-[11px]">{selectedDC.orders?.quotations?.organizations?.address || 'Consignee Address'}</span>
                  </div>
                  {selectedDC.transporter_name && (
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Carrier</span>
                      <strong className="text-slate-700 font-medium">{selectedDC.transporter_name}</strong>
                    </div>
                  )}
                </div>

                {/* Enclosed Items Dynamic Table */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Enclosed Garments &amp; Goods</span>
                    <span className="text-[11px] text-slate-400 font-medium">{selectedDC.items?.length || 0} item(s) manifested</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Item Description</th>
                          <th className="p-2.5 text-center">Design Ref</th>
                          <th className="p-2.5 text-right">Quantity</th>
                          {printMode === 'office' && (
                            <>
                              <th className="p-2.5 text-right">Unit Price</th>
                              <th className="p-2.5 text-right">Total</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedDC.items && selectedDC.items.length > 0 ? (
                          selectedDC.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-slate-900 font-semibold">
                                {item.product_type_name || item.item_description || item.title || `Item #${idx + 1}`}
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                                {item.design_number || 'DNS-STD'}
                              </td>
                              <td className="p-2.5 text-right font-black text-slate-900">
                                {item.quantity || 1} pcs
                              </td>
                              {printMode === 'office' && (
                                <>
                                  <td className="p-2.5 text-right font-mono text-slate-600">
                                    ₹{parseFloat(item.unit_price || 0).toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                    ₹{parseFloat(item.total_price || (item.quantity * item.unit_price) || 0).toFixed(2)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={printMode === 'office' ? 5 : 3} className="p-4 text-center text-slate-400">
                              No item details recorded for this quotation.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {printMode === 'office' && selectedDC.orders?.quotations?.final_quote_value && (() => {
                        const gross = parseFloat(selectedDC.orders.quotations.final_quote_value);
                        const metrics = selectedDC.orders?.quotations?.metrics_summary || {};
                        const gstRate = metrics.gst_rate || 18;
                        const taxable = Math.round((gross / (1 + gstRate / 100)) * 100) / 100;
                        const gstAmt = Math.round((gross - taxable) * 100) / 100;
                        const cgst = Math.round((gstAmt / 2) * 100) / 100;
                        const sgst = cgst;
                        return (
                          <tfoot className="bg-slate-50 border-t border-slate-200 text-xs">
                            <tr>
                              <td colSpan={4} className="p-2 text-right text-slate-500">Taxable Value:</td>
                              <td className="p-2 text-right font-mono text-slate-700">₹{taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td colSpan={4} className="p-2 text-right text-slate-500">CGST ({gstRate / 2}%):</td>
                              <td className="p-2 text-right font-mono text-slate-700">₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                              <td colSpan={4} className="p-2 text-right text-slate-500">SGST ({gstRate / 2}%):</td>
                              <td className="p-2 text-right font-mono text-slate-700">₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="border-t border-slate-300">
                              <td colSpan={4} className="p-2.5 text-right font-bold text-slate-700 uppercase text-[10px]">Total Manifest Valuation (incl. GST):</td>
                              <td className="p-2.5 text-right font-black font-mono text-indigo-600 text-sm">₹{gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                </div>

                {/* Sign-off Stamps */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] text-slate-500 border-t border-slate-100">
                  <div className="border-t border-dashed border-slate-300 pt-2">
                    <p className="font-bold text-slate-700">Dispatch Executive Stamp &amp; Sign</p>
                    <p className="text-[10px] text-slate-400">Forma Apparels Central Logistics</p>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-2">
                    <p className="font-bold text-slate-700">Consignee Receiving Signature</p>
                    <p className="text-[10px] text-slate-400">Verified quantity in sound condition</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12 text-center text-slate-400 py-16 border-2 border-dashed border-slate-200 rounded-3xl">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-sm text-slate-600">No Challan Selected for Preview</p>
                <p className="text-xs text-slate-400 mt-1">Generate a new challan or select one from the dispatch log below.</p>
              </div>
            )}
          </div>

          {selectedDC && (
            <div className="dc-no-print pt-4 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print {printMode === 'customer' ? 'Customer Copy (No Pricing)' : 'Office Copy (With GST Breakup)'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Challan History Table */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Delivery Challan Dispatch Registry</h2>
            <p className="text-xs text-slate-400 mt-0.5">Historical record of all issued delivery challans</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {challans.length} Challans Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Challan No</th>
                <th className="p-3">Sales Order Ref</th>
                <th className="p-3">Client Destination</th>
                <th className="p-3">Dispatch Date</th>
                <th className="p-3">Vehicle / Transporter</th>
                <th className="p-3 text-center">Boxes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {challans.length > 0 ? (
                challans.map(dc => (
                  <tr key={dc.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-indigo-600">{dc.dc_no}</td>
                    <td className="p-3 font-mono text-slate-700">{dc.orders?.order_no || `ORD-#${dc.order_id}`}</td>
                    <td className="p-3 font-semibold text-slate-800">{dc.orders?.quotations?.organizations?.name || 'Customer'}</td>
                    <td className="p-3 text-slate-500">{dc.dispatch_date}</td>
                    <td className="p-3 text-slate-600">{dc.vehicle_no || 'Manual Delivery'} {dc.transporter_name ? `(${dc.transporter_name})` : ''}</td>
                    <td className="p-3 text-center font-bold text-slate-800">{dc.total_packages}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => { setPrintMode('customer'); loadDCDetails(dc.id, 'customer'); }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition"
                      >
                        Customer Copy
                      </button>
                      <button
                        onClick={() => { setPrintMode('office'); loadDCDetails(dc.id, 'office'); }}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition"
                      >
                        Office Copy
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No delivery challans generated yet. Select a Sales Order above to issue a dispatch note.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmModal(false)}
          />
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Delivery Challan</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action is <strong>irreversible</strong> — one challan per order. Please verify the dispatch details below.
                </p>
              </div>
            </div>

            {/* Dispatch Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {confirmModalDetails.map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="font-bold text-slate-800 text-right max-w-[55%] truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndGenerate}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
              >
                <Truck className="w-3.5 h-3.5" />
                Yes, Generate Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
