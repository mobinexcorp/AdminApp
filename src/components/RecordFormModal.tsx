import React, { useState, useEffect } from 'react';
import { CustomerRecord, DeviceGrade, RecordStatus } from '../types';
import { GRADES, POPULAR_MODELS } from '../data/initialData';
import { X, Calendar, User, Smartphone, Hash, FileText, Check, Sparkles, AlertCircle, DollarSign, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> | CustomerRecord) => void;
  initialRecord?: CustomerRecord | null;
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [grade, setGrade] = useState<DeviceGrade>('Grade A');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [status, setStatus] = useState<RecordStatus>('Completed');
  const [notes, setNotes] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  useEffect(() => {
    if (initialRecord) {
      setCustomerName(initialRecord.customerName || '');
      setCustomerPhone(initialRecord.customerPhone || '');
      setCustomerEmail(initialRecord.customerEmail || '');
      setDate(initialRecord.date || new Date().toISOString().split('T')[0]);
      setModel(initialRecord.model || '');
      setImei(initialRecord.imei || '');
      setGrade(initialRecord.grade || 'Grade A');
      setInvoiceNumber(initialRecord.invoiceNumber || '');
      setInvoiceAmount(initialRecord.invoiceAmount !== undefined ? String(initialRecord.invoiceAmount) : '');
      setStatus(initialRecord.status || 'Completed');
      setNotes(initialRecord.notes || '');
    } else {
      // Clear form & generate defaults for new record
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDate(new Date().toISOString().split('T')[0]);
      setModel('');
      setImei('');
      setGrade('Grade A');
      const randomInvNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setInvoiceNumber(randomInvNum);
      setInvoiceAmount('');
      setStatus('Completed');
      setNotes('');
    }
    setErrors({});
  }, [initialRecord, isOpen]);

  const generateSampleIMEI = () => {
    const tac = '358' + Math.floor(10000 + Math.random() * 90000);
    const snr = Math.floor(100000 + Math.random() * 900000).toString();
    const cd = Math.floor(Math.random() * 10).toString();
    setImei(tac + snr + cd);
    if (errors.imei) {
      setErrors((prev) => ({ ...prev, imei: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }
    if (!date) {
      newErrors.date = 'Date is required';
    }
    if (!model.trim()) {
      newErrors.model = 'Device model is required';
    }
    const cleanImei = imei.trim().replace(/\s+/g, '');
    if (!cleanImei) {
      newErrors.imei = 'IMEI number is required';
    } else if (!/^\d{14,16}$/.test(cleanImei)) {
      newErrors.imei = 'IMEI must be 14-16 digits';
    }
    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const recordData = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      date,
      model: model.trim(),
      imei: imei.trim().replace(/\s+/g, ''),
      grade,
      invoiceNumber: invoiceNumber.trim(),
      invoiceAmount: invoiceAmount !== '' ? parseFloat(invoiceAmount) : undefined,
      status,
      notes: notes.trim() || undefined,
    };

    if (initialRecord) {
      onSave({
        ...initialRecord,
        ...recordData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onSave(recordData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8"
          id="record-modal-container"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white">
                IM
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-tight text-white">
                  {initialRecord ? 'Edit Customer Record' : 'Commit New Customer Record'}
                </h2>
                <p className="text-[10px] text-slate-400">
                  Enter customer details, device model, 15-digit IMEI, condition grade, and invoice.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              id="close-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Customer & Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium ${
                      errors.customerName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300'
                    }`}
                    id="input-customer-name"
                  />
                </div>
                {errors.customerName && (
                  <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium ${
                      errors.date ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300'
                    }`}
                    id="input-record-date"
                  />
                </div>
                {errors.date && (
                  <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.date}
                  </p>
                )}
              </div>
            </div>

            {/* Optional Customer Contact details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Customer Phone (Optional)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  id="input-customer-phone"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Customer Email (Optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  id="input-customer-email"
                />
              </div>
            </div>

            {/* Model & IMEI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Device Model <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      setShowModelSuggestions(true);
                    }}
                    onFocus={() => setShowModelSuggestions(true)}
                    placeholder="e.g. iPhone 15 Pro Max 256GB"
                    className={`w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium ${
                      errors.model ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300'
                    }`}
                    id="input-device-model"
                  />
                </div>
                {errors.model && (
                  <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.model}
                  </p>
                )}

                {/* Model Suggestions Dropdown */}
                {showModelSuggestions && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded shadow-md max-h-48 overflow-y-auto p-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight border-b border-slate-100 mb-1">
                      Quick Select Presets
                    </div>
                    {POPULAR_MODELS.filter(m => m.toLowerCase().includes(model.toLowerCase())).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setModel(preset);
                          setShowModelSuggestions(false);
                        }}
                        className="w-full text-left px-2.5 py-1 text-xs text-slate-700 hover:bg-blue-50 rounded transition-colors flex items-center justify-between"
                      >
                        <span>{preset}</span>
                        <Check className={`w-3 h-3 text-blue-600 ${model === preset ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                    IMEI Number <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateSampleIMEI}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 uppercase"
                    title="Generate dummy valid 15-digit IMEI"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Sample
                  </button>
                </div>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={imei}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, '');
                      setImei(val);
                    }}
                    maxLength={16}
                    placeholder="15-digit IMEI number"
                    className={`w-full pl-8 pr-2.5 py-1.5 text-xs font-mono bg-slate-50 border rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                      errors.imei ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300'
                    }`}
                    id="input-device-imei"
                  />
                </div>
                {errors.imei ? (
                  <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.imei}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {imei.length}/15 digits
                  </p>
                )}
              </div>
            </div>

            {/* Grade Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">
                Device Condition Grade <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GRADES.map((g) => {
                  const isSelected = grade === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGrade(g.value)}
                      className={`px-2.5 py-2 rounded text-xs font-medium border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? `${g.color} ring-1 ring-blue-600 font-semibold shadow-2xs`
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                      id={`grade-btn-${g.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <span className="flex items-center justify-between w-full">
                        {g.label}
                        {isSelected && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                      </span>
                      <span className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{g.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Invoice Number, Amount & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Invoice Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-2026-0001"
                    className={`w-full pl-8 pr-2.5 py-1.5 text-xs font-mono bg-slate-50 border rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                      errors.invoiceNumber ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300'
                    }`}
                    id="input-invoice-number"
                  />
                </div>
                {errors.invoiceNumber && (
                  <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.invoiceNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Amount ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    id="input-invoice-amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RecordStatus)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  id="select-record-status"
                >
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="In Warranty">In Warranty</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">
                Additional Notes / Accessories / Warranty
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Enter details like packaging, accessories, screen condition, memory size..."
                className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                id="input-record-notes"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
                id="cancel-record-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-all flex items-center gap-1.5"
                id="save-record-btn"
              >
                <Check className="w-3.5 h-3.5" />
                {initialRecord ? 'UPDATE RECORD' : 'COMMIT RECORD'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
