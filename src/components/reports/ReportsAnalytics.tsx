import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  FileText, 
  PieChart as PieIcon,
  Percent,
  Award,
  Users,
  Coins
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Sale, Expense, Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const ReportsAnalytics: React.FC = () => {
  const { settings, activeBranchId, branches, role } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Time & Branch Filters
  const [filterBranchId, setFilterBranchId] = useState<string>(activeBranchId);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'all'>('month');

  const loadData = async () => {
    setLoading(true);
    const branchScope = filterBranchId === 'all' ? undefined : filterBranchId;
    const [sList, eList, pList] = await Promise.all([
      store.getSales(branchScope),
      store.getExpenses(branchScope),
      store.getProducts()
    ]);
    setSales(sList);
    setExpenses(eList);
    setProducts(pList);
    setLoading(false);
  };

  useEffect(() => {
    setFilterBranchId(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    loadData();
  }, [filterBranchId]);

  // Date thresholds
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = now.getTime() - (7 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status !== 'completed') return false;
      if (timeRange === 'today') return s.createdAt.startsWith(todayStr);
      if (timeRange === '7days') return s.timestamp >= sevenDaysAgo;
      if (timeRange === 'month') return s.timestamp >= startOfMonth;
      return true;
    });
  }, [sales, timeRange, todayStr, sevenDaysAgo, startOfMonth]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eTime = new Date(e.date).getTime();
      if (timeRange === 'today') return e.date === todayStr;
      if (timeRange === '7days') return eTime >= sevenDaysAgo;
      if (timeRange === 'month') return eTime >= startOfMonth;
      return true;
    });
  }, [expenses, timeRange, todayStr, sevenDaysAgo, startOfMonth]);

  // P&L Metrics
  const pl = useMemo(() => {
    const grossSales = filteredSales.reduce((sum, s) => sum + s.subtotal, 0);
    const totalDiscounts = filteredSales.reduce((sum, s) => sum + s.discountAmount, 0);
    const netSales = grossSales - totalDiscounts;
    const totalTax = filteredSales.reduce((sum, s) => sum + s.taxAmount, 0);
    const cogs = filteredSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const grossProfit = netSales - cogs;
    const grossMarginPct = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : '0';
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netOperatingProfit = grossProfit - totalExpenses;

    return {
      grossSales,
      totalDiscounts,
      netSales,
      totalTax,
      cogs,
      grossProfit,
      grossMarginPct,
      totalExpenses,
      netOperatingProfit
    };
  }, [filteredSales, filteredExpenses]);

  // Item Performance Ranking
  const itemPerformance = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; cost: number; profit: number }> = {};

    filteredSales.forEach(s => {
      s.items.forEach(it => {
        if (!map[it.productId]) {
          map[it.productId] = {
            name: it.productName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        const itemCost = (it.costPrice || 0) * it.quantity;
        map[it.productId].quantity += it.quantity;
        map[it.productId].revenue += it.subtotal;
        map[it.productId].cost += itemCost;
        map[it.productId].profit += (it.subtotal - itemCost);
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Cashier Performance Metrics
  const cashierPerformance = useMemo(() => {
    const map: Record<string, { name: string; orders: number; revenue: number }> = {};

    filteredSales.forEach(s => {
      if (!map[s.cashierName]) {
        map[s.cashierName] = { name: s.cashierName, orders: 0, revenue: 0 };
      }
      map[s.cashierName].orders++;
      map[s.cashierName].revenue += s.grandTotal;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none print:p-0 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-amber-400" />
            <span>Financial Statements & Business Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Profit & Loss statements, Cost of Goods Sold (COGS), margins, and cashier performance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Financial Report</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md print:hidden">
        <div className="flex items-center gap-2">
          {/* Time Range Pills */}
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Branch Scope */}
        {role === 'super_admin' && (
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">🌐 All Branches Consolidated</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>📍 {b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ================= PROFIT & LOSS STATEMENT ================= */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              Comprehensive Profit & Loss (P&L) Statement
            </h2>
            <p className="text-xs text-slate-400">
              Period: {timeRange.toUpperCase()} • {filterBranchId === 'all' ? 'All Branches' : branches.find(b => b.id === filterBranchId)?.name}
            </p>
          </div>
          <Coins className="w-5 h-5 text-amber-400" />
        </div>

        {/* P&L Breakdown Table */}
        <div className="divide-y divide-slate-800/80 text-xs font-sans">
          {/* Gross Sales */}
          <div className="py-2.5 flex justify-between items-center text-slate-300">
            <span className="font-semibold">Gross Food & Beverage Sales</span>
            <span className="font-mono font-bold text-white text-sm">
              {formatCurrency(pl.grossSales, currencySymbol)}
            </span>
          </div>

          {/* Discounts */}
          <div className="py-2.5 flex justify-between items-center text-slate-400">
            <span className="pl-4">Less: Promotional Discounts & Concessions</span>
            <span className="font-mono text-rose-400">
              - {formatCurrency(pl.totalDiscounts, currencySymbol)}
            </span>
          </div>

          {/* Net Sales */}
          <div className="py-2.5 flex justify-between items-center text-slate-200 font-bold bg-slate-950/40 px-3 rounded-xl">
            <span>Net Sales Revenue</span>
            <span className="font-mono text-white text-sm">
              {formatCurrency(pl.netSales, currencySymbol)}
            </span>
          </div>

          {/* COGS */}
          <div className="py-2.5 flex justify-between items-center text-slate-400">
            <span className="pl-4">Less: Cost of Goods Sold (Ingredients & Direct Cost)</span>
            <span className="font-mono text-rose-400">
              - {formatCurrency(pl.cogs, currencySymbol)}
            </span>
          </div>

          {/* Gross Profit */}
          <div className="py-3 flex justify-between items-center text-amber-400 font-extrabold bg-amber-500/10 px-3 rounded-xl border border-amber-500/20">
            <div>
              <span>Gross Operating Profit</span>
              <span className="text-[11px] font-normal text-slate-400 ml-2">
                (Margin: {pl.grossMarginPct}%)
              </span>
            </div>
            <span className="font-mono text-base font-black">
              {formatCurrency(pl.grossProfit, currencySymbol)}
            </span>
          </div>

          {/* Operating Expenses */}
          <div className="py-2.5 flex justify-between items-center text-slate-400">
            <span className="pl-4">Less: Operational Expenses (Rent, Utilities, Staff, Supplies)</span>
            <span className="font-mono text-rose-400">
              - {formatCurrency(pl.totalExpenses, currencySymbol)}
            </span>
          </div>

          {/* Net Operating Profit */}
          <div className="py-3.5 flex justify-between items-center text-base font-black bg-gradient-to-r from-slate-950 to-slate-900 px-4 rounded-2xl border border-slate-700">
            <span className="text-white">NET OPERATING PROFIT / (LOSS)</span>
            <span className={`font-mono text-lg ${pl.netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(pl.netOperatingProfit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Item Performance & Cashier Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Sales Contribution */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Menu Item Profit Contribution</h3>
            <Award className="w-4 h-4 text-amber-400" />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
            {itemPerformance.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-100 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {item.quantity} portions • Cost: {formatCurrency(item.cost, currencySymbol)}
                  </p>
                </div>
                <div className="text-right font-mono shrink-0">
                  <p className="font-bold text-amber-400">{formatCurrency(item.revenue, currencySymbol)}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">
                    +{formatCurrency(item.profit, currencySymbol)} profit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cashier Performance */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Cashier Register Productivity</h3>
            <Users className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-2.5">
            {cashierPerformance.map((c, idx) => {
              const avg = c.orders > 0 ? Math.round(c.revenue / c.orders) : 0;

              return (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-100">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {c.orders} orders processed • Avg Order: {formatCurrency(avg, currencySymbol)}
                    </p>
                  </div>
                  <span className="font-bold text-white font-mono text-sm">
                    {formatCurrency(c.revenue, currencySymbol)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
