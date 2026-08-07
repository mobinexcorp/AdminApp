import React, { useState, useMemo } from 'react';
import { VendorRecord, VendorFilter } from '../types';
import { GRADES } from '../data/initialData';
import {
  Search,
  ArrowUpDown,
  Smartphone,
  Calendar,
  Building2,
  Hash,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface VendorTableProps {
  vendors: VendorRecord[];
  onEditVendor: (vendor: VendorRecord) => void;
  onDeleteVendor: (vendorId: string) => void;
  onAddNewVendor: () => void;
  onOpenPriceList?: () => void;
  highlightIMEI?: string | null;
}

export const VendorTable: React.FC<VendorTableProps> = ({
  vendors,
  onEditVendor,
  onDeleteVendor,
  onAddNewVendor,
  onOpenPriceList,
  highlightIMEI,
}) => {
  const [filter, setFilter] = useState<VendorFilter>({
    searchQuery: highlightIMEI || '',
    vendorFilter: 'ALL',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [copiedIMEI, setCopiedIMEI] = useState<string | null>(null);

  // Sync highlightIMEI if changed
  React.useEffect(() => {
    if (highlightIMEI) {
      setFilter((prev) => ({ ...prev, searchQuery: highlightIMEI }));
    }
  }, [highlightIMEI]);

  const uniqueVendors = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => {
      if (v.vendorName) set.add(v.vendorName.trim());
    });
    return Array.from(set).sort();
  }, [vendors]);

  const handleCopyIMEI = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiedIMEI(imei);
    setTimeout(() => setCopiedIMEI(null), 2000);
  };

  const filteredVendors = useMemo(() => {
    return vendors
      .filter((v) => {
        // Search Query
        const query = filter.searchQuery.toLowerCase().trim();
        if (query) {
          const matchVendor = v.vendorName.toLowerCase().includes(query);
          const matchModel = v.model.toLowerCase().includes(query);
          const matchIMEI = v.imei.toLowerCase().includes(query);
          const matchInvoice = v.invoiceNumber.toLowerCase().includes(query);
          if (!matchVendor && !matchModel && !matchIMEI && !matchInvoice) {
            return false;
          }
        }

        // Vendor Filter
        if (filter.vendorFilter !== 'ALL' && v.vendorName.trim() !== filter.vendorFilter) {
          return false;
        }

        // Date From
        if (filter.dateFrom && v.date < filter.dateFrom) {
          return false;
        }

        // Date To
        if (filter.dateTo && v.date > filter.dateTo) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: string | number = a[filter.sortBy] || '';
        let valB: string | number = b[filter.sortBy] || '';

        if (filter.sortBy === 'date') {
          valA = a.date;
          valB = b.date;
        }

        if (valA < valB) return filter.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return filter.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [vendors, filter]);

  const toggleSort = (field: VendorFilter['sortBy']) => {
    if (filter.sortBy === field) {
      setFilter((prev) => ({
        ...prev,
        sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
      }));
    } else {
      setFilter((prev) => ({
        ...prev,
        sortBy: field,
        sortOrder: 'asc',
      }));
    }
  };

  const resetFilters = () => {
    setFilter({
      searchQuery: '',
      vendorFilter: 'ALL',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-slate-300 bg-slate-50 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) => setFilter((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search vendor name, IMEI, model, or invoice #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="vendor-search-input"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Vendor Select */}
            <select
              value={filter.vendorFilter}
              onChange={(e) => setFilter((prev) => ({ ...prev, vendorFilter: e.target.value }))}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              id="filter-vendor-select"
            >
              <option value="ALL">All Vendors ({uniqueVendors.length})</option>
              {uniqueVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(filter.searchQuery || filter.vendorFilter !== 'ALL' || filter.dateFrom || filter.dateTo) && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded transition-colors flex items-center gap-1"
                id="reset-vendor-filters-btn"
              >
                <RotateCcw className="w-3 h-3" /> Clear Search
              </button>
            )}

            {onOpenPriceList && (
              <button
                onClick={onOpenPriceList}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs text-xs flex items-center gap-1.5 transition-colors"
                id="vendor-price-list-tab-btn"
                title="Process Vendor Daily Excel Sheets with +$10 & +$15 Markups"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> DAILY PRICE LIST (+ $10 / + $15)
              </button>
            )}

            <button
              onClick={onAddNewVendor}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs text-xs flex items-center gap-1"
              id="add-vendor-btn"
            >
              <Plus className="w-3.5 h-3.5" /> ADD VENDOR ENTRY
            </button>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="overflow-x-auto">
        {filteredVendors.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Date <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('vendorName')}>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> Vendor Name <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('model')}>
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-slate-400" /> Device Model <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3 h-3 text-slate-400" /> IMEI / Serial
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('invoiceNumber')}>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" /> Invoice # <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Grade</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredVendors.map((vendor) => {
                const isMatch = highlightIMEI && vendor.imei.toLowerCase() === highlightIMEI.toLowerCase();
                const gradeMeta = GRADES.find((g) => g.value === vendor.grade) || {
                  color: 'bg-slate-100 text-slate-800 border-slate-200',
                };

                return (
                  <tr
                    key={vendor.id}
                    className={`transition-colors group ${
                      isMatch
                        ? 'bg-amber-100/80 font-bold border-l-4 border-amber-500'
                        : 'hover:bg-blue-50/50'
                    }`}
                    id={`vendor-row-${vendor.id}`}
                  >
                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {vendor.date}
                    </td>

                    {/* Vendor Name */}
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap uppercase">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{vendor.vendorName}</span>
                      </div>
                    </td>

                    {/* Model */}
                    <td className="py-2.5 px-3 text-slate-800 font-medium whitespace-nowrap">
                      {vendor.model}
                    </td>

                    {/* IMEI */}
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700 tracking-wide whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono border ${
                          isMatch ? 'bg-amber-200 border-amber-400 text-amber-950 font-bold' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {vendor.imei}
                        </span>
                        <button
                          onClick={() => handleCopyIMEI(vendor.imei)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                          title="Copy IMEI"
                        >
                          {copiedIMEI === vendor.imei ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Invoice */}
                    <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                      {vendor.invoiceNumber}
                    </td>

                    {/* Grade */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {vendor.grade ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${gradeMeta.color}`}>
                          {vendor.grade}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditVendor(vendor)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 rounded transition-colors"
                          title="Edit Vendor Record"
                          id={`edit-vendor-btn-${vendor.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete vendor entry for ${vendor.vendorName} (${vendor.imei})?`)) {
                              onDeleteVendor(vendor.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Vendor Record"
                          id={`delete-vendor-btn-${vendor.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Vendor Records Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {vendors.length === 0
                ? 'No vendor database records exist yet. Import a spreadsheet or create vendor entries manually.'
                : 'No vendor records match your search criteria.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              {vendors.length > 0 ? (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
                >
                  Clear Search Filters
                </button>
              ) : (
                <button
                  onClick={onAddNewVendor}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Vendor Entry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-[11px] text-slate-500 flex items-center justify-between font-mono">
        <span>
          VENDOR ENTRIES: <strong className="text-slate-800">{filteredVendors.length}</strong> / <strong className="text-slate-800">{vendors.length}</strong>
        </span>
        <span className="text-[10px] text-slate-400 uppercase">
          SORT: {filter.sortBy} [{filter.sortOrder}]
        </span>
      </div>
    </div>
  );
};
