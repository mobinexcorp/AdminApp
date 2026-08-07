import React, { useState, useMemo, useRef } from 'react';
import { DistributorPriceComparisonRow } from '../types';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  X,
  Search,
  Maximize2,
  Minimize2,
  Trophy,
  TrendingDown,
  Sparkles,
  ArrowUpDown,
  Download,
  Printer,
  Upload,
  CheckCircle2,
  RefreshCw,
  Plus,
  Zap,
  Tag,
  Filter,
  DollarSign,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen
} from 'lucide-react';

export const INITIAL_DISTRIBUTOR_CSV = `GRADE A,PCS,SCAL,ECO ATM,WE SELL CELLULAR
IPHONE 12 64GB,$190,$0 ,$165 ,$0
IPHONE 12 128GB,$220,$209 ,$215 ,$0
IPHONE 12 256GB,$240,$0 ,$0 ,$0
IPHONE 12 PRO MAX 128GB,$300,,$0 ,$0
PHONE 13 MINI 128GB,$235,$0 ,$0 ,$0
IPHONE 13 128GB,$265,$263 ,$245 ,$285
PHONE 13 256GB,$295,$282 ,$269 ,$0
IPHONE 13 PRO 128GB,,,$345 ,
IPHONE 13 PRO MAX 128GB,,,$415 ,
IPHONE 14 128GB,$290,$285 ,$280 ,$290
IPHONE 14 256GB,,$311 ,$299 ,$0
PHONE 14 PLUS 128GB,$310,$308 ,$285 ,$0
PHONE 14 PLUS 256GB,$335,$0 ,$309 ,$0
IPHONE 14 PRO 128GB,$400,$425 ,$405 ,$0
IPHONE 14 PRO 256GB,$430,$0 ,$415 ,$0
IPHONE 14 PRO 512GB,$455,,$0 ,$0
IPHONE 14 PRO MAX 128GB,$485,$500 ,$499 ,$0
IPHONE 14 PRO MAX 256GB,$0,,$0 ,$530
IPHONE 15 128GB,$395,$0 ,$380 ,$410
PHONE 15 256GB,$425,$0 ,$0 ,$0
IPHONE 15 PLUS 128GB,$415,$0 ,$399 ,$0
IPHONE 15 PLUS 256GB,$445,,$445 ,$0
IPHONE 15 PRO 256GB,,,$570 ,
IPHONE 15 PRO MAX 256GB,$0,$0 ,$619 ,$635
IPHONE 15 PRO MAX 512GB,,,$655 ,
IPHONE 15 PRO MAX 1TB,$665,,$0 ,$0
IPHINE 16 128GB,,,$545 ,
IPHONE 16 PLUS 128GB,$575,$580 ,$555 ,$0
IPHONE 16 PLUS 256GB,$605,$0 ,$605 ,$0
IPHONE 16 PRO 128GB,,,$655 ,
IPHONE 16 PRO 256GB,,,$685 ,
IPHONE 16 PRO MAX 256GB,$780,$838 ,$830 ,$865
IPHONE 16 PRO MAX 512GB,$810,$0 ,$825 ,$0
IPHONE 16 PRO MAX 1TB,$830,$0 ,$859 ,$0
IPHONE 16E 128GB,$350,$363 ,$355 ,$385
IPHONE 17 256GB,$680,$0 ,$665 ,$0
PHONE 17 PRO 256GB,"$1,010",$993 ,$995 ,$0
PHONE 17 PRO 512GB,"$1,090","$1,100 ","$1,025 ",$0
PHONE 17 PRO 1TB,"$1,170",$0 ,$0 ,$0
IPHONE17 PRO MAX 256GB,,,"$1,099 ",
IPHONE 17 PRO MAX 512GB,,,"$1,169 ",
IPHONE 17 PRO MAX 2TB,,,"$1,320 ",
IPHONE 17 AIR 256GB,,,$729 ,
IPHOBE 17 AIR 512GB,,,"$1,070 ",`;

