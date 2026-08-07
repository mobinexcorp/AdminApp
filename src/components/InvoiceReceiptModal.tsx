import React from 'react';
import { CustomerRecord } from '../types';
import { GRADES } from '../data/initialData';
import { X, Printer, ShieldCheck, FileCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface InvoiceReceiptModalProps {
  record: CustomerRecord | null;
  onClose: () => void;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({ record, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const gradeInfo = GRADES.find((g) => g.value === record.grade) || {
    label: record.grade,
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    desc: '',
  };

  const handleCopyIMEI = () => {
    navigator.clipboard.writeText(record.imei);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8" id="receipt-modal">
        {/* Header toolbar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Device Receipt & Record</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-colors"
              id="print-receipt-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              id="close-receipt-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Paper Area */}
        <div className="p-8 space-y-6" id="printable-receipt-content">
          {/* Logo & Top Info */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">DEVICE RECORD RECEIPT</h1>
              <p className="text-xs text-slate-500 mt-0.5">Mobile Inventory & Trade-In Log</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 block">
                {record.invoiceNumber}
              </span>
              <p className="text-xs text-slate-500 mt-1">Date: {record.date}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer Details</p>
            <p className="text-base font-bold text-slate-900">{record.customerName}</p>
            {record.customerPhone && <p className="text-xs text-slate-600">Phone: {record.customerPhone}</p>}
            {record.customerEmail && <p className="text-xs text-slate-600">Email: {record.customerEmail}</p>}
          </div>

          {/* Record Details Grid */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Device Details</p>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Model</span>
                <span className="font-semibold text-slate-900 text-sm">{record.model}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">IMEI Number</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-slate-900 text-xs">{record.imei}</span>
                  <button
                    onClick={handleCopyIMEI}
                    className="text-slate-400 hover:text-slate-700 print:hidden"
                    title="Copy IMEI"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Condition Grade</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold text-xs border ${gradeInfo.color}`}>
                  {record.grade}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Record Status</span>
                <span className="font-semibold text-slate-900">{record.status}</span>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-b border-slate-200 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Total Invoice Amount</span>
            <span className="text-xl font-bold text-emerald-600 font-mono">
              {record.invoiceAmount !== undefined
                ? `$${record.invoiceAmount.toFixed(2)}`
                : 'N/A'}
            </span>
          </div>

          {/* Notes */}
          {record.notes && (
            <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl">
              <span className="font-semibold text-amber-900 block mb-1">Notes / Condition Details:</span>
              <p>{record.notes}</p>
            </div>
          )}

          {/* Footer watermark */}
          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Device Record • Recorded on {record.date}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
