import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CustomerRecord, VendorRecord, SalesRecord, DeviceGrade, RecordStatus } from '../types';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Layers,
  Sparkles,
  Database,
  Check,
  Building2,
  ListFilter,
  DollarSign
} from 'lucide-react';

interface ExportImportModalProps {
  records: CustomerRecord[];
  vendors: VendorRecord[];
  sales?: SalesRecord[];
  onImportRecords: (importedRecords: CustomerRecord[], mode?: 'append' | 'replace') => void;
  onImportVendors: (importedVendors: VendorRecord[], mode?: 'append' | 'replace') => void;
  onImportSales?: (importedSales: SalesRecord[], mode?: 'append' | 'replace') => void;
  onClose: () => void;
  initialTarget?: 'records' | 'vendors' | 'sales';
}

interface ColumnMapping {
  vendorOrCustomer: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  model: string;
  imei: string;
  grade: string;
  invoiceNumber: string;
  invoiceAmount: string;
  status: string;
  notes: string;
  qty: string;
  costPrice: string;
  profit: string;
  vendorInvoiceNumber: string;
  paidFrom: string;
  paidBy: string;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  records,
  vendors,
  sales = [],
  onImportRecords,
  onImportVendors,
  onImportSales,
  onClose,
  initialTarget = 'records',
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [targetDestination, setTargetDestination] = useState<'records' | 'vendors' | 'sales'>(initialTarget);
  
  // Import State
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [mapping, setMapping] = useState<ColumnMapping>({
    vendorOrCustomer: '',
    customerPhone: '',
    customerEmail: '',
    date: '',
    model: '',
    imei: '',
    grade: '',
    invoiceNumber: '',
    invoiceAmount: '',
    status: '',
    notes: '',
    qty: '',
    costPrice: '',
    profit: '',
    vendorInvoiceNumber: '',
    paidFrom: '',
    paidBy: '',
  });

  const [parsedPreviewRecords, setParsedPreviewRecords] = useState<CustomerRecord[]>([]);
  const [parsedPreviewVendors, setParsedPreviewVendors] = useState<VendorRecord[]>([]);
  const [parsedPreviewSales, setParsedPreviewSales] = useState<SalesRecord[]>([]);

  const [step, setStep] = useState<'upload' | 'map' | 'success'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importCount, setImportCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper date parser
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      const [, yyyy, mm, dd] = match;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  // Helper grade parser
  const parseGrade = (val: any): DeviceGrade => {
    if (!val) return 'Grade A';
    const str = String(val).toUpperCase().trim();
    if (str === 'NEW' || str.includes('BRAND')) return 'New';
    if (str === 'A+' || str === 'AB' || str === 'A/B' || str.includes('MINT') || str.includes('LIKE NEW')) return 'Grade A+';
    if (str === 'A' || str.includes('EXCELLENT')) return 'Grade A';
    if (str === 'B' || str.includes('GOOD')) return 'Grade B';
    if (str === 'C' || str.includes('FAIR')) return 'Grade C';
    if (str.includes('REFURB')) return 'Refurbished';
    if (str.includes('PART')) return 'For Parts';
    return 'Grade A';
  };

  // Helper status parser
  const parseStatus = (val: any): RecordStatus => {
    if (!val) return 'Completed';
    const str = String(val).toLowerCase().trim();
    if (str.includes('pend')) return 'Pending';
    if (str.includes('warran')) return 'In Warranty';
    if (str.includes('refund')) return 'Refunded';
    return 'Completed';
  };

