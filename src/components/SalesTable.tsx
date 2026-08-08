import React, { useState, useMemo } from 'react';
import { SalesRecord, SalesFilter } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Receipt,
  Building2,
  User,
  CreditCard,
  Building,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

interface SalesTableProps {
  sales: SalesRecord[];
  onEditSales: (record: SalesRecord) => void;
  onDeleteSales: (recordId: string) => void;
  onAddNewSales: () => void;
  onSelectVendor?: (vendorName: string) => void;
  onOpenMonthlyReport?: () => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({
  sales,
  onEditSales,
  onDeleteSales,
  onAddNewSales,
  onSelectVendor,
  onOpenMonthlyReport,
}) => {
  const [filter, setFilter] = useState<SalesFilter>({
    searchQuery: '',
    timePeriod: 'all',
    vendorFilter: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [salesToDelete, setSalesToDelete] = useState<SalesRecord | null>(null);

  // Extract unique vendor names for filter dropdown
  const uniqueVendors = useMemo(() => {
    const list = sales.map((s) => s.vendorName).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [sales]);

  // Filter & Sort
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      // Search
      const query = filter.searchQuery.toLowerCase().trim();
      if (query) {
        const matchInvoice = s.invoiceNumber.toLowerCase().includes(query);
        const matchCustomer = s.customerName.toLowerCase().includes(query);
        const matchVendor = s.vendorName.toLowerCase().includes(query);
        const matchVendorInv = s.vendorInvoiceNumber.toLowerCase().includes(query);
        const matchPaidFrom = s.paidFrom.toLowerCase().includes(query);
        const matchPaidBy = s.paidBy.toLowerCase().includes(query);
        if (!matchInvoice && !matchCustomer && !matchVendor && !matchVendorInv && !matchPaidFrom && !matchPaidBy) {
          return false;
        }
      }

      // Vendor Filter
      if (filter.vendorFilter !== 'all') {
        if (s.vendorName !== filter.vendorFilter) return false;
      }

      // Date range filter
      if (filter.dateFrom && s.date < filter.dateFrom) return false;
      if (filter.dateTo && s.date > filter.dateTo) return false;

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (filter.sortBy === 'date') {
        comp = a.date.localeCompare(b.date);
      } else if (filter.sortBy === 'totalInvoicePrice') {
        comp = (a.totalInvoicePrice || 0) - (b.totalInvoicePrice || 0);
      } else if (filter.sortBy === 'profit') {
        const profitA = a.profit !== undefined ? a.profit : ((a.totalInvoicePrice || 0) - (a.costPrice || 0));
        const profitB = b.profit !== undefined ? b.profit : ((b.totalInvoicePrice || 0) - (b.costPrice || 0));
        comp = profitA - profitB;
      } else if (filter.sortBy === 'invoiceNumber') {
        comp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (filter.sortBy === 'customerName') {
        comp = a.customerName.localeCompare(b.customerName);
      }

      return filter.sortOrder === 'asc' ? comp : -comp;
    });
  }, [sales, filter]);

  const handleSortChange = (field: SalesFilter['sortBy']) => {
    setFilter((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="bg-white border border-slate-300 rounded shadow-2xs overflow-hidden flex flex-col space-y-0">
      {/* Search & Filter Toolbar */}
      <div className="p-3 bg-slate-100 border-b border-slate-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex-1 flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice #, customer, vendor, paid from/by..."
              value={filter.searchQuery}
              onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
              id="sales-search-input"
            />
          </div>

          {/* Vendor Dropdown */}
          <select
            value={filter.vendorFilter}
            onChange={(e) => setFilter({ ...filter, vendorFilter: e.target.value })}
            className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 font-semibold"
            id="sales-vendor-filter-select"
          >
            <option value="all">All Vendors ({sales.length})</option>
            {uniqueVendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter & Add Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded text-[11px]">
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              className="px-1 py-0.5 text-[11px] border-0 focus:ring-0 text-slate-700 font-mono"
            />
            <span className="text-slate-400 text-[10px]">TO</span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
              className="px-1 py-0.5 text-[11px] border-0 focus:ring-0 text-slate-700 font-mono"
            />
          </div>

          {onOpenMonthlyReport && (
            <button
              onClick={onOpenMonthlyReport}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs transition-colors flex items-center gap-1 shrink-0"
              id="sales-table-monthly-pdf-btn"
              title="Generate Monthly PDF & Excel Sales Report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-200" />
              <span>MONTHLY REPORT (PDF & EXCEL)</span>
            </button>
          )}

          <button
            onClick={onAddNewSales}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-xs transition-colors flex items-center gap-1 shrink-0"
            id="add-sales-entry-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW SALES ENTRY</span>
          </button>
        </div>
      </div>

      {/* High Density Sales Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#1a1c1e] text-slate-200 border-b border-black font-bold uppercase text-[10px] tracking-tight">
              <th className="p-2.5 cursor-pointer hover:text-blue-400" onClick={() => handleSortChange('date')}>
                <div className="flex items-center gap-1">
                  <span>DATE</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th className="p-2.5 cursor-pointer hover:text-blue-400" onClick={() => handleSortChange('invoiceNumber')}>
                <div className="flex items-center gap-1">
                  <span>CUSTOMER INVOICE #</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th className="p-2.5 cursor-pointer hover:text-blue-400" onClick={() => handleSortChange('customerName')}>
                <div className="flex items-center gap-1">
                  <span>CUSTOMER</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th className="p-2.5 text-center">QTY</th>
              <th className="p-2.5 text-right cursor-pointer hover:text-blue-400" onClick={() => handleSortChange('totalInvoicePrice')}>
                <div className="flex items-center justify-end gap-1">
                  <span>SALES PRICE ($)</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th className="p-2.5 text-right">INVENTORY COST ($)</th>
              <th className="p-2.5 text-right cursor-pointer hover:text-blue-400" onClick={() => handleSortChange('profit')}>
                <div className="flex items-center justify-end gap-1">
                  <span>NET PROFIT ($)</span>
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </div>
              </th>
              <th className="p-2.5">VENDOR SUPPLIER</th>
              <th className="p-2.5 font-mono">VENDOR INV #</th>
              <th className="p-2.5">PAID FROM</th>
              <th className="p-2.5">PAID BY</th>
              <th className="p-2.5 text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                  No sales ledger entries found matching current criteria.
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => {
                const rev = s.totalInvoicePrice || 0;
                const cost = s.costPrice || 0;
                const calcProfit = rev - cost;
                const profitVal = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;
                const marginPct = rev > 0 ? (profitVal / rev) * 100 : 0;

                return (
                  <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Date */}
                    <td className="p-2.5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                      {s.date}
                    </td>

                    {/* Customer Invoice Number */}
                    <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {s.invoiceNumber}
                    </td>

                    {/* Customer Name */}
                    <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                      {s.customerName}
                    </td>

                    {/* Quantity */}
                    <td className="p-2.5 font-mono font-bold text-center text-slate-700">
                      {s.qty || 1}
                    </td>

                    {/* Sales Price */}
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      ${s.totalInvoicePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Inventory Cost */}
                    <td className="p-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      ${(s.costPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Net Profit */}
                    <td className="p-2.5 text-right font-mono whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                        profitVal >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        <span>${profitVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-[9px] text-emerald-700">({marginPct.toFixed(0)}%)</span>
                      </div>
                    </td>

                    {/* Vendor Name */}
                    <td className="p-2.5 font-bold uppercase text-slate-800 whitespace-nowrap">
                      {s.vendorName ? (
                        <button
                          onClick={() => onSelectVendor?.(s.vendorName)}
                          className="hover:text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{s.vendorName}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>

                    {/* Vendor Invoice # */}
                    <td className="p-2.5 font-mono text-slate-700 font-semibold whitespace-nowrap">
                      {s.vendorInvoiceNumber || <span className="text-slate-400 italic">--</span>}
                    </td>

                    {/* Paid From */}
                    <td className="p-2.5 text-slate-700 font-medium whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-[10px] font-semibold text-slate-700">
                        {s.paidFrom || 'Default Account'}
                      </span>
                    </td>

                    {/* Paid By */}
                    <td className="p-2.5 text-slate-800 font-medium whitespace-nowrap">
                      {s.paidBy || s.customerName}
                    </td>

                    {/* Actions */}
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditSales(s)}
                          className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                          title="Edit Sales Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSalesToDelete(s)}
                          className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                          title="Delete Sales Entry"
                          id={`delete-sales-btn-${s.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Table Summary */}
      <div className="p-3 bg-slate-100 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <div>
          Showing <strong className="text-slate-900 font-mono">{filteredSales.length}</strong> of{' '}
          <strong className="text-slate-900 font-mono">{sales.length}</strong> sales records
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div>
            REVENUE: <strong className="text-blue-700 font-bold">${filteredSales.reduce((acc, curr) => acc + (curr.totalInvoicePrice || 0), 0).toLocaleString()}</strong>
          </div>
          <div>
            PROFIT: <strong className="text-emerald-700 font-bold">${filteredSales.reduce((acc, curr) => {
              const rev = curr.totalInvoicePrice || 0;
              const cost = curr.costPrice || 0;
              const calc = rev - cost;
              const p = (typeof curr.profit === 'number' && curr.profit !== 0) ? curr.profit : calc;
              return acc + p;
            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!salesToDelete}
        onClose={() => setSalesToDelete(null)}
        onConfirm={() => {
          if (salesToDelete) {
            onDeleteSales(salesToDelete.id);
            setSalesToDelete(null);
          }
        }}
        title="Delete Sales Ledger Entry"
        description={`Are you sure you want to delete the sales record for invoice #${salesToDelete?.invoiceNumber || ''}?`}
        itemDetails={
          salesToDelete
            ? [
                { label: 'Customer Invoice #', value: salesToDelete.invoiceNumber },
                { label: 'Customer', value: salesToDelete.customerName },
                { label: 'Total Price', value: `$${(salesToDelete.totalInvoicePrice || 0).toFixed(2)}` },
                { label: 'Vendor Supplier', value: salesToDelete.vendorName || 'N/A' },
                { label: 'Vendor Invoice #', value: salesToDelete.vendorInvoiceNumber || 'N/A' },
              ]
            : []
        }
        confirmText="Delete Sales Entry"
        confirmVariant="danger"
      />
    </div>
  );
};
