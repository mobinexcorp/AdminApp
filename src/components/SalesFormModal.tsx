import React, { useState, useEffect } from 'react';
import { SalesRecord, CustomerRecord, VendorRecord } from '../types';
import {
  X,
  Plus,
  Save,
  DollarSign,
  TrendingUp,
  Receipt,
  Building2,
  Calendar,
  User,
  CreditCard,
  Building,
  Sparkles,
  Info
} from 'lucide-react';

interface SalesFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (salesData: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'> | SalesRecord) => void;
  initialSalesRecord?: SalesRecord | null;
  customerRecords?: CustomerRecord[];
  vendorRecords?: VendorRecord[];
}

export const SalesFormModal: React.FC<SalesFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSalesRecord,
  customerRecords = [],
  vendorRecords = [],
}) => {
  const [formData, setFormData] = useState<Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>>({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    qty: 1,
    totalInvoicePrice: 0,
    costPrice: 0,
    profit: 0,
    vendorName: '',
    vendorInvoiceNumber: '',
    paidFrom: 'Chase Checking',
    paidBy: '',
    notes: '',
  });

  const [selectedCustomerRecId, setSelectedCustomerRecId] = useState<string>('');
  const [selectedVendorRecId, setSelectedVendorRecId] = useState<string>('');

  useEffect(() => {
    if (initialSalesRecord) {
      setFormData({
        invoiceNumber: initialSalesRecord.invoiceNumber || '',
        date: initialSalesRecord.date || new Date().toISOString().split('T')[0],
        customerName: initialSalesRecord.customerName || '',
        qty: initialSalesRecord.qty || 1,
        totalInvoicePrice: initialSalesRecord.totalInvoicePrice || 0,
        costPrice: initialSalesRecord.costPrice || 0,
        profit: (typeof initialSalesRecord.profit === 'number' && initialSalesRecord.profit !== 0) 
          ? initialSalesRecord.profit 
          : ((initialSalesRecord.totalInvoicePrice || 0) - (initialSalesRecord.costPrice || 0)),
        vendorName: initialSalesRecord.vendorName || '',
        vendorInvoiceNumber: initialSalesRecord.vendorInvoiceNumber || '',
        paidFrom: initialSalesRecord.paidFrom || 'Chase Checking',
        paidBy: initialSalesRecord.paidBy || '',
        notes: initialSalesRecord.notes || '',
      });
    } else {
      setFormData({
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        qty: 1,
        totalInvoicePrice: 0,
        costPrice: 0,
        profit: 0,
        vendorName: '',
        vendorInvoiceNumber: '',
        paidFrom: 'Chase Checking',
        paidBy: '',
        notes: '',
      });
    }
    setSelectedCustomerRecId('');
    setSelectedVendorRecId('');
  }, [initialSalesRecord, isOpen]);

  if (!isOpen) return null;

  // Auto-fill from Customer Record in IMEI List
  const handleSelectCustomerRecord = (recId: string) => {
    setSelectedCustomerRecId(recId);
    if (!recId) return;
    const matched = customerRecords.find((r) => r.id === recId);
    if (matched) {
      const price = matched.invoiceAmount || 0;
      setFormData((prev) => {
        const cost = prev.costPrice || 0;
        return {
          ...prev,
          invoiceNumber: matched.invoiceNumber || prev.invoiceNumber,
          customerName: matched.customerName || prev.customerName,
          date: matched.date || prev.date,
          totalInvoicePrice: price,
          profit: price - cost,
          paidBy: matched.customerName || prev.paidBy,
        };
      });
    }
  };

  // Auto-fill from Vendor Record
  const handleSelectVendorRecord = (vId: string) => {
    setSelectedVendorRecId(vId);
    if (!vId) return;
    const matched = vendorRecords.find((v) => v.id === vId);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        vendorName: matched.vendorName || prev.vendorName,
        vendorInvoiceNumber: matched.invoiceNumber || prev.vendorInvoiceNumber,
      }));
    }
  };

  // Calculate profit on revenue/cost change
  const handleRevenueChange = (val: number) => {
    setFormData((prev) => ({
      ...prev,
      totalInvoicePrice: val,
      profit: val - (prev.costPrice || 0),
    }));
  };

  const handleCostChange = (val: number) => {
    setFormData((prev) => ({
      ...prev,
      costPrice: val,
      profit: (prev.totalInvoicePrice || 0) - val,
    }));
  };

  const handleProfitChange = (val: number) => {
    setFormData((prev) => ({
      ...prev,
      profit: val,
      costPrice: (prev.totalInvoicePrice || 0) - val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceNumber.trim() || !formData.customerName.trim()) {
      alert('Invoice Number and Customer Name are required.');
      return;
    }

    if (initialSalesRecord) {
      onSave({
        ...initialSalesRecord,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onSave(formData);
    }
    onClose();
  };

  const marginPct = formData.totalInvoicePrice > 0 ? (formData.profit / formData.totalInvoicePrice) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center font-bold text-xs text-white">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-white">
                {initialSalesRecord ? 'Edit Sales Entry' : 'Record New Sales Transaction'}
              </h3>
              <p className="text-[10px] text-slate-400">
                Total sales, cost & profit tracking ledger entry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 text-xs space-y-4">
          {/* Quick Auto-Fill Helpers */}
          <div className="bg-blue-50 border border-blue-200 p-3 rounded space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px] uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Quick Auto-Fill From Existing Records</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                  From IMEI List Customer Invoice
                </label>
                <select
                  value={selectedCustomerRecId}
                  onChange={(e) => handleSelectCustomerRecord(e.target.value)}
                  className="w-full mt-0.5 p-1 border border-slate-300 rounded bg-white text-xs font-semibold"
                >
                  <option value="">-- Choose Customer Record --</option>
                  {customerRecords.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.invoiceNumber} | {c.customerName} (${c.invoiceAmount || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                  From Vendor Database Supplier
                </label>
                <select
                  value={selectedVendorRecId}
                  onChange={(e) => handleSelectVendorRecord(e.target.value)}
                  className="w-full mt-0.5 p-1 border border-slate-300 rounded bg-white text-xs font-semibold"
                >
                  <option value="">-- Choose Vendor Record --</option>
                  {vendorRecords.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vendorName} | Inv #{v.invoiceNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 1: Core Invoice & Customer Info */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 pb-1">
              1. Customer & Invoice Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Customer Invoice # <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-2026-0081"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Sale Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Marcus Vance"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Financial Calculation & Profit Inputs */}
          <div className="bg-slate-50 border border-slate-300 p-3 rounded space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                2. Price, Cost & Profit Inputs
              </h4>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                marginPct >= 15 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                Margin: {marginPct.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                  Quantity (Qty)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-xs text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                  Total Sales Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.totalInvoicePrice || ''}
                  onChange={(e) => handleRevenueChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-xs text-blue-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                  Total Cost Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.costPrice || ''}
                  onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-xs text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-700 uppercase">
                  Net Profit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.profit || ''}
                  onChange={(e) => handleProfitChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full mt-0.5 p-1.5 border border-emerald-400 bg-emerald-50 rounded font-mono font-extrabold text-xs text-emerald-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vendor & Payment Source */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200 pb-1">
              3. Vendor Supplier & Payment Method
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Vendor Name
                </label>
                <input
                  type="text"
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  placeholder="e.g. AS COMERCIO HAROLDO"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white text-xs uppercase font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Vendor Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.vendorInvoiceNumber}
                  onChange={(e) => setFormData({ ...formData, vendorInvoiceNumber: e.target.value })}
                  placeholder="e.g. 1018"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Paid From (Account / Source)
                </label>
                <select
                  value={formData.paidFrom}
                  onChange={(e) => setFormData({ ...formData, paidFrom: e.target.value })}
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                >
                  <option value="Chase Checking">Chase Business Checking</option>
                  <option value="Zelle Account">Zelle Business</option>
                  <option value="Bank Wire">Bank Wire Transfer</option>
                  <option value="Cash Vault">Cash Vault</option>
                  <option value="Stripe Merchant">Stripe Merchant Acc</option>
                  <option value="PayPal Business">PayPal Business</option>
                  <option value="Capital One Card">Capital One Corporate Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Paid By (Person / Customer / Rep)
                </label>
                <input
                  type="text"
                  value={formData.paidBy}
                  onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                  placeholder="e.g. Marcus Vance (Zelle) / Rep Name"
                  className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              Transaction Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Special wholesale terms, warranty info, or customer agreement"
              className="w-full mt-0.5 p-1.5 border border-slate-300 rounded bg-white text-xs"
            />
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> SAVE SALES RECORD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