  // Generate 15-digit sample IMEI if missing
  const generateIMEI = () => {
    let result = '35';
    for (let i = 0; i < 13; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  };

  // Auto detect headers
  const autoDetectColumns = (cols: string[]): ColumnMapping => {
    const findMatch = (keywords: string[]) => {
      const found = cols.find((col) => {
        const lower = col.toLowerCase().replace(/[^a-z0-9]/g, '');
        return keywords.some((kw) => lower === kw || lower.includes(kw));
      });
      return found || '';
    };

    return {
      vendorOrCustomer: findMatch(['customer', 'vendor', 'supplier', 'client', 'name', 'buyer']),
      customerPhone: findMatch(['phone', 'mobile', 'tel', 'cell', 'contactphone']),
      customerEmail: findMatch(['email', 'mail']),
      date: findMatch(['date', 'created', 'timestamp', 'time']),
      model: findMatch(['model', 'device', 'item', 'product', 'phone']),
      imei: findMatch(['imei', 'sn', 'serial', 'esn']),
      grade: findMatch(['grade', 'condition', 'tier', 'quality']),
      invoiceNumber: findMatch(['invoice', 'invoicenumber', 'inv', 'reciept', 'bill']),
      invoiceAmount: findMatch(['invoiceamount', 'amount', 'price', 'total', 'salesprice']),
      status: findMatch(['status', 'state']),
      notes: findMatch(['notes', 'remark', 'comment', 'description']),
      qty: findMatch(['qty', 'quantity', 'units', 'pcs', 'count']),
      costPrice: findMatch(['cost', 'costprice', 'purchaseprice', 'unitcost']),
      profit: findMatch(['profit', 'netprofit', 'margin']),
      vendorInvoiceNumber: findMatch(['vendorinv', 'vendorinvoicenumber', 'supplierinv']),
      paidFrom: findMatch(['paidfrom', 'paymentmethod', 'source', 'account', 'bank']),
      paidBy: findMatch(['paidby', 'payer', 'paidbyname']),
    };
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawParsedRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      const rows = rawParsedRows.filter(row =>
        Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
      );

      if (rows.length === 0) {
        alert('Selected file contains no readable data rows.');
        return;
      }

      const cols = Object.keys(rows[0] || {});
      setRawRows(rows);
      setDetectedColumns(cols);

      const detectedMapping = autoDetectColumns(cols);
      setMapping(detectedMapping);
      generatePreview(rows, detectedMapping, targetDestination);
      setStep('map');
    } catch (err) {
      console.error('Error reading spreadsheet file', err);
      alert('Failed to parse Excel/CSV file. Please ensure it is a valid .xlsx, .xls, or .csv document.');
    }
  };

  const generatePreview = (rows: Record<string, any>[], map: ColumnMapping, target: 'records' | 'vendors' | 'sales') => {
    const validRows = rows.filter(row =>
      Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '')
    );

