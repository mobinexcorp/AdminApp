import React, { useState, useRef } from 'react';
import { CustomerRecord, VendorRecord, SalesRecord } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  FileJson,
  ShieldCheck,
  Save,
  Clock,
  Layers,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface BackupRestoreModalProps {
  records: CustomerRecord[];
  vendors: VendorRecord[];
  sales: SalesRecord[];
  onRestoreBackup: (
    restoredRecords: CustomerRecord[],
    restoredVendors: VendorRecord[],
    restoredSales: SalesRecord[],
    mode: 'replace' | 'merge'
  ) => void;
  onClose: () => void;
  onResetData: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  records,
  vendors,
  sales,
  onRestoreBackup,
  onClose,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  
  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{
    records: CustomerRecord[];
    vendors: VendorRecord[];
    sales: SalesRecord[];
    backupDate?: string;
    version?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConfirmReplaceOpen, setIsConfirmReplaceOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute stats
  const totalEntries = records.length + vendors.length + sales.length;
  const backupObject = {
    app: 'mobinexcorpadmin',
    version: '1.0.0',
    backupDate: new Date().toISOString(),
    summary: {
      totalRecords: records.length,
      totalVendors: vendors.length,
      totalSales: sales.length,
    },
    data: {
      customerRecords: records,
      vendorRecords: vendors,
      salesRecords: sales,
    },
  };

  const backupJsonString = JSON.stringify(backupObject, null, 2);
  const totalBytes = new Blob([backupJsonString]).size;
  const totalKB = (totalBytes / 1024).toFixed(2);

  // 1. Download Backup File
  const handleDownloadBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(backupJsonString);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `mobinexcorpadmin_Backup_${dateStr}_${timeStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy raw JSON to clipboard
  const handleCopyBackup = () => {
    navigator.clipboard.writeText(backupJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 2. Process Restore File
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);

        let restoredRecords: CustomerRecord[] = [];
        let restoredVendors: VendorRecord[] = [];
        let restoredSales: SalesRecord[] = [];
        let backupDate: string | undefined = undefined;
        let version: string | undefined = undefined;

        // Check format 1: Full system backup wrapper { data: { customerRecords, vendorRecords, salesRecords } }
        if (json && typeof json === 'object' && json.data) {
          backupDate = json.backupDate || json.exportedAt;
          version = json.version;

          if (Array.isArray(json.data.customerRecords)) restoredRecords = json.data.customerRecords;
          if (Array.isArray(json.data.vendorRecords)) restoredVendors = json.data.vendorRecords;
          if (Array.isArray(json.data.salesRecords)) restoredSales = json.data.salesRecords;
        } 
        // Format 2: Direct object with customerRecords / vendorRecords / salesRecords keys
        else if (json && typeof json === 'object' && (json.customerRecords || json.vendorRecords || json.salesRecords)) {
          if (Array.isArray(json.customerRecords)) restoredRecords = json.customerRecords;
          if (Array.isArray(json.vendorRecords)) restoredVendors = json.vendorRecords;
          if (Array.isArray(json.salesRecords)) restoredSales = json.salesRecords;
        }
        // Format 3: Plain array of CustomerRecords or VendorRecords or SalesRecords
        else if (Array.isArray(json)) {
          // Detect by first object structure
          const first = json[0];
          if (first) {
            if ('imei' in first && 'customerName' in first) {
              restoredRecords = json;
            } else if ('imei' in first && 'vendorName' in first) {
              restoredVendors = json;
            } else if ('totalInvoicePrice' in first || 'costPrice' in first) {
              restoredSales = json;
            } else {
              restoredRecords = json;
            }
          }
        } else {
          throw new Error('Unrecognized JSON format. File does not contain valid InventoryManager database records.');
        }

        if (restoredRecords.length === 0 && restoredVendors.length === 0 && restoredSales.length === 0) {
          throw new Error('No valid records found in backup file.');
        }

        setParsedData({
          records: restoredRecords,
          vendors: restoredVendors,
          sales: restoredSales,
          backupDate,
          version,
        });
      } catch (err: any) {
        console.error('Failed to parse backup JSON file:', err);
        setErrorMsg(err.message || 'Invalid backup JSON file format.');
        setParsedData(null);
      }
    };

    reader.readAsText(file);
  };

  const applyRestore = () => {
    if (!parsedData) return;

    onRestoreBackup(
      parsedData.records,
      parsedData.vendors,
      parsedData.sales,
      restoreMode
    );

    setSuccessMsg(
      `Successfully restored database! (${parsedData.records.length} IMEI records, ${parsedData.vendors.length} Vendors, ${parsedData.sales.length} Sales entries).`
    );
    setParsedData(null);
    setSelectedFile(null);
  };

  const handleExecuteRestore = () => {
    if (!parsedData) return;

    if (restoreMode === 'replace') {
      setIsConfirmReplaceOpen(true);
    } else {
      applyRestore();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-white flex items-center gap-2">
                Full Database Backup & System Restore Console
              </h3>
              <p className="text-[10px] text-slate-400">
                Safeguard all IMEI List, Vendor Database, and Total Sales Records on your computer.
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

        {/* Tab Selection */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('backup')}
              className={`py-1.5 px-4 rounded flex items-center gap-1.5 transition-colors ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>1. BACKUP DATABASE (EXPORT ALL)</span>
            </button>
            <button
              onClick={() => setActiveTab('restore')}
              className={`py-1.5 px-4 rounded flex items-center gap-1.5 transition-colors ${
                activeTab === 'restore'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>2. RESTORE SYSTEM (IMPORT BACKUP)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-300">
            <HardDrive className="w-3 h-3 text-emerald-600" />
            <span>DATA SIZE: <strong>{totalKB} KB</strong></span>
          </div>
        </div>

        {/* Main Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3.5 space-y-2">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                      Complete Offline System Backup
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Creating a backup saves your entire system database (IMEI List, Vendor Database, and Total Sales Records) into a single secure file on your computer. Keep this file safe on a USB drive or external folder.
                    </p>
                  </div>
                </div>

                {/* Database Breakdown */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded border border-blue-100 flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">IMEI Records</span>
                    <span className="text-blue-700 font-bold text-sm">{records.length}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100 flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Vendors</span>
                    <span className="text-amber-700 font-bold text-sm">{vendors.length}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100 flex flex-col">
                    <span className="text-slate-500 text-[10px] uppercase font-sans font-semibold">Sales Ledger</span>
                    <span className="text-emerald-700 font-bold text-sm">{sales.length}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-50 border border-slate-300 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-xs uppercase">
                    Download Instant System Backup
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Generates a timestamped <code className="bg-slate-200 px-1 py-0.2 rounded font-mono text-[10px]">.json</code> file ready for 1-click restoration.
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyBackup}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Copy backup JSON to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{copied ? 'COPIED' : 'COPY RAW'}</span>
                  </button>
                  <button
                    onClick={handleDownloadBackup}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD BACKUP FILE</span>
                  </button>
                </div>
              </div>

              {/* Safety Instructions */}
              <div className="text-[11px] text-slate-500 bg-amber-50 border border-amber-200 p-3 rounded flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-900 uppercase font-bold">Recommended Backup Routine:</strong>
                  <p className="mt-0.5">
                    Download a new backup whenever you make significant inventory updates, add new vendor invoices, or record large sales batches. If your computer crashes or browser data is cleared, simply open the Restore tab below to recover everything.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'restore' && (
            <div className="space-y-4">
              {/* Success Notification */}
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-300 rounded p-3 flex items-center gap-2.5 text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="font-semibold text-xs">{successMsg}</div>
                </div>
              )}

              {/* Error Notification */}
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-300 rounded p-3 flex items-center gap-2.5 text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div className="font-semibold text-xs">{errorMsg}</div>
                </div>
              )}

              {/* Dropzone for JSON Backup */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-2">
                  <FileJson className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm uppercase">
                  Select or Drop InventoryManager Backup File (.JSON)
                </h4>
                <p className="text-slate-500 text-[11px] mt-1">
                  Upload a previously saved <strong className="text-slate-700 font-mono">InventoryManager_Backup_*.json</strong> file
                </p>
                <button
                  type="button"
                  className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors"
                >
                  Browse Computer Files
                </button>
              </div>

              {/* Parsed Backup Details Preview */}
              {parsedData && (
                <div className="bg-slate-50 border border-slate-300 rounded p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Backup File Verified</span>
                      {selectedFile && (
                        <span className="font-mono text-[10px] text-blue-600 font-normal">
                          ({selectedFile.name})
                        </span>
                      )}
                    </div>
                    {parsedData.backupDate && (
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Date: {new Date(parsedData.backupDate).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Table summary inside backup */}
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-slate-500 text-[10px] uppercase font-sans font-semibold">
                        IMEI Records
                      </div>
                      <div className="text-blue-700 font-bold text-sm">
                        {parsedData.records.length}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-slate-500 text-[10px] uppercase font-sans font-semibold">
                        Vendors
                      </div>
                      <div className="text-amber-700 font-bold text-sm">
                        {parsedData.vendors.length}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-slate-500 text-[10px] uppercase font-sans font-semibold">
                        Sales Ledger
                      </div>
                      <div className="text-emerald-700 font-bold text-sm">
                        {parsedData.sales.length}
                      </div>
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div className="bg-white border border-slate-300 p-2.5 rounded space-y-1.5">
                    <span className="font-bold text-slate-700 uppercase text-[10px] block">
                      Select System Restoration Mode:
                    </span>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-rose-700">Full System Replace (Recommended)</span>
                          <p className="text-[10px] text-slate-500">
                            Replaces current local database with exact backup file contents.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800">Merge & Combine</span>
                          <p className="text-[10px] text-slate-500">
                            Appends backup items without overwriting existing entries.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleExecuteRestore}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>CONFIRM & RESTORE DATABASE NOW</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset Demo Option Footer */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <button
              onClick={onResetData}
              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded font-bold text-[11px] transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-600" /> RESET DEMO DATA
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs shadow-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isConfirmReplaceOpen}
        onClose={() => setIsConfirmReplaceOpen(false)}
        onConfirm={applyRestore}
        title="Replace Database Warning"
        description={`This will REPLACE your current database (${records.length} IMEI records, ${vendors.length} Vendors, ${sales.length} Sales) with the restored backup file.`}
        itemDetails={
          parsedData
            ? [
                { label: 'Backup IMEI Records', value: `${parsedData.records.length}` },
                { label: 'Backup Vendor Records', value: `${parsedData.vendors.length}` },
                { label: 'Backup Sales Ledger', value: `${parsedData.sales.length}` },
              ]
            : []
        }
        confirmText="Confirm & Overwrite Database"
        confirmVariant="danger"
      />
    </div>
  );
};
