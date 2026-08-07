import React, { useState, useEffect } from 'react';
import { VendorRecord, DeviceGrade } from '../types';
import { GRADES } from '../data/initialData';
import { X, Building2, Smartphone, Hash, FileText, Calendar, Check } from 'lucide-react';

interface VendorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendor: Omit<VendorRecord, 'id' | 'createdAt' | 'updatedAt'> | VendorRecord) => void;
  initialVendor?: VendorRecord | null;
}

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVendor,
}) => {
  const [formData, setFormData] = useState({
    vendorName: '',
    model: '',
    imei: '',
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    grade: 'Grade A' as DeviceGrade,
    notes: '',
  });

  useEffect(() => {
    if (initialVendor) {
      setFormData({
        vendorName: initialVendor.vendorName || '',
        model: initialVendor.model || '',
        imei: initialVendor.imei || '',
        date: initialVendor.date || new Date().toISOString().split('T')[0],
        invoiceNumber: initialVendor.invoiceNumber || '',
        grade: initialVendor.grade || 'Grade A',
        notes: initialVendor.notes || '',
      });
    } else {
      setFormData({
        vendorName: '',
        model: '',
        imei: '',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        grade: 'Grade A',
        notes: '',
      });
    }
  }, [initialVendor, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName.trim() || !formData.model.trim() || !formData.imei.trim()) {
      alert('Vendor Name, Device Model, and IMEI are required fields.');
      return;
    }

    if (initialVendor) {
      onSave({
        ...initialVendor,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-xs uppercase tracking-tight text-white">
              {initialVendor ? 'Edit Vendor Record' : 'New Vendor Record Entry'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Vendor / Supplier Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.vendorName}
              onChange={(e) => setFormData((prev) => ({ ...prev, vendorName: e.target.value }))}
              placeholder="e.g. IMEXEL, SO LACRADOS, ICE MOBILE..."
              className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Device Model <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="e.g. iPhone 16 Pro Max 256GB"
                className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                15-Digit IMEI / Serial <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.imei}
                onChange={(e) => setFormData((prev) => ({ ...prev, imei: e.target.value }))}
                placeholder="358190684490631"
                className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="INV-1018"
                className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Condition Grade
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value as DeviceGrade }))}
                className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {GRADES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Supplier Notes & Batch Info
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Factory warranty sealed unit, lot #12"
              className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Save Vendor Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
