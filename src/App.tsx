import React, { useState, useEffect } from 'react';
import { CustomerRecord, VendorRecord, SalesRecord } from './types';
import { INITIAL_RECORDS, INITIAL_VENDORS, INITIAL_SALES } from './data/initialData';
import { RecordFormModal } from './components/RecordFormModal';
import { RecordTable } from './components/RecordTable';
import { RecordStats } from './components/RecordStats';
import { VendorTable } from './components/VendorTable';
import { VendorFormModal } from './components/VendorFormModal';
import { InvoiceReceiptModal } from './components/InvoiceReceiptModal';
import { ExportImportModal } from './components/ExportImportModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { MonthlySalesReportModal } from './components/MonthlySalesReportModal';
import { VendorPriceListModal } from './components/VendorPriceListModal';
import { DistributorPriceCompareModal } from './components/DistributorPriceCompareModal';
import { SalesTable } from './components/SalesTable';
import { SalesStatsVisuals } from './components/SalesStatsVisuals';
import { SalesFormModal } from './components/SalesFormModal';
import {
  Plus,
  FileSpreadsheet,
  RotateCcw,
  Building2,
  ListFilter,
  Layers,
  Upload,
  DollarSign,
  TrendingUp,
  BarChart3,
  HardDrive,
  Database,
  Download,
  Printer,
  Mail,
  FileText,
  Trophy
} from 'lucide-react';

