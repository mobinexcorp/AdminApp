import React, { useState, useMemo } from 'react';
import { CustomerRecord, RecordFilter, DeviceGrade } from '../types';
import { GRADES } from '../data/initialData';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  Smartphone,
  Calendar,
  User,
  Hash,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Building2,
  ExternalLink
} from 'lucide-react';

interface RecordTableProps {
  records: CustomerRecord[];
  onEditRecord: (record: CustomerRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  onViewInvoice: (record: CustomerRecord) => void;
  onAddNewRecord: () => void;
  onSelectIMEI?: (imei: string) => void;
}

export const RecordTable: React.FC<RecordTableProps> = ({
  records,
  onEditRecord,
  onDeleteRecord,
  onViewInvoice,
  onAddNewRecord,
  onSelectIMEI,
}) => {
  const [filter, setFilter] = useState<RecordFilter>({
    searchQuery: '',
    gradeFilter: 'ALL',
    statusFilter: 'ALL',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const [copiedIMEI, setCopiedIMEI] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<CustomerRecord | null>(null);

  const handleCopyIMEI = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiedIMEI(imei);
    setTimeout(() => setCopiedIMEI(null), 2000);
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Search query
        const query = filter.searchQuery.toLowerCase().trim();
        if (query) {
          const matchCustomer = r.customerName.toLowerCase().includes(query);
          const matchModel = r.model.toLowerCase().includes(query);
          const matchIMEI = r.imei.toLowerCase().includes(query);
          const matchInvoice = r.invoiceNumber.toLowerCase().includes(query);
          if (!matchCustomer && !matchModel && !matchIMEI && !matchInvoice) {
            return false;
          }
        }

        // Grade Filter
        if (filter.gradeFilter !== 'ALL' && r.grade !== filter.gradeFilter) {
          return false;
        }

        // Status Filter
        if (filter.statusFilter !== 'ALL' && r.status !== filter.statusFilter) {
          return false;
        }

        // Date From
        if (filter.dateFrom && r.date < filter.dateFrom) {
          return false;
        }

        // Date To
        if (filter.dateTo && r.date > filter.dateTo) {
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
  }, [records, filter]);

  const toggleSort = (field: RecordFilter['sortBy']) => {
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
      gradeFilter: 'ALL',
      statusFilter: 'ALL',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
      {/* Control Bar: Search & Filters */}
      <div className="p-3 border-b border-slate-300 bg-slate-50 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) => setFilter((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search customer, IMEI, model, or invoice #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              id="search-input"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Grade Filter */}
            <select
              value={filter.gradeFilter}
              onChange={(e) => setFilter((prev) => ({ ...prev, gradeFilter: e.target.value }))}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              id="filter-grade-select"
            >
              <option value="ALL">All Grades</option>
              {GRADES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filter.statusFilter}
              onChange={(e) => setFilter((prev) => ({ ...prev, statusFilter: e.target.value }))}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
              id="filter-status-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="In Warranty">In Warranty</option>
              <option value="Refunded">Refunded</option>
            </select>

            {/* Reset Filters button */}
            {(filter.searchQuery || filter.gradeFilter !== 'ALL' || filter.statusFilter !== 'ALL' || filter.dateFrom || filter.dateTo) && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded transition-colors flex items-center gap-1"
                id="reset-filters-btn"
              >
                <RotateCcw className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Record Table / Cards List */}
      <div className="overflow-x-auto">
        {filteredRecords.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Date <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('customerName')}>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Customer <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
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
                <th className="py-2.5 px-3">Grade</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('invoiceNumber')}>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" /> Invoice <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRecords.map((record) => {
                const gradeMeta = GRADES.find((g) => g.value === record.grade) || {
                  color: 'bg-slate-100 text-slate-800 border-slate-200',
                };

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-blue-50/50 transition-colors group"
                    id={`record-row-${record.id}`}
                  >
                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {record.date}
                    </td>

                    {/* Customer */}
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      <div>{record.customerName}</div>
                      {record.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-normal">{record.customerPhone}</div>
                      )}
                    </td>

                    {/* Model */}
                    <td className="py-2.5 px-3 text-slate-800 font-medium whitespace-nowrap">
                      {record.model}
                    </td>

                    {/* IMEI */}
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700 tracking-wide whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectIMEI && onSelectIMEI(record.imei)}
                          className="bg-slate-50 hover:bg-blue-100 hover:text-blue-800 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer group/imei"
                          title="Click to view Vendor Database entry for this IMEI"
                        >
                          <span>{record.imei}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/imei:text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleCopyIMEI(record.imei)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                          title="Copy IMEI"
                        >
                          {copiedIMEI === record.imei ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Grade Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${gradeMeta.color}`}>
                        {record.grade}
                      </span>
                    </td>

                    {/* Invoice */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-slate-800">
                        {record.invoiceNumber}
                      </div>
                      {record.invoiceAmount !== undefined && (
                        <div className="text-[10px] text-blue-600 font-mono font-semibold">
                          ${record.invoiceAmount.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewInvoice(record)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 rounded transition-colors"
                          title="View Invoice Receipt"
                          id={`view-btn-${record.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditRecord(record)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100/60 rounded transition-colors"
                          title="Edit Record"
                          id={`edit-btn-${record.id}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRecordToDelete(record)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Record"
                          id={`delete-btn-${record.id}`}
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
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Records Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {records.length === 0
                ? 'You have not added any customer records yet.'
                : 'No device records match your current search and filter criteria.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              {records.length > 0 ? (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
                >
                  Clear Search Filters
                </button>
              ) : (
                <button
                  onClick={onAddNewRecord}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Record
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-[11px] text-slate-500 flex items-center justify-between font-mono">
        <span>
          ENTRIES: <strong className="text-slate-800">{filteredRecords.length}</strong> / <strong className="text-slate-800">{records.length}</strong>
        </span>
        <span className="text-[10px] text-slate-400 uppercase">
          SORT: {filter.sortBy} [{filter.sortOrder}]
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={() => {
          if (recordToDelete) {
            onDeleteRecord(recordToDelete.id);
            setRecordToDelete(null);
          }
        }}
        title="Delete Customer IMEI Record"
        description={`Are you sure you want to delete the record for ${recordToDelete?.customerName || 'this customer'}?`}
        itemDetails={
          recordToDelete
            ? [
                { label: 'Customer', value: recordToDelete.customerName },
                { label: 'Device Model', value: recordToDelete.model },
                { label: 'IMEI', value: recordToDelete.imei },
                { label: 'Invoice #', value: recordToDelete.invoiceNumber },
                { label: 'Grade', value: recordToDelete.grade },
              ]
            : []
        }
        confirmText="Delete Record"
        confirmVariant="danger"
      />
    </div>
  );
};