    if (target === 'vendors') {
      const parsedVendors: VendorRecord[] = validRows.map((row, index) => {
        const rawIMEI = map.imei ? String(row[map.imei] || '').trim() : '';
        const finalIMEI = rawIMEI.length >= 4 ? rawIMEI : generateIMEI();

        return {
          id: `ven_imp_${Date.now()}_${index}`,
          vendorName: map.vendorOrCustomer ? String(row[map.vendorOrCustomer] || '').trim() || 'Imported Vendor' : 'Imported Vendor',
          date: parseExcelDate(map.date ? row[map.date] : null),
          model: map.model ? String(row[map.model] || '').trim() || 'Generic Device' : 'Generic Device',
          imei: finalIMEI,
          invoiceNumber: map.invoiceNumber ? String(row[map.invoiceNumber] || '').trim() || `INV-VEN-${1000 + index}` : `INV-VEN-${1000 + index}`,
          grade: parseGrade(map.grade ? row[map.grade] : null),
          notes: map.notes ? String(row[map.notes] || '').trim() : 'Imported vendor spreadsheet batch',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      setParsedPreviewVendors(parsedVendors);
    } else if (target === 'sales') {
      const parsedSales: SalesRecord[] = validRows.map((row, index) => {
        const rawAmount = map.invoiceAmount ? parseFloat(String(row[map.invoiceAmount]).replace(/[^0-9.]/g, '')) : 0;
        const rawCost = map.costPrice ? parseFloat(String(row[map.costPrice]).replace(/[^0-9.]/g, '')) : 0;
        let rawProfit = map.profit ? parseFloat(String(row[map.profit]).replace(/[^0-9.-]/g, '')) : NaN;
        const calcProfit = (!isNaN(rawAmount) ? rawAmount : 0) - (!isNaN(rawCost) ? rawCost : 0);
        if (isNaN(rawProfit) || (rawProfit === 0 && calcProfit !== 0)) {
          rawProfit = calcProfit;
        }
        const rawQty = map.qty ? parseInt(String(row[map.qty])) || 1 : 1;

        return {
          id: `sale_imp_${Date.now()}_${index}`,
          invoiceNumber: map.invoiceNumber ? String(row[map.invoiceNumber] || '').trim() || `INV-2026-${1000 + index}` : `INV-2026-${1000 + index}`,
          date: parseExcelDate(map.date ? row[map.date] : null),
          customerName: map.vendorOrCustomer ? String(row[map.vendorOrCustomer] || '').trim() || 'Imported Customer' : 'Imported Customer',
          qty: !isNaN(rawQty) ? rawQty : 1,
          totalInvoicePrice: !isNaN(rawAmount) ? rawAmount : 0,
          costPrice: !isNaN(rawCost) ? rawCost : 0,
          profit: rawProfit,
          vendorName: map.model ? String(row[map.model] || '').trim() : 'Default Supplier',
          vendorInvoiceNumber: map.vendorInvoiceNumber ? String(row[map.vendorInvoiceNumber] || '').trim() : `VEN-${1000 + index}`,
          paidFrom: map.paidFrom ? String(row[map.paidFrom] || '').trim() : 'Chase Checking',
          paidBy: map.paidBy ? String(row[map.paidBy] || '').trim() : 'Customer Direct',
          notes: map.notes ? String(row[map.notes] || '').trim() : 'Imported sales record',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      setParsedPreviewSales(parsedSales);
    } else {
      const parsedRecords: CustomerRecord[] = validRows.map((row, index) => {
        const rawIMEI = map.imei ? String(row[map.imei] || '').trim() : '';
        const finalIMEI = rawIMEI.length >= 4 ? rawIMEI : generateIMEI();
        const rawAmount = map.invoiceAmount ? parseFloat(String(row[map.invoiceAmount]).replace(/[^0-9.]/g, '')) : undefined;

        return {
          id: `rec_imp_${Date.now()}_${index}`,
          customerName: map.vendorOrCustomer ? String(row[map.vendorOrCustomer] || '').trim() || 'Imported Customer' : 'Imported Customer',
          customerPhone: map.customerPhone ? String(row[map.customerPhone] || '').trim() : undefined,
          customerEmail: map.customerEmail ? String(row[map.customerEmail] || '').trim() : undefined,
          date: parseExcelDate(map.date ? row[map.date] : null),
          model: map.model ? String(row[map.model] || '').trim() || 'Generic Device' : 'Generic Device',
          imei: finalIMEI,
          grade: parseGrade(map.grade ? row[map.grade] : null),
          invoiceNumber: map.invoiceNumber ? String(row[map.invoiceNumber] || '').trim() || `INV-IMP-${1000 + index}` : `INV-IMP-${1000 + index}`,
          invoiceAmount: !isNaN(rawAmount as number) ? rawAmount : undefined,
          status: parseStatus(map.status ? row[map.status] : null),
          notes: map.notes ? String(row[map.notes] || '').trim() : 'Imported via CSV/Excel',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      setParsedPreviewRecords(parsedRecords);
    }
  };

  const handleMappingChange = (key: keyof ColumnMapping, value: string) => {
    const updated = { ...mapping, [key]: value };
    setMapping(updated);
    generatePreview(rawRows, updated, targetDestination);
  };

  const handleTargetChange = (newTarget: 'records' | 'vendors' | 'sales') => {
    setTargetDestination(newTarget);
    if (rawRows.length > 0) {
      generatePreview(rawRows, mapping, newTarget);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleExecuteImport = () => {
    if (targetDestination === 'vendors') {
      if (parsedPreviewVendors.length === 0) return;
      onImportVendors(parsedPreviewVendors, importMode);
      setImportCount(parsedPreviewVendors.length);
    } else if (targetDestination === 'sales') {
      if (parsedPreviewSales.length === 0) return;
      if (onImportSales) onImportSales(parsedPreviewSales, importMode);
      setImportCount(parsedPreviewSales.length);
    } else {
      if (parsedPreviewRecords.length === 0) return;
      onImportRecords(parsedPreviewRecords, importMode);
      setImportCount(parsedPreviewRecords.length);
    }
    setStep('success');
  };

  // Template Download
  const downloadSampleTemplate = () => {
    if (targetDestination === 'vendors') {
      const vendorTemplateData = [
        {
          'Vendor Name': 'IMEXEL',
          'Date': '2026-07-20',
          'Model': '17 256GB ACTIVATE',
          'IMEI': '358190684490631',
          'Invoice Number': '1012',
          'Grade': 'NEW',
          'Notes': 'Batch activation unit'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(vendorTemplateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendor Import');
      XLSX.writeFile(wb, 'Vendor_Database_Import_Template.xlsx');
    } else if (targetDestination === 'sales') {
      const salesTemplateData = [
        {
          'Customer Invoice #': 'INV-2026-0081',
          'Date': '2026-08-01',
          'Customer Name': 'Marcus Vance',
          'Qty': 1,
          'Total Invoice Price': 950.00,
          'Cost Price': 780.00,
          'Net Profit': 170.00,
          'Vendor Name': 'AS COMERCIO HAROLDO',
          'Vendor Invoice #': '1018',
          'Paid From': 'Chase Checking #4812',
          'Paid By': 'Marcus Vance (Zelle)',
          'Notes': 'Includes warranty'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(salesTemplateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Ledger Template');
      XLSX.writeFile(wb, 'Total_Sales_Record_Import_Template.xlsx');
    } else {
      const templateData = [
        {
          'Customer Name': 'Marcus Vance',
          'Customer Phone': '+1 (555) 234-5678',
          'Customer Email': 'marcus@example.com',
          'Date': '2026-08-01',
          'Model': 'iPhone 15 Pro Max 256GB',
          'IMEI': '358291048291045',
          'Grade': 'Grade A+',
          'Invoice Number': 'INV-2026-901',
          'Invoice Amount': 899.00,
          'Status': 'Completed',
          'Notes': 'Includes original USB-C cable and box'
        }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');
      XLSX.writeFile(wb, 'Customer_Records_Import_Template.xlsx');
    }
  };

  // Export functions
  const exportToExcel = () => {
    if (targetDestination === 'vendors') {
      const data = vendors.map(v => ({
        'Vendor ID': v.id,
        'Vendor Name': v.vendorName,
        'Date': v.date,
        'Model': v.model,
        'IMEI': v.imei,
        'Invoice Number': v.invoiceNumber,
        'Grade': v.grade || '',
        'Notes': v.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendor Database');
      XLSX.writeFile(wb, `vendor_database_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (targetDestination === 'sales') {
      const data = sales.map(s => {
        const rev = s.totalInvoicePrice || 0;
        const cost = s.costPrice || 0;
        const calc = rev - cost;
        const profitVal = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calc;
        return {
          'Invoice Number': s.invoiceNumber,
          'Date': s.date,
          'Customer Name': s.customerName,
          'Qty': s.qty || 1,
          'Total Invoice Price': rev,
          'Cost Price': cost,
          'Net Profit': profitVal,
          'Vendor Name': s.vendorName,
          'Vendor Invoice Number': s.vendorInvoiceNumber,
          'Paid From': s.paidFrom,
          'Paid By': s.paidBy,
          'Notes': s.notes || '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Ledger');
      XLSX.writeFile(wb, `total_sales_records_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const data = records.map(r => ({
        'ID': r.id,
        'Customer Name': r.customerName,
        'Customer Phone': r.customerPhone || '',
        'Customer Email': r.customerEmail || '',
        'Date': r.date,
        'Model': r.model,
        'IMEI': r.imei,
        'Grade': r.grade,
        'Invoice Number': r.invoiceNumber,
        'Invoice Amount': r.invoiceAmount !== undefined ? r.invoiceAmount : '',
        'Status': r.status,
        'Notes': r.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customer Records');
      XLSX.writeFile(wb, `customer_records_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const exportToCSV = () => {
    if (targetDestination === 'vendors') {
      const data = vendors.map(v => ({
        'Vendor Name': v.vendorName,
        'Date': v.date,
        'Model': v.model,
        'IMEI': v.imei,
        'Invoice Number': v.invoiceNumber,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendor Database');
      XLSX.writeFile(wb, `vendor_database_${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
    } else if (targetDestination === 'sales') {
      const data = sales.map(s => {
        const rev = s.totalInvoicePrice || 0;
        const cost = s.costPrice || 0;
        const calc = rev - cost;
        const profitVal = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calc;
        return {
          'Invoice Number': s.invoiceNumber,
          'Date': s.date,
          'Customer Name': s.customerName,
          'Qty': s.qty || 1,
          'Total Invoice Price': rev,
          'Cost Price': cost,
          'Net Profit': profitVal,
          'Vendor Name': s.vendorName,
          'Vendor Invoice Number': s.vendorInvoiceNumber,
          'Paid From': s.paidFrom,
          'Paid By': s.paidBy,
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Ledger');
      XLSX.writeFile(wb, `total_sales_records_${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
    } else {
      const data = records.map(r => ({
        'Customer Name': r.customerName,
        'Date': r.date,
        'Model': r.model,
        'IMEI': r.imei,
        'Grade': r.grade,
        'Invoice Number': r.invoiceNumber,
        'Invoice Amount': r.invoiceAmount !== undefined ? r.invoiceAmount : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customer Records');
      XLSX.writeFile(wb, `customer_records_${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
    }
  };

  const exportToJSON = () => {
    const exportObj = targetDestination === 'vendors' ? vendors : targetDestination === 'sales' ? sales : records;
    const filename = targetDestination === 'vendors' ? 'vendor_database_backup' : targetDestination === 'sales' ? 'sales_records_backup' : 'customer_records_backup';
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white">
              IM
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-white flex items-center gap-2">
                Spreadsheet Import & Export Console
              </h3>
              <p className="text-[10px] text-slate-400">
                Import and map spreadsheets to IMEI List, Vendor Database, or Total Sales Ledger.
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

        {/* Tab Selector & Target Selector */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-semibold shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('import')}
              className={`py-1.5 px-3 rounded flex items-center gap-1.5 transition-colors ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>IMPORT SPREADSHEET</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-1.5 px-3 rounded flex items-center gap-1.5 transition-colors ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT DATA</span>
            </button>
          </div>

          {/* Destination Target Switcher */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded text-[11px]">
            <button
              onClick={() => handleTargetChange('records')}
              className={`px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 ${
                targetDestination === 'records'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3 h-3 text-blue-600" />
              <span>IMEI LIST ({records.length})</span>
            </button>
            <button
              onClick={() => handleTargetChange('vendors')}
              className={`px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 ${
                targetDestination === 'vendors'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3 h-3 text-amber-600" />
              <span>VENDORS ({vendors.length})</span>
            </button>
            <button
              onClick={() => handleTargetChange('sales')}
              className={`px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 ${
                targetDestination === 'sales'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span>SALES ({sales.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'import' && (
            <>
              {step === 'upload' && (
                <div className="space-y-4">
                  {/* Template Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">
                          {targetDestination === 'vendors' ? 'Vendor Import Format' : targetDestination === 'sales' ? 'Total Sales Record Format' : 'IMEI List Import Format'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {targetDestination === 'vendors'
                            ? 'Download sample XLSX with Vendor, Model, IMEI, Invoice #, Date & Grade.'
                            : targetDestination === 'sales'
                            ? 'Download sample XLSX with Invoice #, Date, Customer, Qty, Total Price, Cost, Profit & Payment info.'
                            : 'Download sample XLSX with Customer, Model, IMEI, Invoice & Grade.'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={downloadSampleTemplate}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-bold text-[11px] shrink-0 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> TEMPLATE (.XLSX)
                    </button>
                  </div>

                  {/* Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".xlsx, .xls, .csv, .json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm uppercase">
                      Drop {targetDestination === 'vendors' ? 'Vendor' : targetDestination === 'sales' ? 'Sales Ledger' : 'Device'} Excel or CSV File Here
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-1">
                      Supports <strong className="text-slate-700">.XLSX, .XLS, .CSV</strong> spreadsheets
                    </p>
                    <button
                      type="button"
                      className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors"
                    >
                      Browse Local Files
                    </button>
                  </div>
                </div>
              )}

              {step === 'map' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-100 border border-slate-300 p-2.5 rounded">
                    <div>
                      <span className="font-bold text-slate-800 uppercase">File:</span>{' '}
                      <span className="font-mono text-blue-600">{fileName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-600 text-white px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase">
                        Target: {targetDestination === 'vendors' ? 'Vendors Database' : targetDestination === 'sales' ? 'Total Sales Record' : 'IMEI List'}
                      </span>
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                        {rawRows.length} ROWS
                      </span>
                    </div>
                  </div>

                  {/* Field Mapping Grid */}
                  <div>
                    <h4 className="font-bold text-slate-700 uppercase mb-2 text-[11px] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-blue-600" /> Map Spreadsheet Columns
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-300 p-3 rounded">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Customer / Vendor Name
                        </label>
                        <select
                          value={mapping.vendorOrCustomer}
                          onChange={(e) => handleMappingChange('vendorOrCustomer', e.target.value)}
                          className="w-full mt-0.5 p-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="">-- Select Column --</option>
                          {detectedColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Invoice Number</label>
                        <select
                          value={mapping.invoiceNumber}
                          onChange={(e) => handleMappingChange('invoiceNumber', e.target.value)}
                          className="w-full mt-0.5 p-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="">-- Select Column --</option>
                          {detectedColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Date</label>
                        <select
                          value={mapping.date}
                          onChange={(e) => handleMappingChange('date', e.target.value)}
                          className="w-full mt-0.5 p-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="">-- Select Column --</option>
                          {detectedColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Total Sales Price ($)</label>
                        <select
                          value={mapping.invoiceAmount}
                          onChange={(e) => handleMappingChange('invoiceAmount', e.target.value)}
                          className="w-full mt-0.5 p-1 text-xs border border-slate-300 rounded bg-white"
                        >
                          <option value="">-- Select Column --</option>
                          {detectedColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      {targetDestination === 'sales' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Cost Price ($)</label>
                            <select
                              value={mapping.costPrice}
                              onChange={(e) => handleMappingChange('costPrice', e.target.value)}
                              className="w-full mt-0.5 p-1 text-xs border border-slate-300 rounded bg-white"
                            >
                              <option value="">-- Select Column --</option>
                              {detectedColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Quantity (Qty)</label>
                            <select
                              value={mapping.qty}
                              onChange={(e) => handleMappingChange('qty', e.target.value)}
                              className="w-full mt-0.5 p-1 text-xs border border-slate-300 rounded bg-white"
                            >
                              <option value="">-- Select Column --</option>
                              {detectedColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div className="flex items-center gap-4 bg-slate-100 border border-slate-300 p-2.5 rounded">
                    <span className="font-bold text-slate-700 uppercase text-[10px]">Import Mode:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-blue-600"
                      />
                      <span>Append to Existing Ledger</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-blue-600"
                      />
                      <span className="text-rose-600 font-bold">Replace Database</span>
                    </label>
                  </div>

                  {/* Modal Action Footer */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => setStep('upload')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 font-semibold"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> COMMIT IMPORT ({targetDestination === 'vendors' ? parsedPreviewVendors.length : targetDestination === 'sales' ? parsedPreviewSales.length : parsedPreviewRecords.length} ENTRIES)
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 border border-emerald-300 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800 uppercase">Import Successfully Completed</h3>
                  <p className="text-slate-600 text-xs">
                    Successfully imported <strong className="text-blue-600 font-mono text-sm">{importCount}</strong> entries into the{' '}
                    <strong className="text-slate-800 uppercase">{targetDestination.toUpperCase()}</strong>.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs"
                    >
                      Close & View Entries
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'export' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Exporting database for <strong className="text-slate-900 font-bold uppercase">{targetDestination === 'vendors' ? 'Vendors Database' : targetDestination === 'sales' ? 'Total Sales Ledger' : 'IMEI List'}</strong> ({targetDestination === 'vendors' ? vendors.length : targetDestination === 'sales' ? sales.length : records.length} records).
              </p>

              <div className="space-y-2 pt-1">
                <button
                  onClick={exportToExcel}
                  className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded flex items-center justify-between text-emerald-900 font-bold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Export to Microsoft Excel Worksheets</span>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded font-mono text-[10px]">
                    .XLSX
                  </span>
                </button>

                <button
                  onClick={exportToCSV}
                  className="w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded flex items-center justify-between text-blue-900 font-bold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-700" />
                    <span>Export to Comma-Separated Values</span>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-blue-300 text-blue-800 rounded font-mono text-[10px]">
                    .CSV
                  </span>
                </button>

                <button
                  onClick={exportToJSON}
                  className="w-full p-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded flex items-center justify-between text-slate-800 font-bold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-700" />
                    <span>Download Full Backup Ledger (JSON)</span>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 rounded font-mono text-[10px]">
                    .JSON
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