export const EXCEL_TEMPLATE_WHOLESALE_5_DISTRIBUTORS = `GRADE A+,PCS,SCAL,ECO ATM,WE SELL CELLULAR,TEKCOM
IPHONE 13 128GB,$265,$263,$245,$285,$255
IPHONE 14 128GB,$290,$285,$280,$290,$278
IPHONE 14 PRO MAX 128GB,$485,$500,$499,$510,$480
IPHONE 15 128GB,$395,$405,$380,$410,$375
IPHONE 15 PRO MAX 256GB,$620,$630,$619,$635,$610
IPHONE 16 128GB,$550,$560,$545,$565,$540
IPHONE 16 PRO MAX 256GB,$780,$838,$830,$865,$815
IPHONE 17 PRO 256GB,$1010,$993,$995,$1020,$985
IPHONE 17 PRO MAX 256GB,$1120,$1110,$1099,$1130,$1085`;

export const EXCEL_TEMPLATE_PRO_MAX_FLAGSHIPS = `GRADE A PRO MAX,PCS,SCAL,ECO ATM,WE SELL CELLULAR,TEKCOM,MOBINEX
IPHONE 13 PRO MAX 128GB,$420,$425,$415,$430,$410,$418
IPHONE 14 PRO MAX 128GB,$485,$500,$499,$510,$480,$490
IPHONE 14 PRO MAX 256GB,$525,$530,$515,$535,$510,$520
IPHONE 15 PRO MAX 256GB,$620,$630,$619,$635,$610,$615
IPHONE 15 PRO MAX 512GB,$660,$670,$655,$675,$650,$658
IPHONE 16 PRO MAX 256GB,$780,$838,$830,$865,$815,$820
IPHONE 16 PRO MAX 512GB,$810,$835,$825,$850,$805,$815
IPHONE 17 PRO MAX 256GB,$1120,$1110,$1099,$1130,$1085,$1095
IPHONE 17 PRO MAX 512GB,$1180,$1190,$1169,$1200,$1160,$1175`;

export const EXCEL_TEMPLATE_BLANK_MATRIX = `GRADE A,PCS,SCAL,ECO ATM,WE SELL CELLULAR,TEKCOM
IPHONE 13 128GB,$0,$0,$0,$0,$0
IPHONE 14 128GB,$0,$0,$0,$0,$0
IPHONE 15 128GB,$0,$0,$0,$0,$0
IPHONE 16 128GB,$0,$0,$0,$0,$0
IPHONE 17 PRO MAX 256GB,$0,$0,$0,$0,$0`;

export const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const parsePriceValue = (val: string | undefined | null): number => {
  if (!val) return 0;
  const cleaned = String(val).replace(/[\$,\s"]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? 0 : num;
};

export const normalizeModelName = (name: string, enableNormalize = true): string => {
  if (!name) return '';
  let str = name.trim();
  if (!enableNormalize) return str;

  // Fix typos
  str = str.replace(/\bIPHINE\b/gi, 'IPHONE');
  str = str.replace(/\bIPHOBE\b/gi, 'IPHONE');
  str = str.replace(/\bIPHONE17\b/gi, 'IPHONE 17');
  str = str.replace(/\bPHONE\b/gi, 'IPHONE');

  if (/^\d+/.test(str)) {
    str = 'IPHONE ' + str;
  }

  return str.replace(/\s+/g, ' ').trim();
};

export const parseDistributorMatrixData = (
  rawText: string,
  autoNormalize = true
): { distributors: string[]; rows: DistributorPriceComparisonRow[]; gradeName: string } => {
  const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { distributors: [], rows: [], gradeName: 'GRADE A' };
  }

  const headerCols = parseCsvLine(lines[0]);
  const gradeName = headerCols[0] || 'GRADE A';
  const distributors = headerCols.slice(1).map((d) => d.trim()).filter(Boolean);

  const rows: DistributorPriceComparisonRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0) continue;

    const rawModel = cols[0];
    if (!rawModel) continue;

    const cleanModel = normalizeModelName(rawModel, autoNormalize);
    const prices: Record<string, number> = {};

    let bestDistributor = '';
    let bestPrice = Infinity;
    let worstPrice = -Infinity;
    let activeCount = 0;

    distributors.forEach((dist, idx) => {
      const priceVal = parsePriceValue(cols[idx + 1]);
      prices[dist] = priceVal;

      if (priceVal > 0) {
        activeCount++;
        if (priceVal < bestPrice) {
          bestPrice = priceVal;
          bestDistributor = dist;
        }
        if (priceVal > worstPrice) {
          worstPrice = priceVal;
        }
      }
    });

    const finalBestPrice = bestPrice === Infinity ? 0 : bestPrice;
    const finalWorstPrice = worstPrice === -Infinity ? 0 : worstPrice;
    const savings = activeCount > 1 ? finalWorstPrice - finalBestPrice : 0;

    rows.push({
      id: `dist_row_${i}_${Date.now()}`,
      model: cleanModel,
      grade: gradeName,
      prices,
      bestDistributor: finalBestPrice > 0 ? bestDistributor : undefined,
      bestPrice: finalBestPrice > 0 ? finalBestPrice : 0,
      worstPrice: finalWorstPrice > 0 ? finalWorstPrice : 0,
      savings: Math.max(0, Math.round(savings * 100) / 100),
      activeCount,
    });
  }

  return { distributors, rows, gradeName };
};

