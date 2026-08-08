import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SalesRecord } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  X,
  Printer,
  Mail,
  Download,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  Send,
  BarChart2,
  Sparkles,
  Layers,
  ArrowRight,
  PieChart,
  Table,
  FileSpreadsheet,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface MonthlySalesReportModalProps {
  sales: SalesRecord[];
  onClose: () => void;
}

interface MonthlyAggregatedStat {
  yearMonth: string; // 'YYYY-MM'
  label: string; // 'August 2026'
  invoicesCount: number;
  qtySold: number;
  grossRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  avgInvoiceValue: number;
}

export const MonthlySalesReportModal: React.FC<MonthlySalesReportModalProps> = ({
  sales,
  onClose,
}) => {
  // View mode: 'all_months' (Total sales each month together) vs 'single_month' (Detailed single month)
  const [reportView, setReportView] = useState<'all_months' | 'single_month'>('all_months');

  // Extract unique Year-Month combinations from sales
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    sales.forEach((s) => {
      if (s.date && s.date.length >= 7) {
        monthsSet.add(s.date.substring(0, 7)); // 'YYYY-MM'
      }
    });

    const currentDateMonth = new Date().toISOString().substring(0, 7);
    monthsSet.add(currentDateMonth);

    return Array.from(monthsSet).sort().reverse(); // Newest first
  }, [sales]);

  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(
    availableMonths[0] || new Date().toISOString().substring(0, 7)
  );

  // Email modal state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');
  const [copiedEmailBody, setCopiedEmailBody] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // -------------------------------------------------------------
  // 1. COMPUTE ALL-MONTHS AGGREGATED BREAKDOWN (Sales Each Month Together)
  // -------------------------------------------------------------
  const allMonthsAggregated = useMemo(() => {
    const monthMap: Record<
      string,
      {
        invoicesCount: number;
        qtySold: number;
        grossRevenue: number;
        totalCost: number;
        totalProfit: number;
      }
    > = {};

    sales.forEach((s) => {
      if (!s.date || s.date.length < 7) return;
      const ym = s.date.substring(0, 7);
      if (!monthMap[ym]) {
        monthMap[ym] = { invoicesCount: 0, qtySold: 0, grossRevenue: 0, totalCost: 0, totalProfit: 0 };
      }
      const price = s.totalInvoicePrice || 0;
      const cost = s.costPrice || 0;
      const calcProfit = price - cost;
      const itemProfit = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;
      const qty = s.qty || 1;

      monthMap[ym].invoicesCount += 1;
      monthMap[ym].qtySold += qty;
      monthMap[ym].grossRevenue += price;
      monthMap[ym].totalCost += cost;
      monthMap[ym].totalProfit += itemProfit;
    });

    const sortedMonths = Object.keys(monthMap).sort().reverse();

    const monthlyList: MonthlyAggregatedStat[] = sortedMonths.map((ym) => {
      const data = monthMap[ym];
      const [year, month] = ym.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const netProfit = data.totalProfit;
      const profitMargin = data.grossRevenue > 0 ? (netProfit / data.grossRevenue) * 100 : 0;
      const avgInvoiceValue = data.invoicesCount > 0 ? data.grossRevenue / data.invoicesCount : 0;

      return {
        yearMonth: ym,
        label,
        invoicesCount: data.invoicesCount,
        qtySold: data.qtySold,
        grossRevenue: data.grossRevenue,
        totalCost: data.totalCost,
        netProfit,
        profitMargin,
        avgInvoiceValue,
      };
    });

    // Grand Totals across all months combined
    let grandRevenue = 0;
    let grandCost = 0;
    let grandProfit = 0;
    let grandInvoices = 0;
    let grandQty = 0;

    monthlyList.forEach((m) => {
      grandRevenue += m.grossRevenue;
      grandCost += m.totalCost;
      grandProfit += m.netProfit;
      grandInvoices += m.invoicesCount;
      grandQty += m.qtySold;
    });

    const grandMargin = grandRevenue > 0 ? (grandProfit / grandRevenue) * 100 : 0;

    return {
      monthlyList,
      grandTotals: {
        grandRevenue,
        grandCost,
        grandProfit,
        grandMargin,
        grandInvoices,
        grandQty,
      },
    };
  }, [sales]);

  // -------------------------------------------------------------
  // 2. COMPUTE SINGLE MONTH DETAILED METRICS
  // -------------------------------------------------------------
  const monthSales = useMemo(() => {
    return sales.filter((s) => s.date && s.date.startsWith(selectedYearMonth));
  }, [sales, selectedYearMonth]);

  const monthStats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalQty = 0;
    let netProfit = 0;

    const customerTotals: Record<string, number> = {};
    const vendorTotals: Record<string, number> = {};

    monthSales.forEach((s) => {
      const price = s.totalInvoicePrice || 0;
      const cost = s.costPrice || 0;
      const calcProfit = price - cost;
      const itemProfit = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;
      const qty = s.qty || 1;

      totalRevenue += price;
      totalCost += cost;
      totalQty += qty;
      netProfit += itemProfit;

      if (s.customerName) {
        customerTotals[s.customerName] = (customerTotals[s.customerName] || 0) + price;
      }
      if (s.vendorName) {
        vendorTotals[s.vendorName] = (vendorTotals[s.vendorName] || 0) + price;
      }
    });

    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    let topCustomer = 'N/A';
    let maxCustVal = 0;
    Object.entries(customerTotals).forEach(([cust, val]) => {
      if (val > maxCustVal) {
        maxCustVal = val;
        topCustomer = cust;
      }
    });

    let topVendor = 'N/A';
    let maxVendVal = 0;
    Object.entries(vendorTotals).forEach(([vend, val]) => {
      if (val > maxVendVal) {
        maxVendVal = val;
        topVendor = vend;
      }
    });

    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      totalQty,
      totalInvoices: monthSales.length,
      topCustomer,
      topVendor,
    };
  }, [monthSales]);

  // Readable string for selected single month
  const readableMonthYear = useMemo(() => {
    if (!selectedYearMonth) return '';
    const [year, month] = selectedYearMonth.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedYearMonth]);

  // Sync email subject
  React.useEffect(() => {
    if (reportView === 'all_months') {
      setEmailSubject(`Consolidated Monthly Sales Report - Total Sales Each Month (InventoryManager)`);
    } else {
      setEmailSubject(`Monthly Sales Report - ${readableMonthYear} (InventoryManager)`);
    }
  }, [reportView, readableMonthYear]);

  // Email Body Content
  const emailBodyText = useMemo(() => {
    if (reportView === 'all_months') {
      const rowsText = allMonthsAggregated.monthlyList
        .map(
          (m) =>
            `- ${m.label}: $${m.grossRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (Cost: $${m.totalCost.toLocaleString()}, Profit: $${m.netProfit.toLocaleString()}, ${m.invoicesCount} Invoices)`
        )
        .join('\n');

      return `CONSOLIDATED MONTHLY SALES REPORT (ALL MONTHS TOGETHER)
==================================================
Total Combined Revenue: $${allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(
        undefined,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}
Total Combined Cost: $${allMonthsAggregated.grandTotals.grandCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
Total Net Profit: $${allMonthsAggregated.grandTotals.grandProfit.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
Cumulative Profit Margin: ${allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%
Total Sales Invoices: ${allMonthsAggregated.grandTotals.grandInvoices}
Total Items Sold: ${allMonthsAggregated.grandTotals.grandQty}

MONTH-BY-MONTH BREAKDOWN SUMMARY:
${rowsText}

Generated via InventoryManager System
Date: ${new Date().toLocaleDateString()}`;
    } else {
      return `Monthly Sales Report for ${readableMonthYear}
------------------------------------------------
Total Transactions / Invoices: ${monthStats.totalInvoices}
Total Items Sold: ${monthStats.totalQty}

FINANCIAL SUMMARY:
- Gross Sales Revenue: $${monthStats.totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
- Inventory Cost: $${monthStats.totalCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
- Net Profit: $${monthStats.netProfit.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
- Profit Margin: ${monthStats.profitMargin.toFixed(1)}%

HIGHLIGHTS:
- Top Customer: ${monthStats.topCustomer}
- Top Vendor Supplier: ${monthStats.topVendor}

Generated via InventoryManager Standalone System
Date: ${new Date().toLocaleDateString()}`;
    }
  }, [reportView, allMonthsAggregated, readableMonthYear, monthStats]);

  // -------------------------------------------------------------
  // 3. EXPORT TO EXCEL (.xlsx) AND PDF GENERATION
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (reportView === 'all_months') {
      // Worksheet 1: All Months Consolidated Breakdown
      const sheetData: (string | number)[][] = [
        ['INVENTORY MANAGER - CONSOLIDATED MONTHLY SALES REPORT'],
        [`Generated On: ${new Date().toLocaleString()}`],
        [],
        ['CUMULATIVE FINANCIAL OVERVIEW (ALL MONTHS COMBINED)'],
        [
          'Grand Revenue ($)',
          'Total Inventory Cost ($)',
          'Net Profit ($)',
          'Profit Margin (%)',
          'Total Sales Invoices',
          'Total Units Sold'
        ],
        [
          allMonthsAggregated.grandTotals.grandRevenue,
          allMonthsAggregated.grandTotals.grandCost,
          allMonthsAggregated.grandTotals.grandProfit,
          `${allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%`,
          allMonthsAggregated.grandTotals.grandInvoices,
          allMonthsAggregated.grandTotals.grandQty
        ],
        [],
        ['MONTH-BY-MONTH SALES BREAKDOWN'],
        [
          'Month / Year',
          'Invoices Count',
          'Units Sold',
          'Gross Revenue ($)',
          'Total Cost ($)',
          'Net Profit ($)',
          'Profit Margin (%)',
          'Average Invoice Value ($)'
        ]
      ];

      allMonthsAggregated.monthlyList.forEach((m) => {
        sheetData.push([
          m.label,
          m.invoicesCount,
          m.qtySold,
          m.grossRevenue,
          m.totalCost,
          m.netProfit,
          `${m.profitMargin.toFixed(1)}%`,
          m.avgInvoiceValue
        ]);
      });

      // Totals row
      sheetData.push([
        'GRAND TOTALS',
        allMonthsAggregated.grandTotals.grandInvoices,
        allMonthsAggregated.grandTotals.grandQty,
        allMonthsAggregated.grandTotals.grandRevenue,
        allMonthsAggregated.grandTotals.grandCost,
        allMonthsAggregated.grandTotals.grandProfit,
        `${allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%`,
        '-'
      ]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 24 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Sales Summary');
      XLSX.writeFile(
        wb,
        `Consolidated_Monthly_Sales_Report_${new Date().toISOString().substring(0, 10)}.xlsx`
      );
    } else {
      // Worksheet 2: Single Month Detailed Report
      const sheetData: (string | number)[][] = [
        [`INVENTORY MANAGER - MONTHLY SALES REPORT: ${readableMonthYear.toUpperCase()}`],
        [`Generated On: ${new Date().toLocaleString()}`],
        [],
        ['FINANCIAL & PERFORMANCE SUMMARY'],
        [
          'Gross Revenue ($)',
          'Inventory Cost ($)',
          'Net Profit ($)',
          'Profit Margin (%)',
          'Total Invoices',
          'Units Sold',
          'Top Customer',
          'Top Vendor'
        ],
        [
          monthStats.totalRevenue,
          monthStats.totalCost,
          monthStats.netProfit,
          `${monthStats.profitMargin.toFixed(1)}%`,
          monthStats.totalInvoices,
          monthStats.totalQty,
          monthStats.topCustomer,
          monthStats.topVendor
        ],
        [],
        ['DETAILED INVOICES LEDGER'],
        [
          'Date',
          'Invoice #',
          'Customer Name',
          'Qty',
          'Sales Price ($)',
          'Profit ($)'
        ]
      ];

      monthSales.forEach((s) => {
        const price = s.totalInvoicePrice || 0;
        const cost = s.costPrice || 0;
        const calcProfit = price - cost;
        const profit = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;

        sheetData.push([
          s.date || '',
          s.invoiceNumber || '',
          s.customerName || '',
          s.qty || 1,
          price,
          profit
        ]);
      });

      // Totals row
      sheetData.push([
        'MONTH TOTALS',
        `${monthStats.totalInvoices} Invoices`,
        '',
        monthStats.totalQty,
        monthStats.totalRevenue,
        monthStats.netProfit
      ]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = [
        { wch: 14 },
        { wch: 18 },
        { wch: 26 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, `${selectedYearMonth}_Sales`);
      XLSX.writeFile(
        wb,
        `Monthly_Sales_Report_${selectedYearMonth}_${new Date().toISOString().substring(0, 10)}.xlsx`
      );
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [26, 28, 30]; // #1a1c1e
    const darkGray: [number, number, number] = [51, 65, 85];

    if (reportView === 'all_months') {
      // PDF: ALL MONTHS TOGETHER
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('INVENTORY MANAGER', 14, 13);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(191, 219, 254);
      doc.text('CONSOLIDATED SALES REPORT - TOTAL SALES EACH MONTH TOGETHER', 14, 20);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 13, { align: 'right' });

      // Financial KPI Summary Card
      let startY = 34;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, startY, 182, 30, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text('CUMULATIVE FINANCIAL OVERVIEW (ALL MONTHS COMBINED)', 18, startY + 7);

      const colWidth = 43;

      // Revenue
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('GRAND REVENUE', 18, startY + 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(29, 78, 216);
      doc.text(
        `$${allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        18,
        startY + 22
      );

      // Cost
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL COST', 18 + colWidth, startY + 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `$${allMonthsAggregated.grandTotals.grandCost.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        18 + colWidth,
        startY + 22
      );

      // Profit
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('NET PROFIT', 18 + colWidth * 2, startY + 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(4, 120, 87);
      doc.text(
        `$${allMonthsAggregated.grandTotals.grandProfit.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        18 + colWidth * 2,
        startY + 22
      );

      // Invoices & Margin
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL INVOICES', 18 + colWidth * 3, startY + 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${allMonthsAggregated.grandTotals.grandInvoices} inv | ${allMonthsAggregated.grandTotals.grandMargin.toFixed(
          1
        )}%`,
        18 + colWidth * 3,
        startY + 22
      );

      // Table of Monthly Breakdown
      const tableRows = allMonthsAggregated.monthlyList.map((m) => [
        m.label,
        m.invoicesCount,
        m.qtySold,
        `$${m.grossRevenue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `$${m.totalCost.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `$${m.netProfit.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        `${m.profitMargin.toFixed(1)}%`,
        `$${m.avgInvoiceValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      autoTable(doc, {
        startY: startY + 36,
        head: [
          [
            'Month',
            'Invoices',
            'Qty Sold',
            'Gross Sales ($)',
            'Cost ($)',
            'Net Profit ($)',
            'Margin %',
            'Avg Invoice',
          ],
        ],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: darkGray,
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 24, halign: 'right' },
        },
        foot: [
          [
            'GRAND TOTALS',
            `${allMonthsAggregated.grandTotals.grandInvoices}`,
            `${allMonthsAggregated.grandTotals.grandQty}`,
            `$${allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            `$${allMonthsAggregated.grandTotals.grandCost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            `$${allMonthsAggregated.grandTotals.grandProfit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            `${allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%`,
            '-',
          ],
        ],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
        },
      });

      doc.save('Consolidated_Monthly_Sales_Report.pdf');
    } else {
      // PDF: SINGLE MONTH
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('INVENTORY MANAGER', 14, 14);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(191, 219, 254);
      doc.text(`MONTHLY SALES REPORT - ${readableMonthYear.toUpperCase()}`, 14, 21);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 196, 14, { align: 'right' });

      let startY = 35;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, startY, 182, 32, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text('FINANCIAL & PERFORMANCE SUMMARY', 18, startY + 7);

      const colWidth = 43;

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('GROSS REVENUE', 18, startY + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(29, 78, 216);
      doc.text(
        `$${monthStats.totalRevenue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        18,
        startY + 23
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('INVENTORY COST', 18 + colWidth, startY + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `$${monthStats.totalCost.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        18 + colWidth,
        startY + 23
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('NET PROFIT', 18 + colWidth * 2, startY + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87);
      doc.text(
        `$${monthStats.netProfit.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        18 + colWidth * 2,
        startY + 23
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL INVOICES / QTY', 18 + colWidth * 3, startY + 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${monthStats.totalInvoices} inv (${monthStats.totalQty} pcs) | ${monthStats.profitMargin.toFixed(
          1
        )}%`,
        18 + colWidth * 3,
        startY + 23
      );

      const tableRows = monthSales.map((s) => {
        const price = s.totalInvoicePrice || 0;
        const cost = s.costPrice || 0;
        const calcProfit = price - cost;
        const profit = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;

        return [
          s.date || '',
          s.invoiceNumber || '',
          s.customerName || '',
          s.qty || 1,
          `$${price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          `$${profit.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        ];
      });

      autoTable(doc, {
        startY: startY + 38,
        head: [
          ['Date', 'Invoice #', 'Customer', 'Qty', 'Sales ($)', 'Profit ($)'],
        ],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: darkGray,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30, fontStyle: 'bold' },
          2: { cellWidth: 55 },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        },
        foot: [
          [
            'TOTALS',
            '',
            `${monthStats.totalInvoices} Invoices`,
            `${monthStats.totalQty}`,
            `$${monthStats.totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            `$${monthStats.netProfit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
        ],
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
        },
      });

      doc.save(`SalesReport_${selectedYearMonth}_InventoryManager.pdf`);
    }
  };

  // -------------------------------------------------------------
  // 4. PRINT REPORT (All Months Together or Single Month)
  // -------------------------------------------------------------
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (reportView === 'all_months') {
      const rowsHtml = allMonthsAggregated.monthlyList
        .map(
          (m) => `
        <tr>
          <td style="font-weight: bold; color: #1e293b;">${m.label}</td>
          <td style="text-align: center;">${m.invoicesCount}</td>
          <td style="text-align: center;">${m.qtySold}</td>
          <td style="text-align: right; font-weight: bold; color: #1d4ed8;">$${m.grossRevenue.toLocaleString(
            undefined,
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}</td>
          <td style="text-align: right; color: #475569;">$${m.totalCost.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
          <td style="text-align: right; font-weight: bold; color: ${
            m.netProfit >= 0 ? '#047857' : '#b91c1c'
          };">$${m.netProfit.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
          <td style="text-align: center; font-weight: bold;">${m.profitMargin.toFixed(1)}%</td>
          <td style="text-align: right;">$${m.avgInvoiceValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
        </tr>
      `
        )
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Consolidated Monthly Sales Report - All Months Together</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; color: #1e293b; font-size: 12px; }
              .header { background: #1a1c1e; color: #ffffff; padding: 16px 20px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
              .header h1 { margin: 0; font-size: 18px; letter-spacing: -0.5px; }
              .header p { margin: 4px 0 0 0; color: #93c5fd; font-size: 11px; }
              .summary { margin: 16px 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
              .stat-box { font-size: 11px; }
              .stat-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; }
              .stat-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
              th { background: #1a1c1e; color: #ffffff; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
              td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .footer-row { background-color: #e2e8f0; font-weight: bold; }
              @media print {
                body { margin: 0; }
                button { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>INVENTORY MANAGER</h1>
                <p>CONSOLIDATED MONTHLY SALES REPORT - TOTAL SALES EACH MONTH TOGETHER</p>
              </div>
              <div style="text-align: right; font-size: 10px; color: #94a3b8;">
                Printed: ${new Date().toLocaleString()}
              </div>
            </div>

            <div class="summary">
              <div class="stat-box">
                <div class="stat-label">Grand Revenue</div>
                <div class="stat-value" style="color: #1d4ed8;">$${allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Total Inventory Cost</div>
                <div class="stat-value" style="color: #475569;">$${allMonthsAggregated.grandTotals.grandCost.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Cumulative Profit</div>
                <div class="stat-value" style="color: #047857;">$${allMonthsAggregated.grandTotals.grandProfit.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Total Invoices / Margin</div>
                <div class="stat-value">${
                  allMonthsAggregated.grandTotals.grandInvoices
                } inv (${allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%)</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style="text-align: center;">Invoices</th>
                  <th style="text-align: center;">Qty Sold</th>
                  <th style="text-align: right;">Gross Sales ($)</th>
                  <th style="text-align: right;">Cost ($)</th>
                  <th style="text-align: right;">Net Profit ($)</th>
                  <th style="text-align: center;">Margin %</th>
                  <th style="text-align: right;">Avg Invoice</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr class="footer-row">
                  <td>GRAND TOTALS</td>
                  <td style="text-align: center;">${allMonthsAggregated.grandTotals.grandInvoices}</td>
                  <td style="text-align: center;">${allMonthsAggregated.grandTotals.grandQty}</td>
                  <td style="text-align: right; color: #1d4ed8;">$${allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}</td>
                  <td style="text-align: right;">$${allMonthsAggregated.grandTotals.grandCost.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}</td>
                  <td style="text-align: right; color: #047857;">$${allMonthsAggregated.grandTotals.grandProfit.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}</td>
                  <td style="text-align: center;">${allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%</td>
                  <td style="text-align: right;">-</td>
                </tr>
              </tfoot>
            </table>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      // PRINT SINGLE MONTH
      const rowsHtml = monthSales
        .map((s) => {
          const price = s.totalInvoicePrice || 0;
          const cost = s.costPrice || 0;
          const profit = s.profit !== undefined ? s.profit : price - cost;

          return `
          <tr>
            <td>${s.date}</td>
            <td style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${s.invoiceNumber}</td>
            <td style="font-weight: bold;">${s.customerName}</td>
            <td>${s.vendorName || '-'}</td>
            <td style="text-align: center;">${s.qty || 1}</td>
            <td style="text-align: right; font-weight: bold;">$${price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</td>
            <td style="text-align: right; color: #475569;">$${cost.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</td>
            <td style="text-align: right; font-weight: bold; color: ${
              profit >= 0 ? '#047857' : '#b91c1c'
            };">$${profit.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
            <td>${s.paidFrom || 'Account'}</td>
          </tr>
        `;
        })
        .join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Monthly Sales Report - ${readableMonthYear}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; color: #1e293b; font-size: 12px; }
              .header { background: #1a1c1e; color: #ffffff; padding: 16px 20px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
              .header h1 { margin: 0; font-size: 18px; letter-spacing: -0.5px; }
              .header p { margin: 4px 0 0 0; color: #93c5fd; font-size: 11px; }
              .summary { margin: 16px 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
              .stat-box { font-size: 11px; }
              .stat-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; }
              .stat-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
              th { background: #1a1c1e; color: #ffffff; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
              td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .footer-row { background-color: #e2e8f0; font-weight: bold; }
              @media print {
                body { margin: 0; }
                button { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1>INVENTORY MANAGER</h1>
                <p>MONTHLY SALES REPORT & FINANCIAL LEDGER - ${readableMonthYear.toUpperCase()}</p>
              </div>
              <div style="text-align: right; font-size: 10px; color: #94a3b8;">
                Printed: ${new Date().toLocaleString()}
              </div>
            </div>

            <div class="summary">
              <div class="stat-box">
                <div class="stat-label">Gross Revenue</div>
                <div class="stat-value" style="color: #1d4ed8;">$${monthStats.totalRevenue.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Inventory Cost</div>
                <div class="stat-value" style="color: #475569;">$${monthStats.totalCost.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Net Profit</div>
                <div class="stat-value" style="color: #047857;">$${monthStats.netProfit.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Invoices / Profit %</div>
                <div class="stat-value">${monthStats.totalInvoices} inv (${monthStats.profitMargin.toFixed(
        1
      )}%)</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Vendor Supplier</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Sales Price ($)</th>
                  <th style="text-align: right;">Cost ($)</th>
                  <th style="text-align: right;">Profit ($)</th>
                  <th>Paid From</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr class="footer-row">
                  <td colspan="4">TOTAL MONTHLY SUMMARY</td>
                  <td style="text-align: center;">${monthStats.totalQty}</td>
                  <td style="text-align: right;">$${monthStats.totalRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</td>
                  <td style="text-align: right;">$${monthStats.totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}</td>
                  <td style="text-align: right; color: #047857;">$${monthStats.netProfit.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}</td>
                  <td>-</td>
                </tr>
              </tfoot>
            </table>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  // -------------------------------------------------------------
  // 5. MAIL APP LAUNCH & COPY SUMMARY
  // -------------------------------------------------------------
  const handleSendMailto = () => {
    const subjectEncoded = encodeURIComponent(emailSubject);
    const bodyEncoded = encodeURIComponent(
      (emailNotes ? `${emailNotes}\n\n` : '') + emailBodyText
    );
    const mailtoUrl = `mailto:${emailTo}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    window.open(mailtoUrl, '_blank');
    setEmailSentSuccess(true);
    setTimeout(() => setEmailSentSuccess(false), 3000);
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailBodyText);
    setCopiedEmailBody(true);
    setTimeout(() => setCopiedEmailBody(false), 2000);
  };

  // Fullscreen modal state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const nextState = !prev;
      if (nextState) {
        if (modalRef.current?.requestFullscreen) {
          modalRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return nextState;
    });
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center select-none transition-all duration-150 ${
        isFullscreen
          ? 'bg-slate-950 p-0 w-screen h-screen'
          : 'bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4'
      }`}
    >
      <div
        ref={modalRef}
        className={`bg-white overflow-hidden flex flex-col transition-all duration-150 ${
          isFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-none'
            : 'rounded border border-slate-300 shadow-xl w-full max-w-5xl max-h-[92vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-xs text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-white flex items-center gap-2">
                Monthly Sales PDF Report, Print & Email Console
                {isFullscreen && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    Full Screen
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400">
                Generate total sales report for each month together, export PDF statements, print, or email accountants.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold border ${
                isFullscreen
                  ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-600/50'
                  : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title={isFullscreen ? 'Exit Full Screen View' : 'Maximize to Full Screen'}
              id="header-toggle-fullscreen-btn"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-[11px]">Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline text-[11px]">Full Screen</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Console"
              id="close-monthly-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Consolidated All Months vs Single Month */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setReportView('all_months')}
              className={`py-1.5 px-3.5 rounded flex items-center gap-1.5 transition-colors ${
                reportView === 'all_months'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              id="report-tab-all-months"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>1. TOTAL SALES EACH MONTH TOGETHER (CONSOLIDATED)</span>
            </button>

            <button
              onClick={() => setReportView('single_month')}
              className={`py-1.5 px-3.5 rounded flex items-center gap-1.5 transition-colors ${
                reportView === 'single_month'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              id="report-tab-single-month"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>2. SINGLE MONTH INVOICES DETAIL</span>
            </button>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`px-3 py-1.5 rounded font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 border ${
                isFullscreen
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
                  : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
              }`}
              title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen Mode'}
              id="toolbar-fullscreen-sales-report-btn"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-200" />
                  <span>EXIT FULL SCREEN</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-200" />
                  <span>FULL SCREEN</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500 rounded font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Export Report to Microsoft Excel Spreadsheet (.xlsx)"
              id="export-excel-sales-report-btn"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>
                {reportView === 'all_months'
                  ? 'EXPORT ALL MONTHS TO EXCEL'
                  : 'EXPORT MONTH TO EXCEL'}
              </span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
              title="Print Current View Report"
              id="print-sales-report-btn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT REPORT</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
              title="Download PDF File"
              id="download-pdf-sales-report-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {reportView === 'all_months'
                  ? 'DOWNLOAD ALL MONTHS PDF'
                  : 'DOWNLOAD MONTH PDF'}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* VIEW 1: ALL MONTHS CONSOLIDATED REPORT */}
          {reportView === 'all_months' && (
            <div className="space-y-4">
              {/* Grand Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block tracking-tight">
                    Cumulative Gross Revenue
                  </span>
                  <div className="font-mono text-lg font-bold text-blue-900 mt-0.5">
                    $
                    {allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {allMonthsAggregated.grandTotals.grandInvoices} Total Invoices |{' '}
                    {allMonthsAggregated.grandTotals.grandQty} Units
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-300">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block tracking-tight">
                    Cumulative Inventory Cost
                  </span>
                  <div className="font-mono text-lg font-bold text-slate-800 mt-0.5">
                    $
                    {allMonthsAggregated.grandTotals.grandCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Total cost of goods across all months
                  </span>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white p-3 rounded border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-tight">
                    Cumulative Net Profit
                  </span>
                  <div className="font-mono text-lg font-bold text-emerald-700 mt-0.5">
                    $
                    {allMonthsAggregated.grandTotals.grandProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                    Overall Profit Margin:{' '}
                    {allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%
                  </span>
                </div>

                <div className="bg-indigo-50/70 p-3 rounded border border-indigo-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block tracking-tight">
                      Recorded Sales Periods
                    </span>
                    <span className="font-bold text-slate-900 font-mono text-base block mt-0.5">
                      {allMonthsAggregated.monthlyList.length} Active Months
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-indigo-200/60 text-[10px] text-slate-600 font-medium">
                    Aggregated together in single statement
                  </div>
                </div>
              </div>

              {/* Aggregated Table: Total Sales Each Month Together */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-[#1a1c1e] px-3 py-2 text-white font-bold text-xs uppercase flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-blue-400" />
                    <span>Total Sales Breakdown - Each Month Together</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportExcel}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[11px] transition-colors flex items-center gap-1 shadow-2xs border border-emerald-500 cursor-pointer"
                      title="Export Total Sales Report to Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                      <span>EXPORT TO EXCEL</span>
                    </button>
                    <span className="font-mono text-[10px] text-blue-300 hidden sm:inline">
                      {allMonthsAggregated.monthlyList.length} Months Summary
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                        <th className="p-2.5">Month / Year</th>
                        <th className="p-2.5 text-center">Invoices</th>
                        <th className="p-2.5 text-center">Qty Sold</th>
                        <th className="p-2.5 text-right">Gross Sales ($)</th>
                        <th className="p-2.5 text-right">Cost ($)</th>
                        <th className="p-2.5 text-right">Net Profit ($)</th>
                        <th className="p-2.5 text-center">Profit Margin %</th>
                        <th className="p-2.5 text-right">Avg Invoice ($)</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {allMonthsAggregated.monthlyList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                            No sales records available across any month.
                          </td>
                        </tr>
                      ) : (
                        allMonthsAggregated.monthlyList.map((m) => (
                          <tr key={m.yearMonth} className="hover:bg-blue-50/40 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                              {m.label}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                              {m.invoicesCount}
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-700">
                              {m.qtySold}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                              $
                              {m.grossRevenue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                              $
                              {m.totalCost.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td
                              className={`p-2.5 text-right font-mono font-bold whitespace-nowrap ${
                                m.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              $
                              {m.netProfit.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                              {m.profitMargin.toFixed(1)}%
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-600">
                              $
                              {m.avgInvoiceValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedYearMonth(m.yearMonth);
                                  setReportView('single_month');
                                }}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-colors"
                              >
                                VIEW INVOICES
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {/* Grand Totals Summary Footer */}
                    <tfoot>
                      <tr className="bg-slate-200 border-t-2 border-slate-400 font-bold text-[11px] text-slate-900">
                        <td className="p-2.5 uppercase">GRAND TOTALS (ALL MONTHS)</td>
                        <td className="p-2.5 text-center font-mono">
                          {allMonthsAggregated.grandTotals.grandInvoices}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {allMonthsAggregated.grandTotals.grandQty}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-900 text-xs">
                          $
                          {allMonthsAggregated.grandTotals.grandRevenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-800">
                          $
                          {allMonthsAggregated.grandTotals.grandCost.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-800 text-xs">
                          $
                          {allMonthsAggregated.grandTotals.grandProfit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {allMonthsAggregated.grandTotals.grandMargin.toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">-</td>
                        <td className="p-2.5 text-center">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: SINGLE MONTH DETAILED INVOICES REPORT */}
          {reportView === 'single_month' && (
            <div className="space-y-4">
              {/* Month Selector Bar */}
              <div className="p-3 bg-slate-100 border border-slate-300 rounded flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5 uppercase">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Select Specific Month:</span>
                  </label>
                  <select
                    value={selectedYearMonth}
                    onChange={(e) => setSelectedYearMonth(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500 shadow-2xs"
                    id="select-report-month"
                  >
                    {availableMonths.map((ym) => {
                      const [year, month] = ym.split('-');
                      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
                      const label = d.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      });
                      return (
                        <option key={ym} value={ym}>
                          {label} ({sales.filter((s) => s.date && s.date.startsWith(ym)).length}{' '}
                          sales)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="text-[11px] font-mono text-slate-600">
                  Total Month Revenue:{' '}
                  <strong className="text-blue-700">
                    ${monthStats.totalRevenue.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Single Month KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block tracking-tight">
                    Gross Month Revenue
                  </span>
                  <div className="font-mono text-lg font-bold text-blue-900 mt-0.5">
                    $
                    {monthStats.totalRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    {monthStats.totalInvoices} Invoices | {monthStats.totalQty} Units
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-300">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block tracking-tight">
                    Inventory Cost
                  </span>
                  <div className="font-mono text-lg font-bold text-slate-800 mt-0.5">
                    $
                    {monthStats.totalCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Cost of goods sold
                  </span>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white p-3 rounded border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-tight">
                    Net Profit
                  </span>
                  <div className="font-mono text-lg font-bold text-emerald-700 mt-0.5">
                    $
                    {monthStats.netProfit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                    Profit Margin: {monthStats.profitMargin.toFixed(1)}%
                  </span>
                </div>

                <div className="bg-amber-50/60 p-3 rounded border border-amber-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-tight">
                      Top Customer
                    </span>
                    <span className="font-bold text-slate-900 truncate block text-xs mt-0.5">
                      {monthStats.topCustomer}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-amber-200/60">
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">
                      Top Supplier:
                    </span>{' '}
                    <span className="font-bold text-slate-800 text-[10px]">
                      {monthStats.topVendor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Single Month Detailed Invoices Table */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-[#1a1c1e] px-3 py-2 text-white font-bold text-xs uppercase flex items-center justify-between gap-2 flex-wrap">
                  <span>Detailed Invoices Ledger - {readableMonthYear}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportExcel}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[11px] transition-colors flex items-center gap-1 shadow-2xs border border-emerald-500 cursor-pointer"
                      title={`Export ${readableMonthYear} Sales Report to Excel`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                      <span>EXPORT {readableMonthYear.toUpperCase()} TO EXCEL</span>
                    </button>
                    <span className="font-mono text-[10px] text-blue-300 hidden sm:inline">
                      {monthSales.length} Entries
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                        <th className="p-2">Date</th>
                        <th className="p-2 font-mono">Invoice #</th>
                        <th className="p-2">Customer Name</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Sales Price ($)</th>
                        <th className="p-2 text-right">Profit ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {monthSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                            No sales entries recorded for {readableMonthYear}.
                          </td>
                        </tr>
                      ) : (
                        monthSales.map((s) => {
                          const price = s.totalInvoicePrice || 0;
                          const cost = s.costPrice || 0;
                          const calcProfit = price - cost;
                          const profit = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;

                          return (
                            <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="p-2 font-mono text-slate-600 whitespace-nowrap">
                                {s.date}
                              </td>
                              <td className="p-2 font-mono font-bold text-blue-700 whitespace-nowrap">
                                {s.invoiceNumber}
                              </td>
                              <td className="p-2 font-bold text-slate-900 whitespace-nowrap">
                                {s.customerName}
                              </td>
                              <td className="p-2 text-center font-mono font-bold">
                                {s.qty || 1}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-slate-900">
                                $
                                {price.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                $
                                {profit.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
                      <tr>
                        <td colSpan={3} className="p-2 text-slate-700 uppercase font-mono">
                          TOTAL ({monthSales.length} Invoices)
                        </td>
                        <td className="p-2 text-center font-mono text-slate-900">
                          {monthStats.totalQty}
                        </td>
                        <td className="p-2 text-right font-mono text-blue-800">
                          $
                          {monthStats.totalRevenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-800">
                          $
                          {monthStats.netProfit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EMAIL SALES STATEMENT SECTION */}
          <div className="bg-slate-50 border border-slate-300 rounded p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>
                  {reportView === 'all_months'
                    ? 'Send Consolidated All-Months Summary via Email'
                    : 'Send Monthly Sales Report via Email'}
                </span>
              </div>
              {emailSentSuccess && (
                <div className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Mail Application Opened!
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email Form */}
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">
                    Recipient Email Address:
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. accountant@company.com, owner@store.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                    id="report-email-to-input"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">
                    Email Subject Line:
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">
                    Custom Message Note (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please find our consolidated monthly sales performance attached."
                    value={emailNotes}
                    onChange={(e) => setEmailNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSendMailto}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                    id="send-email-mailto-btn"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>OPEN IN MAIL APP</span>
                  </button>

                  <button
                    onClick={handleCopyEmailText}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Copy text summary to paste in email client"
                  >
                    {copiedEmailBody ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>{copiedEmailBody ? 'COPIED!' : 'COPY SUMMARY'}</span>
                  </button>
                </div>
              </div>

              {/* Email Preview */}
              <div className="bg-white border border-slate-300 rounded p-2.5 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                    <span>Generated Report Summary</span>
                    <span className="font-mono text-slate-400">PLAIN TEXT</span>
                  </div>
                  <pre className="text-[10px] text-slate-700 font-mono bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-36">
                    {emailBodyText}
                  </pre>
                </div>
                <p className="text-[10px] text-slate-400 italic mt-1">
                  Tip: Download the PDF report using the top green button and attach it directly to your email message.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-300 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            TOTAL CONSOLIDATED REVENUE:{' '}
            <strong className="text-blue-700">
              ${allMonthsAggregated.grandTotals.grandRevenue.toLocaleString()}
            </strong>{' '}
            ({allMonthsAggregated.monthlyList.length} Months)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs shadow-2xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