const LOCAL_STORAGE_RECORDS_KEY = 'device_customer_records_v1';
const LOCAL_STORAGE_VENDORS_KEY = 'device_vendor_records_v1';
const LOCAL_STORAGE_SALES_KEY = 'device_sales_records_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'imei_list' | 'vendors' | 'total_sales'>('imei_list');

  // IMEI Records State
  const [records, setRecords] = useState<CustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RECORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load customer records from localStorage', e);
    }
    return INITIAL_RECORDS;
  });

  // Vendor Database State
  const [vendors, setVendors] = useState<VendorRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_VENDORS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load vendor records from localStorage', e);
    }
    return INITIAL_VENDORS;
  });

  // Total Sales State
  const [sales, setSales] = useState<SalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SALES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load sales records from localStorage', e);
    }
    return INITIAL_SALES;
  });

  // Modal & Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomerRecord | null>(null);
  const [viewingInvoiceRecord, setViewingInvoiceRecord] = useState<CustomerRecord | null>(null);

  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorRecord | null>(null);
  const [highlightVendorIMEI, setHighlightVendorIMEI] = useState<string | null>(null);

  const [isSalesFormOpen, setIsSalesFormOpen] = useState(false);
  const [editingSalesRecord, setEditingSalesRecord] = useState<SalesRecord | null>(null);
  const [salesTimePeriod, setSalesTimePeriod] = useState<'daily' | 'monthly' | 'yearly' | 'all'>('all');

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportInitialTarget, setExportInitialTarget] = useState<'records' | 'vendors' | 'sales'>('records');
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [isPriceListOpen, setIsPriceListOpen] = useState(false);
  const [isDistributorCompareOpen, setIsDistributorCompareOpen] = useState(false);

  // Restore whole database
  const handleRestoreBackup = (
    restoredRecords: CustomerRecord[],
    restoredVendors: VendorRecord[],
    restoredSales: SalesRecord[],
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    if (mode === 'replace') {
      setRecords(restoredRecords);
      setVendors(restoredVendors);
      setSales(restoredSales);
    } else {
      if (restoredRecords.length > 0) setRecords((prev) => [...restoredRecords, ...prev]);
      if (restoredVendors.length > 0) setVendors((prev) => [...restoredVendors, ...prev]);
      if (restoredSales.length > 0) setSales((prev) => [...restoredSales, ...prev]);
    }
  };

  // Save records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RECORDS_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save customer records to localStorage', e);
    }
  }, [records]);

  // Save vendors to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VENDORS_KEY, JSON.stringify(vendors));
    } catch (e) {
      console.error('Failed to save vendor records to localStorage', e);
    }
  }, [vendors]);

  // Save sales to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SALES_KEY, JSON.stringify(sales));
    } catch (e) {
      console.error('Failed to save sales records to localStorage', e);
    }
  }, [sales]);

  // Customer Record handlers
  const handleOpenAddForm = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEditRecord = (record: CustomerRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleSaveRecord = (
    recordData: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> | CustomerRecord
  ) => {
    if ('id' in recordData) {
      setRecords((prev) =>
        prev.map((r) => (r.id === recordData.id ? (recordData as CustomerRecord) : r))
      );
    } else {
      const newRecord: CustomerRecord = {
        ...recordData,
        id: `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRecords((prev) => [newRecord, ...prev]);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
  };

  const handleImportRecords = (importedRecords: CustomerRecord[], mode: 'append' | 'replace' = 'append') => {
    if (mode === 'replace') {
      setRecords(importedRecords);
    } else {
      setRecords((prev) => [...importedRecords, ...prev]);
    }
  };

  // Vendor Record handlers
  const handleOpenAddVendor = () => {
    setEditingVendor(null);
    setIsVendorFormOpen(true);
  };

  const handleEditVendor = (vendor: VendorRecord) => {
    setEditingVendor(vendor);
    setIsVendorFormOpen(true);
  };

  const handleSaveVendor = (
    vendorData: Omit<VendorRecord, 'id' | 'createdAt' | 'updatedAt'> | VendorRecord
  ) => {
    if ('id' in vendorData) {
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorData.id ? (vendorData as VendorRecord) : v))
      );
    } else {
      const newVendor: VendorRecord = {
        ...vendorData,
        id: `ven_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setVendors((prev) => [newVendor, ...prev]);
    }
  };

  const handleDeleteVendor = (vendorId: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== vendorId));
  };

  const handleImportVendors = (importedVendors: VendorRecord[], mode: 'append' | 'replace' = 'append') => {
    if (mode === 'replace') {
      setVendors(importedVendors);
    } else {
      setVendors((prev) => [...importedVendors, ...prev]);
    }
  };

  // Total Sales Handlers
  const handleOpenAddSales = () => {
    setEditingSalesRecord(null);
    setIsSalesFormOpen(true);
  };

  const handleEditSales = (record: SalesRecord) => {
    setEditingSalesRecord(record);
    setIsSalesFormOpen(true);
  };

  const handleSaveSales = (
    salesData: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'> | SalesRecord
  ) => {
    if ('id' in salesData) {
      setSales((prev) =>
        prev.map((s) => (s.id === salesData.id ? (salesData as SalesRecord) : s))
      );
    } else {
      const newSalesRecord: SalesRecord = {
        ...salesData,
        id: `sale_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSales((prev) => [newSalesRecord, ...prev]);
    }
  };

  const handleDeleteSales = (recordId: string) => {
    setSales((prev) => prev.filter((s) => s.id !== recordId));
  };

  const handleImportSales = (importedSales: SalesRecord[], mode: 'append' | 'replace' = 'append') => {
    if (mode === 'replace') {
      setSales(importedSales);
    } else {
      setSales((prev) => [...importedSales, ...prev]);
    }
  };

  // Cross Tab Navigation
  const handleJumpToVendor = (imeiOrVendor: string) => {
    setHighlightVendorIMEI(imeiOrVendor);
    setActiveTab('vendors');
  };

  const handleResetSampleData = () => {
    if (confirm('Reset to demo records, vendors, and sales ledger? This will restore initial sample databases.')) {
      setRecords(INITIAL_RECORDS);
      setVendors(INITIAL_VENDORS);
      setSales(INITIAL_SALES);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans text-xs leading-tight flex flex-col justify-between select-none">
      <div>
        {/* Top High Density Navigation Bar */}
        <header className="h-12 bg-[#1a1c1e] text-white flex items-center justify-between px-4 sm:px-6 shrink-0 border-b border-black">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white">
                MA
              </div>
              <span className="font-semibold tracking-tight uppercase text-xs text-slate-100">
                mobinexcorpadmin <span className="text-blue-400 font-mono text-[11px]">v1.0.1</span>
              </span>
            </div>

            {/* Main Tabs */}
            <div className="hidden md:flex items-center gap-1 text-slate-400 font-medium text-[11px] border-l border-slate-700 pl-4">
              <button
                onClick={() => {
                  setActiveTab('imei_list');
                  setHighlightVendorIMEI(null);
                }}
                className={`py-3 px-3 transition-colors font-bold uppercase flex items-center gap-1.5 ${
                  activeTab === 'imei_list'
                    ? 'text-blue-400 border-b-2 border-blue-500'
                    : 'text-slate-400 hover:text-white'
                }`}
                id="tab-imei-list-btn"
              >
                <ListFilter className="w-3.5 h-3.5 text-blue-400" />
                <span>IMEI LIST</span>
                <span className="ml-1 bg-slate-800 text-slate-300 font-mono text-[10px] px-1.5 py-0.2 rounded border border-slate-700">
                  {records.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('vendors')}
                className={`py-3 px-3 transition-colors font-bold uppercase flex items-center gap-1.5 ${
                  activeTab === 'vendors'
                    ? 'text-amber-400 border-b-2 border-amber-500'
                    : 'text-slate-400 hover:text-white'
                }`}
                id="tab-vendors-database-btn"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>VENDORS DATABASE</span>
                <span className="ml-1 bg-slate-800 text-amber-300 font-mono text-[10px] px-1.5 py-0.2 rounded border border-slate-700">
                  {vendors.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('total_sales')}
                className={`py-3 px-3 transition-colors font-bold uppercase flex items-center gap-1.5 ${
                  activeTab === 'total_sales'
                    ? 'text-emerald-400 border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white'
                }`}
                id="tab-total-sales-btn"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>TOTAL SALES RECORD</span>
                <span className="ml-1 bg-slate-800 text-emerald-300 font-mono text-[10px] px-1.5 py-0.2 rounded border border-slate-700">
                  {sales.length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsDistributorCompareOpen(true)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border border-amber-400/80 rounded text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
              id="distributor-price-compare-header-btn"
              title="Compare prices across multiple distributors (PCS, SCAL, ECO ATM, WE SELL CELLULAR)"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-200 fill-amber-200/40" />
              <span className="hidden lg:inline">DISTRIBUTOR PRICE COMPARE</span>
              <span className="lg:hidden">COMPARE PRICES</span>
            </button>

            <button
              onClick={() => setIsPriceListOpen(true)}
              className="px-2.5 py-1.5 bg-amber-900 hover:bg-amber-800 text-amber-100 border border-amber-500/80 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              id="vendor-daily-price-list-header-btn"
              title="Vendor Daily Excel Price List Processor & Markup (+ $10 / + $15)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">DAILY PRICE LIST (+ $10 / + $15)</span>
              <span className="lg:hidden">PRICE LIST</span>
            </button>

            <button
              onClick={() => setIsMonthlyReportOpen(true)}
              className="px-2.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/80 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              id="monthly-pdf-report-header-btn"
              title="Generate Monthly Sales Report in PDF & Excel to Print or Email"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">MONTHLY REPORT (PDF, EXCEL & EMAIL)</span>
              <span className="lg:hidden">MONTHLY REPORT</span>
            </button>

            <button
              onClick={() => setIsBackupRestoreOpen(true)}
              className="px-2.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-blue-200 border border-blue-600/80 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              id="backup-restore-header-btn"
              title="Backup and Restore Full System Database"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden lg:inline">BACKUP & RESTORE DATABASE</span>
              <span className="lg:hidden">BACKUP/RESTORE</span>
            </button>

            <button
              onClick={() => {
                setExportInitialTarget(activeTab === 'vendors' ? 'vendors' : activeTab === 'total_sales' ? 'sales' : 'records');
                setIsExportOpen(true);
              }}
              className="px-3 py-1.5 bg-[#2a2d31] hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors hidden sm:flex"
              id="export-header-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>EXPORT</span>
            </button>

            {activeTab === 'vendors' ? (
              <button
                onClick={handleOpenAddVendor}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                id="add-vendor-header-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW VENDOR ENTRY</span>
              </button>
            ) : activeTab === 'total_sales' ? (
              <button
                onClick={handleOpenAddSales}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                id="add-sales-header-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NEW SALES ENTRY</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddForm}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                id="add-record-header-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>COMMIT RECORD</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden bg-[#2a2d31] border-b border-black px-4 py-1.5 flex items-center justify-around text-[10px] font-bold text-slate-300">
          <button
            onClick={() => {
              setActiveTab('imei_list');
              setHighlightVendorIMEI(null);
            }}
            className={`py-1 px-2 rounded ${activeTab === 'imei_list' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            IMEI ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`py-1 px-2 rounded ${activeTab === 'vendors' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
          >
            VENDORS ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('total_sales')}
            className={`py-1 px-2 rounded ${activeTab === 'total_sales' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            SALES ({sales.length})
          </button>
        </div>

        {/* Main Workspace */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Top KPI Banner */}
          {activeTab === 'total_sales' ? (
            <SalesStatsVisuals
              sales={sales}
              timePeriod={salesTimePeriod}
              onTimePeriodChange={setSalesTimePeriod}
            />
          ) : (
            <RecordStats records={records} />
          )}

          {/* Directory Toolbar */}
          <div className="bg-white border border-slate-300 p-3 rounded shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
                  <span>
                    {activeTab === 'vendors'
                      ? 'Vendors Supplier Database'
                      : activeTab === 'total_sales'
                      ? 'Total Sales & Financial Profit Ledger'
                      : 'Central IMEI Directory Ledger'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  {activeTab === 'vendors'
                    ? 'Manage supplier inventory, device models, 15-digit IMEI cross-linking, invoice numbers, and supplier dates.'
                    : activeTab === 'total_sales'
                    ? 'Track total invoice prices, inventory cost, profit margins, paid-from/paid-by channels, and vendor invoice cross-references.'
                    : 'Showing customer records, device models, 15-digit IMEI verification, condition grades, and invoices.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMonthlyReportOpen(true)}
                className="px-2.5 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 rounded transition-colors flex items-center gap-1 shadow-2xs"
                id="monthly-pdf-report-toolbar-btn"
                title="Generate Monthly PDF Sales Statement to Print & Email"
              >
                <FileText className="w-3 h-3 text-emerald-700" /> MONTHLY REPORT (PDF & EMAIL)
              </button>
              <button
                onClick={() => setIsBackupRestoreOpen(true)}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-400 rounded transition-colors flex items-center gap-1"
                id="backup-restore-toolbar-btn"
              >
                <Database className="w-3 h-3 text-blue-700" /> BACKUP / RESTORE
              </button>
              <button
                onClick={() => {
                  setExportInitialTarget(activeTab === 'vendors' ? 'vendors' : activeTab === 'total_sales' ? 'sales' : 'records');
                  setIsExportOpen(true);
                }}
                className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded transition-colors flex items-center gap-1"
                id="import-excel-toolbar-btn"
              >
                <Upload className="w-3 h-3 text-blue-600" /> IMPORT SPREADSHEET
              </button>
              <button
                onClick={handleResetSampleData}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors flex items-center gap-1"
                id="reset-demo-records-btn"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" /> DEMO DATA
              </button>
            </div>
          </div>

          {/* Active View: IMEI LIST, VENDORS DATABASE, or TOTAL SALES RECORD */}
          {activeTab === 'imei_list' ? (
            <RecordTable
              records={records}
              onEditRecord={handleEditRecord}
              onDeleteRecord={handleDeleteRecord}
              onViewInvoice={setViewingInvoiceRecord}
              onAddNewRecord={handleOpenAddForm}
              onSelectIMEI={handleJumpToVendor}
            />
          ) : activeTab === 'vendors' ? (
            <VendorTable
              vendors={vendors}
              onEditVendor={handleEditVendor}
              onDeleteVendor={handleDeleteVendor}
              onAddNewVendor={handleOpenAddVendor}
              onOpenPriceList={() => setIsPriceListOpen(true)}
              highlightIMEI={highlightVendorIMEI}
            />
          ) : (
            <SalesTable
              sales={sales}
              onEditSales={handleEditSales}
              onDeleteSales={handleDeleteSales}
              onAddNewSales={handleOpenAddSales}
              onSelectVendor={handleJumpToVendor}
              onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Footer Status Bar (High Density Aesthetic) */}
      <footer className="h-7 bg-[#2a2d31] text-[10px] text-slate-400 flex items-center justify-between px-4 border-t border-black shrink-0 font-mono mt-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-slate-300 font-bold">LEDGER ONLINE</span>
          </div>
          <div className="w-px h-3 bg-slate-700"></div>
          <span>NODE: 192.168.1.105</span>
        </div>
        <div className="flex items-center gap-4">
          <span>IMEI RECORDS: {records.length}</span>
          <span>VENDORS: {vendors.length}</span>
          <span>SALES ENTRIES: {sales.length}</span>
          <span>LAST SYNC: JUST NOW</span>
        </div>
      </footer>

      {/* Modals */}
      <RecordFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRecord}
        initialRecord={editingRecord}
      />

      <VendorFormModal
        isOpen={isVendorFormOpen}
        onClose={() => setIsVendorFormOpen(false)}
        onSave={handleSaveVendor}
        initialVendor={editingVendor}
      />

      <SalesFormModal
        isOpen={isSalesFormOpen}
        onClose={() => setIsSalesFormOpen(false)}
        onSave={handleSaveSales}
        initialSales={editingSalesRecord}
        customerRecords={records}
        vendorRecords={vendors}
      />

      <InvoiceReceiptModal
        record={viewingInvoiceRecord}
        onClose={() => setViewingInvoiceRecord(null)}
      />

      {isExportOpen && (
        <ExportImportModal
          records={records}
          vendors={vendors}
          sales={sales}
          onImportRecords={handleImportRecords}
          onImportVendors={handleImportVendors}
          onImportSales={handleImportSales}
          onClose={() => setIsExportOpen(false)}
          initialTarget={exportInitialTarget}
        />
      )}

      {isBackupRestoreOpen && (
        <BackupRestoreModal
          records={records}
          vendors={vendors}
          sales={sales}
          onRestoreBackup={handleRestoreBackup}
          onClose={() => setIsBackupRestoreOpen(false)}
          onResetData={handleResetSampleData}
        />
      )}

      {isMonthlyReportOpen && (
        <MonthlySalesReportModal
          sales={sales}
          onClose={() => setIsMonthlyReportOpen(false)}
        />
      )}

      {isPriceListOpen && (
        <VendorPriceListModal
          onClose={() => setIsPriceListOpen(false)}
          vendorNames={Array.from(new Set(vendors.map((v) => v.vendorName))).filter(Boolean)}
        />
      )}

      {isDistributorCompareOpen && (
        <DistributorPriceCompareModal
          onClose={() => setIsDistributorCompareOpen(false)}
        />
      )}
    </div>
  );
}
