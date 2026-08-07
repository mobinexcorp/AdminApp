import React from 'react';
import { CustomerRecord } from '../types';
import { FileText, Smartphone, DollarSign, Award, Clock } from 'lucide-react';

interface RecordStatsProps {
  records: CustomerRecord[];
}

export const RecordStats: React.FC<RecordStatsProps> = ({ records }) => {
  const totalRecords = records.length;

  const totalAmount = records.reduce((sum, r) => sum + (r.invoiceAmount || 0), 0);

  const pendingCount = records.filter((r) => r.status === 'Pending').length;

  const newOrGradeA = records.filter(
    (r) => r.grade === 'New' || r.grade === 'Grade A+' || r.grade === 'Grade A'
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Records */}
      <div className="bg-white border border-slate-300 rounded p-3 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">TOTAL RECORDS</span>
          <h3 className="text-xl font-bold font-mono text-slate-800 mt-1">{totalRecords}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Logged customer entries</p>
        </div>
        <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
          <FileText className="w-4 h-4" />
        </div>
      </div>

      {/* Total Invoice Value */}
      <div className="bg-white border border-slate-300 rounded p-3 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">ESTIMATED VALUE</span>
          <h3 className="text-xl font-bold font-mono text-slate-900 mt-1">
            ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Recorded invoice total</p>
        </div>
        <div className="w-9 h-9 rounded bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
          <DollarSign className="w-4 h-4" />
        </div>
      </div>

      {/* Mint / Grade A Condition Ratio */}
      <div className="bg-white border border-slate-300 rounded p-3 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">GRADE A / MINT</span>
          <h3 className="text-xl font-bold font-mono text-blue-600 mt-1">
            {newOrGradeA} <span className="text-xs font-normal text-slate-400">({totalRecords > 0 ? Math.round((newOrGradeA / totalRecords) * 100) : 0}%)</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">High tier condition ratio</p>
        </div>
        <div className="w-9 h-9 rounded bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
          <Award className="w-4 h-4" />
        </div>
      </div>

      {/* Pending Transactions */}
      <div className="bg-white border border-slate-300 rounded p-3 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">PENDING SETTLEMENT</span>
          <h3 className="text-xl font-bold font-mono text-amber-600 mt-1">{pendingCount}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Awaiting review / warranty</p>
        </div>
        <div className="w-9 h-9 rounded bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
