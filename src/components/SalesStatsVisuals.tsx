import React, { useMemo } from 'react';
import { SalesRecord } from '../types';
import {
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingCart,
  Building2,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface SalesStatsVisualsProps {
  sales: SalesRecord[];
  timePeriod: 'daily' | 'monthly' | 'yearly' | 'all';
  onTimePeriodChange: (period: 'daily' | 'monthly' | 'yearly' | 'all') => void;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const SalesStatsVisuals: React.FC<SalesStatsVisualsProps> = ({
  sales,
  timePeriod,
  onTimePeriodChange,
}) => {
  // Aggregate Stats
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalQty = 0;

    sales.forEach((s) => {
      const rev = s.totalInvoicePrice || 0;
      const cost = s.costPrice || 0;
      const calcProfit = rev - cost;
      const prof = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;

      totalRevenue += rev;
      totalCost += cost;
      totalProfit += prof;
      totalQty += s.qty || 1;
    });

    const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgInvoice = sales.length > 0 ? totalRevenue / sales.length : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalQty,
      marginPct,
      avgInvoice,
      count: sales.length,
    };
  }, [sales]);

  // Aggregated Time Series Data for Recharts
  const timeSeriesData = useMemo(() => {
    const map: Record<string, { label: string; revenue: number; cost: number; profit: number; qty: number }> = {};

    // Sort sales by date ascending
    const sorted = [...sales].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach((s) => {
      let key = s.date; // YYYY-MM-DD
      if (timePeriod === 'monthly') {
        key = s.date.slice(0, 7); // YYYY-MM
      } else if (timePeriod === 'yearly') {
        key = s.date.slice(0, 4); // YYYY
      }

      if (!map[key]) {
        map[key] = { label: key, revenue: 0, cost: 0, profit: 0, qty: 0 };
      }

      const rev = s.totalInvoicePrice || 0;
      const cost = s.costPrice || 0;
      const calcProfit = rev - cost;
      const prof = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;

      map[key].revenue += rev;
      map[key].cost += cost;
      map[key].profit += prof;
      map[key].qty += s.qty || 1;
    });

    return Object.values(map);
  }, [sales, timePeriod]);

  // Aggregated Vendor Breakdown Data
  const vendorBreakdownData = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; profit: number; count: number }> = {};

    sales.forEach((s) => {
      const vName = (s.vendorName || 'Unspecified').trim();
      if (!map[vName]) {
        map[vName] = { name: vName, revenue: 0, profit: 0, count: 0 };
      }
      const rev = s.totalInvoicePrice || 0;
      const cost = s.costPrice || 0;
      const calcProfit = rev - cost;
      const prof = (typeof s.profit === 'number' && s.profit !== 0) ? s.profit : calcProfit;

      map[vName].revenue += rev;
      map[vName].profit += prof;
      map[vName].count += 1;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  return (
    <div className="space-y-4">
      {/* Period Filter Header */}
      <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">
            Sales & Profit Analytics Dashboard
          </h3>
        </div>

        {/* Time Period Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-300 text-xs font-bold">
          <span className="text-slate-500 text-[10px] uppercase px-1 hidden sm:inline">Time Grouping:</span>
          {(['daily', 'monthly', 'yearly', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => onTimePeriodChange(period)}
              className={`px-3 py-1 rounded text-[11px] uppercase transition-colors ${
                timePeriod === period
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              id={`period-btn-${period}`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900 font-mono">
            ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            {stats.count} Invoices
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inventory Cost</span>
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-base font-extrabold text-slate-700 font-mono">
            ${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Purchases Cost
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-emerald-50/80 p-3 rounded border border-emerald-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Net Profit</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base font-extrabold text-emerald-950 font-mono">
            ${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-1 font-mono flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Net Profit Margin
          </div>
        </div>

        {/* Profit Margin % */}
        <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Margin %</span>
            <Percent className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-base font-extrabold text-teal-800 font-mono">
            {stats.marginPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Profit Ratio
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Units Sold</span>
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900 font-mono">
            {stats.totalQty} <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Total Quantity
          </div>
        </div>

        {/* Avg Invoice Value */}
        <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Order</span>
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900 font-mono">
            ${stats.avgInvoice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            Per Invoice
          </div>
        </div>
      </div>

      {/* Visual Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Sales & Profit Trend Chart (2 columns) */}
        <div className="lg:col-span-2 bg-white p-4 rounded border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">
                Revenue vs. Cost vs. Net Profit Trend ({timePeriod})
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Grouping: {timePeriod.toUpperCase()}
            </span>
          </div>

          <div className="h-64 w-full">
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="revenue" name="Total Revenue ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="cost" name="Inventory Cost ($)" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={28} />
                  <Line type="monotone" dataKey="profit" name="Net Profit ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No time series data available for selected period.
              </div>
            )}
          </div>
        </div>

        {/* Vendor Breakdown Pie Chart (1 column) */}
        <div className="bg-white p-4 rounded border border-slate-300 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">
                  Revenue Share by Vendor
                </h4>
              </div>
            </div>

            <div className="h-44 w-full">
              {vendorBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="revenue"
                    >
                      {vendorBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No vendor data available.
                </div>
              )}
            </div>
          </div>

          {/* Top Vendors Legend List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-28 overflow-y-auto">
            {vendorBreakdownData.slice(0, 4).map((v, i) => (
              <div key={v.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="font-bold text-slate-800 truncate uppercase">{v.name}</span>
                </div>
                <div className="font-mono text-slate-700 font-semibold shrink-0">
                  ${v.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