interface DistributorPriceCompareModalProps {
  onClose: () => void;
  onApplyBestPriceList?: (bestItems: { itemName: string; vendorCost: number; vendorName: string }[]) => void;
}

export const DistributorPriceCompareModal: React.FC<DistributorPriceCompareModalProps> = ({
  onClose,
  onApplyBestPriceList,
}) => {
  const [rawTextData, setRawTextData] = useState<string>(INITIAL_DISTRIBUTOR_CSV);
  const [autoNormalize, setAutoNormalize] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [seriesFilter, setSeriesFilter] = useState<string>('All');
  const [distributorFilter, setDistributorFilter] = useState<string>('All');
  const [onlyMultipleQuotes, setOnlyMultipleQuotes] = useState<boolean>(false);
  const [onlyHighSavings, setOnlyHighSavings] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'model' | 'bestPrice' | 'savings'>('model');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Copy/Success Notice State
  const [notice, setNotice] = useState<string | null>(null);

  // Parse Matrix Data
  const { distributors, rows, gradeName } = useMemo(() => {
    return parseDistributorMatrixData(rawTextData, autoNormalize);
  }, [rawTextData, autoNormalize]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalModels = rows.length;
    const winCounts: Record<string, number> = {};
    const totalPotentialSavings = rows.reduce((acc, r) => acc + (r.savings || 0), 0);

    distributors.forEach((d) => (winCounts[d] = 0));

    rows.forEach((r) => {
      if (r.bestDistributor && winCounts[r.bestDistributor] !== undefined) {
        winCounts[r.bestDistributor]++;
      }
    });

    let topWinner = '';
    let maxWins = -1;
    Object.entries(winCounts).forEach(([dist, count]) => {
      if (count > maxWins) {
        maxWins = count;
        topWinner = dist;
      }
    });

    return { totalModels, winCounts, totalPotentialSavings, topWinner, maxWins };
  }, [rows, distributors]);

  // Available Series for Pills
  const seriesOptions = ['All', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16', 'iPhone 17'];

  // Filter & Sort Rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!row.model.toLowerCase().includes(q)) return false;
        }

        if (seriesFilter !== 'All') {
          if (!row.model.toUpperCase().includes(seriesFilter.toUpperCase())) {
            return false;
          }
        }

        if (distributorFilter !== 'All') {
          if (row.bestDistributor !== distributorFilter) {
            return false;
          }
        }

        if (onlyMultipleQuotes && (row.activeCount || 0) < 2) {
          return false;
        }

        if (onlyHighSavings && (row.savings || 0) < 10) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'model') {
          cmp = a.model.localeCompare(b.model);
        } else if (sortBy === 'bestPrice') {
          cmp = (a.bestPrice || 0) - (b.bestPrice || 0);
        } else if (sortBy === 'savings') {
          cmp = (a.savings || 0) - (b.savings || 0);
        }

        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [rows, searchQuery, seriesFilter, distributorFilter, onlyMultipleQuotes, onlyHighSavings, sortBy, sortOrder]);

  // Handle Export CSV
  const handleExportCsv = () => {
    let csv = `${gradeName || 'GRADE A'},${distributors.join(',')},BEST DISTRIBUTOR,BEST PRICE,SAVINGS\n`;

    rows.forEach((r) => {
      const priceVals = distributors.map((d) => (r.prices[d] ? `$${r.prices[d]}` : '$0')).join(',');
      csv += `"${r.model}",${priceVals},"${r.bestDistributor || 'N/A'}","$${r.bestPrice || 0}","$${r.savings || 0}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `distributor_price_comparison_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setNotice('Exported Distributor Price Matrix to CSV!');
    setTimeout(() => setNotice(null), 3000);
  };

  // Handle Export Best Prices Only
  const handleExportBestDealsCsv = () => {
    let csv = `MODEL,BEST DISTRIBUTOR,LOWEST COST PRICE,TOTAL DISTRIBUTORS QUOTED,SAVINGS VS HIGHEST\n`;

    rows.forEach((r) => {
      if (r.bestDistributor && r.bestPrice) {
        csv += `"${r.model}","${r.bestDistributor}","$${r.bestPrice}",${r.activeCount || 1},"$${r.savings || 0}"\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `best_distributor_deals_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setNotice('Exported Best Deals List to CSV!');
    setTimeout(() => setNotice(null), 3000);
  };

  // Handle Print
  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Distributor Price Comparison - ${gradeName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #1e293b; }
            h2 { font-size: 16px; margin-bottom: 4px; text-transform: uppercase; }
            p { margin-top: 0; color: #64748b; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #0f172a; color: white; text-transform: uppercase; font-size: 10px; }
            .best { background-color: #dcfce7; font-weight: bold; color: #166534; }
            .highest { background-color: #ffe4e6; color: #9f1239; }
            .savings { font-weight: bold; color: #15803d; }
            .winner-badge { background-color: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Distributor Price Comparison Matrix (${gradeName})</h2>
          <p>Generated on ${new Date().toLocaleDateString()} | Comparing ${distributors.length} Distributors (${distributors.join(', ')}) across ${rows.length} Phone Models</p>
          
          <table>
            <thead>
              <tr>
                <th>iPhone Model</th>
                ${distributors.map((d) => `<th>${d}</th>`).join('')}
                <th>Best Distributor</th>
                <th>Lowest Price</th>
                <th>Potential Savings</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((r) => {
                  return `
                    <tr>
                      <td><strong>${r.model}</strong></td>
                      ${distributors
                        .map((d) => {
                          const p = r.prices[d];
                          const isBest = p > 0 && d === r.bestDistributor;
                          const isWorst = p > 0 && p === r.worstPrice && (r.activeCount || 0) > 1;
                          const cls = isBest ? 'best' : isWorst ? 'highest' : '';
                          return `<td class="${cls}">${p > 0 ? '$' + p : '-'}</td>`;
                        })
                        .join('')}
                      <td><span class="winner-badge">${r.bestDistributor || 'N/A'}</span></td>
                      <td class="best">$${r.bestPrice || 0}</td>
                      <td class="savings">${r.savings ? '+$' + r.savings : '-'}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  // Process pasted data
  const handleProcessPastedData = () => {
    if (!pastedText.trim()) return;
    setRawTextData(pastedText);
    setShowPasteModal(false);
    setPastedText('');
    setNotice('Successfully loaded & updated Distributor Price Comparison Matrix!');
    setTimeout(() => setNotice(null), 3500);
  };

  const excelInputRef = useRef<HTMLInputElement>(null);

  // Direct Excel file upload (.xlsx, .xls, .csv)
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const csvText = XLSX.utils.sheet_to_csv(sheet);
        if (csvText && csvText.trim().length > 0) {
          setRawTextData(csvText);
          setShowPasteModal(false);
          setNotice(`Successfully loaded Excel file "${file.name}" with data!`);
          setTimeout(() => setNotice(null), 4000);
        } else {
          alert('The uploaded Excel sheet appears to be empty.');
        }
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        alert('Could not parse Excel file. Please upload a valid .xlsx or .csv spreadsheet.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Download Excel Template pre-populated with data
  const handleDownloadExcelTemplate = () => {
    const sheetData: (string | number)[][] = [
      [gradeName || 'GRADE A', ...distributors]
    ];

    rows.forEach((r) => {
      const rowCells: (string | number)[] = [r.model];
      distributors.forEach((d) => {
        rowCells.push(r.prices[d] || 0);
      });
      sheetData.push(rowCells);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 32 }, ...distributors.map(() => ({ wch: 18 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Distributor Comparison');

    XLSX.writeFile(wb, `Distributor_Price_Comparison_Template_${new Date().toISOString().substring(0, 10)}.xlsx`);
    setNotice('Downloaded Excel Template with Data! Open in Excel, edit prices, and re-upload.');
    setTimeout(() => setNotice(null), 4000);
  };

  // Push Best Prices to Vendor Price List
  const handleApplyBestPricesToPriceList = () => {
    if (!onApplyBestPriceList) return;

    const bestItems = rows
      .filter((r) => r.bestPrice && r.bestPrice > 0 && r.bestDistributor)
      .map((r) => ({
        itemName: r.model,
        vendorCost: r.bestPrice || 0,
        vendorName: r.bestDistributor || 'BEST DISTRIBUTOR',
      }));

    if (bestItems.length === 0) return;

    onApplyBestPriceList(bestItems);
    setNotice(`Pushed ${bestItems.length} Best Distributor Prices into Price List Processor!`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs select-none transition-all duration-200 ${
        isFullScreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      <div
        className={`bg-white overflow-hidden flex flex-col transition-all duration-200 ${
          isFullScreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0'
            : 'rounded-xl border border-slate-300 shadow-2xl w-full max-w-7xl max-h-[96vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-2.5 bg-[#0f172a] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center font-bold text-white shadow-md border border-amber-400/40">
              <Trophy className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs uppercase tracking-tight text-white flex items-center gap-2">
                  <span>Distributor Price Comparison Tool</span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    BEST DEAL CALCULATOR
                  </span>
                </h3>
              </div>
              <p className="text-[10px] text-slate-400">
                Compare cost prices across multiple distributors ({distributors.join(', ')}), automatically identify the cheapest supplier, and maximize profit margins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={excelInputRef}
              onChange={handleExcelFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Upload any Excel spreadsheet (.xlsx, .xls, .csv) with distributor price data"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Load Excel File</span>
              <span className="sm:hidden">Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Download clean Excel template sheet pre-filled with data to edit and upload"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Download Excel Template</span>
              <span className="md:hidden">Template</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="px-2.5 py-1 bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-600/60 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Paste / Import Matrix</span>
              <span className="sm:hidden">Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="px-2.5 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold border border-slate-700/80"
              title={isFullScreen ? 'Exit Fullscreen' : 'Full Screen Mode'}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline text-amber-300">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline text-slate-200">Full Screen</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice Alert Banner */}
        {notice && (
          <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-white hover:text-emerald-200 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Distributor Leaderboard & Summary Cards */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
            {/* Winner Overview Card */}
            <div className="col-span-2 md:col-span-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Top Winner Distributor</span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  <span>{stats.topWinner || 'None'}</span>
                  <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {stats.maxWins} Best Prices
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Lowest price on {Math.round((stats.maxWins / (stats.totalModels || 1)) * 100)}% of models
                </div>
              </div>
            </div>

            {/* Total Potential Savings Card */}
            <div className="col-span-2 md:col-span-3 bg-emerald-50 border border-emerald-300/80 rounded-lg p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Total Margin Savings Gap</span>
                </div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">
                  ${stats.totalPotentialSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-800 mt-0.5">
                  Difference between highest & lowest quotes
                </div>
              </div>
            </div>

            {/* Individual Distributor Win Pills */}
            <div className="col-span-2 md:col-span-5 bg-white border border-slate-300 rounded-lg p-2.5 flex flex-col justify-center">
              <div className="text-[10px] font-extrabold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                <span>Distributor Best-Price Share</span>
                <span className="text-[10px] font-mono text-slate-500">{stats.totalModels} Total Models</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {distributors.map((d) => {
                  const wins = stats.winCounts[d] || 0;
                  const isTop = d === stats.topWinner;
                  return (
                    <button
                      key={d}
                      onClick={() => setDistributorFilter(distributorFilter === d ? 'All' : d)}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 border ${
                        distributorFilter === d
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : isTop
                          ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>{d}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isTop ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {wins}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters Bar */}
        <div className="bg-slate-50 border-b border-slate-300 px-4 py-2.5 flex flex-wrap gap-2.5 items-center justify-between text-xs shrink-0">
          {/* Search Input & Model Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search model, e.g. 15 Pro Max, 256GB..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Series Filter Pills */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-300 pl-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Series:</span>
              {seriesOptions.map((series) => (
                <button
                  key={series}
                  onClick={() => setSeriesFilter(series)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                    seriesFilter === series
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {series}
                </button>
              ))}
            </div>

            {/* Toggle Toggles */}
            <div className="flex items-center gap-2 border-l border-slate-300 pl-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={onlyMultipleQuotes}
                  onChange={(e) => setOnlyMultipleQuotes(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Multiple Quotes Only</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded hover:bg-emerald-100">
                <input
                  type="checkbox"
                  checked={onlyHighSavings}
                  onChange={(e) => setOnlyHighSavings(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span>Savings &gt; $10</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 px-2.5 py-1 rounded hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={autoNormalize}
                  onChange={(e) => setAutoNormalize(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Fix Model Typos</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onApplyBestPriceList && (
              <button
                onClick={handleApplyBestPricesToPriceList}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 border border-emerald-700"
                title="Send Best Cost Prices directly to Daily Vendor Price List Processor"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Apply Best Prices To Price List</span>
              </button>
            )}

            <button
              onClick={handleExportBestDealsCsv}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Export only best deals per model to CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Best Deals</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Export complete comparison matrix to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Full Matrix</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Main Comparison Table */}
        <div className="flex-1 overflow-auto bg-slate-50 p-3">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0f172a] text-white sticky top-0 z-10 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800 text-slate-400">#</th>
                  <th
                    className="py-2.5 px-3 border-r border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      if (sortBy === 'model') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('model');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>iPhone Model / Spec ({gradeName})</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Distributor Header Columns */}
                  {distributors.map((dist) => {
                    const wins = stats.winCounts[dist] || 0;
                    const isTop = dist === stats.topWinner;
                    return (
                      <th
                        key={dist}
                        className={`py-2.5 px-3 text-center border-r border-slate-800 ${
                          isTop ? 'bg-amber-950/80 text-amber-200 border-amber-800' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-xs">{dist}</span>
                          <span className="text-[9px] font-mono text-slate-400 font-normal">
                            {wins} Cheapest
                          </span>
                        </div>
                      </th>
                    );
                  })}

                  <th
                    className="py-2.5 px-3 border-r border-slate-800 text-center cursor-pointer hover:bg-slate-800 transition-colors bg-emerald-950/80 text-emerald-300"
                    onClick={() => {
                      if (sortBy === 'bestPrice') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('bestPrice');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Best Supplier</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                    </div>
                  </th>

                  <th
                    className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800 transition-colors bg-amber-950/80 text-amber-300"
                    onClick={() => {
                      if (sortBy === 'savings') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('savings');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Savings / Margin Gap</span>
                      <ArrowUpDown className="w-3 h-3 text-amber-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={distributors.length + 4} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 text-slate-300" />
                        <p className="font-bold text-sm text-slate-700">No matching distributor price comparison rows found</p>
                        <p className="text-xs text-slate-500">Try clearing your search query or adjusting filter parameters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>{row.model}</span>
                            {(row.activeCount || 0) > 1 && (
                              <span className="text-[9px] font-mono bg-slate-100 text-slate-600 border border-slate-300 px-1.5 py-0.2 rounded shrink-0">
                                {row.activeCount} Quotes
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Distributor Prices */}
                        {distributors.map((dist) => {
                          const p = row.prices[dist];
                          const isBest = p > 0 && dist === row.bestDistributor;
                          const isWorst = p > 0 && p === row.worstPrice && (row.activeCount || 0) > 1;

                          return (
                            <td
                              key={dist}
                              className={`py-2 px-3 text-center border-r border-slate-200 font-mono text-xs ${
                                isBest
                                  ? 'bg-emerald-100/90 text-emerald-950 font-black border-emerald-300'
                                  : isWorst
                                  ? 'bg-rose-50 text-rose-800 font-medium'
                                  : p > 0
                                  ? 'text-slate-800 font-medium'
                                  : 'text-slate-300 italic'
                              }`}
                            >
                              {p > 0 ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span>${p}</span>
                                  {isBest && (
                                    <span className="bg-emerald-600 text-white text-[9px] px-1 py-0.2 rounded font-extrabold uppercase shadow-2xs">
                                      BEST
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Best Supplier */}
                        <td className="py-2 px-3 border-r border-slate-200 bg-emerald-50/50">
                          {row.bestDistributor && row.bestPrice ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded text-[11px]">
                                {row.bestDistributor}
                              </span>
                              <span className="font-mono font-black text-emerald-800 text-xs">
                                ${row.bestPrice}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Out of Stock</span>
                          )}
                        </td>

                        {/* Potential Savings */}
                        <td className="py-2 px-3 text-right font-mono">
                          {row.savings && row.savings > 0 ? (
                            <div className="flex items-center justify-end gap-1 text-emerald-700 font-extrabold">
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+${row.savings.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Footer Status Bar */}
        <div className="bg-slate-900 text-slate-300 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Showing <strong className="text-white">{filteredRows.length}</strong> of{' '}
              <strong className="text-slate-400">{rows.length}</strong> models
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Distributors: <strong className="text-amber-400">{distributors.length}</strong> ({distributors.join(', ')})
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>

      {/* Paste / Import Data Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl border border-slate-300 shadow-2xl w-full max-w-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Import / Load Distributor Excel Template & Data</span>
              </h3>
              <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Excel File Drag & Drop / Upload Box */}
            <div
              onClick={() => excelInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleExcelFileUpload(fakeEvent);
                }
              }}
              className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/60 hover:bg-emerald-50 transition-all rounded-lg p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 group shadow-2xs"
            >
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-emerald-900">
                  Click or Drag & Drop Excel File Here (.xlsx, .xls, .csv)
                </p>
                <p className="text-[11px] text-emerald-700">
                  Automatically extracts distributor columns and model rows from your spreadsheet
                </p>
              </div>
            </div>

            {/* Preset Templates Options */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Load Preset Excel Data Templates:</span>
                </label>
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded border border-amber-300 flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Clean Excel Template (.xlsx)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPastedText(INITIAL_DISTRIBUTOR_CSV)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-left text-[11px] font-bold text-slate-800 shadow-2xs transition-all"
                >
                  <div className="text-blue-600 font-extrabold">📱 Standard Matrix</div>
                  <div className="text-[10px] text-slate-500 font-normal">4 Distributors (Grade A)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPastedText(EXCEL_TEMPLATE_WHOLESALE_5_DISTRIBUTORS)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-left text-[11px] font-bold text-slate-800 shadow-2xs transition-all"
                >
                  <div className="text-emerald-600 font-extrabold">🚀 Wholesale 5-Dist</div>
                  <div className="text-[10px] text-slate-500 font-normal">+Tekcom 5 Vendors</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPastedText(EXCEL_TEMPLATE_PRO_MAX_FLAGSHIPS)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-left text-[11px] font-bold text-slate-800 shadow-2xs transition-all"
                >
                  <div className="text-amber-600 font-extrabold">🔥 Flagship Pro Max</div>
                  <div className="text-[10px] text-slate-500 font-normal">iPhone 15/16/17 Pro Max</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPastedText(EXCEL_TEMPLATE_BLANK_MATRIX)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-left text-[11px] font-bold text-slate-800 shadow-2xs transition-all"
                >
                  <div className="text-slate-700 font-extrabold">📝 Blank Template</div>
                  <div className="text-[10px] text-slate-500 font-normal">Headers for Data Entry</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Paste Raw Matrix Text / CSV Data:
                </label>
                <span className="text-[10px] text-slate-500">
                  First line = Header row with Distributor names
                </span>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste CSV / Excel matrix data here..."
                rows={6}
                className="w-full p-3 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500 bg-slate-900 text-emerald-300"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPastedText(INITIAL_DISTRIBUTOR_CSV)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold transition-colors"
              >
                Reset to Default Data
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-bold text-xs hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessPastedData}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs transition-colors"
                >
                  Load Matrix Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
