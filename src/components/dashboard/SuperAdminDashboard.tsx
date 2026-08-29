import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Coins, 
  TrendingDown, 
  Building2, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  Eye,
  RotateCcw,
  Sparkles,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Sale, Branch, Expense, Product, BranchInventoryItem } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ReceiptModal } from '../pos/ReceiptModal';

interface SuperAdminDashboardProps {
  onSelectTab: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onSelectTab }) => {
  const { settings, activeBranchId, branches } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<BranchInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Selected sale for receipt preview
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);

  // Load dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const branchFilter = activeBranchId === 'all' ? undefined : activeBranchId;
      const [sList, eList, pList, invList] = await Promise.all([
        store.getSales(branchFilter),
        store.getExpenses(branchFilter),
        store.getProducts(),
        store.getInventory(branchFilter)
      ]);
      setSales(sList);
      setExpenses(eList);
      setProducts(pList);
      setInventory(invList);
      setLoading(false);
    };

    fetchData();
  }, [activeBranchId]);

  // Compute Time Ranges
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Today's Sales
  const todaySales = useMemo(() => {
    return sales.filter(s => s.createdAt.startsWith(todayStr) && s.status === 'completed');
  }, [sales, todayStr]);

  const todayRevenue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [todaySales]);

  // Month Sales
  const monthSales = useMemo(() => {
    return sales.filter(s => s.timestamp >= startOfMonth && s.status === 'completed');
  }, [sales, startOfMonth]);

  const monthRevenue = useMemo(() => {
    return monthSales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [monthSales]);

  const totalCostMonth = useMemo(() => {
    return monthSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
  }, [monthSales]);

  const totalExpensesMonth = useMemo(() => {
    return expenses
      .filter(e => new Date(e.date).getTime() >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, startOfMonth]);

  // Estimated Profit = (Revenue - Tax) - Product Cost - Operational Expenses
  const estimatedProfit = useMemo(() => {
    const netRevenue = monthSales.reduce((sum, s) => sum + (s.subtotal - s.discountAmount), 0);
    return netRevenue - totalCostMonth - totalExpensesMonth;
  }, [monthSales, totalCostMonth, totalExpensesMonth]);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.currentStock <= item.minStockAlert);
  }, [inventory]);

  // Top Selling Products Calculation
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { product: Product | null; name: string; quantity: number; revenue: number }> = {};

    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          if (!map[item.productId]) {
            const found = products.find(p => p.id === item.productId) || null;
            map[item.productId] = {
              product: found,
              name: item.productName,
              quantity: 0,
              revenue: 0
            };
          }
          map[item.productId].quantity += item.quantity;
          map[item.productId].revenue += item.subtotal;
        });
      }
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [sales, products]);

  // Daily Sales Trend Chart Data (Last 7 Days)
  const salesTrendData = useMemo(() => {
    const days: { date: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      
      const daySales = sales.filter(s => s.createdAt.startsWith(dStr) && s.status === 'completed');
      const revenue = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
      days.push({
        date: dStr,
        label,
        revenue,
        orders: daySales.length
      });
    }
    return days;
  }, [sales]);

  // Branch Performance Comparison
  const branchComparisonData = useMemo(() => {
    return branches.map(b => {
      const bSales = sales.filter(s => s.branchId === b.id && s.status === 'completed');
      const bRevenue = bSales.reduce((sum, s) => sum + s.grandTotal, 0);
      const bExpenses = expenses.filter(e => e.branchId === b.id).reduce((sum, e) => sum + e.amount, 0);
      return {
        name: b.name.replace('Taiwan X Foodex — ', '').replace('Branch', '').trim(),
        revenue: bRevenue,
        orders: bSales.length,
        expenses: bExpenses
      };
    });
  }, [branches, sales, expenses]);

  // Payment Method Breakdown
  const paymentMethodData = useMemo(() => {
    const map: Record<string, number> = {
      cash: 0,
      bkash: 0,
      nagad: 0,
      card: 0,
      mobile_banking: 0,
      due: 0
    };

    sales.forEach(s => {
      if (s.status === 'completed' && map[s.paymentMethod] !== undefined) {
        map[s.paymentMethod] += s.grandTotal;
      }
    });

    const colors: Record<string, string> = {
      cash: '#10b981',
      bkash: '#e11d48',
      nagad: '#f97316',
      card: '#0284c7',
      mobile_banking: '#8b5cf6',
      due: '#f43f5e'
    };

    return Object.entries(map)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => ({
        name: key.toUpperCase().replace('_', ' '),
        value: val,
        color: colors[key] || '#64748b'
      }));
  }, [sales]);

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Taiwan X Foodex Executive Dashboard
            </h1>
            <Badge variant="warning" size="sm">SUPER ADMIN</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {activeBranchId === 'all'
              ? 'Consolidated multi-branch real-time business performance'
              : `Scoped View: ${branches.find(b => b.id === activeBranchId)?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('pos')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Launch POS Register</span>
          </button>
          <button
            onClick={() => onSelectTab('reports')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
          >
            Full Analytics
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono">
              {formatCurrency(todayRevenue, currencySymbol)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-400 font-bold">{todaySales.length} orders</span> processed today
            </p>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              This Month Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono">
              {formatCurrency(monthRevenue, currencySymbol)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-400 font-bold">{monthSales.length} orders</span> this month
            </p>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Estimated Net Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-mono ${estimatedProfit >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
              {formatCurrency(estimatedProfit, currencySymbol)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium truncate">
              After COGS & Operational Expenses
            </p>
          </div>
        </div>

        {/* Low Stock Warning Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono">
              {lowStockItems.length}
            </h3>
            <button
              onClick={() => onSelectTab('inventory')}
              className="text-xs text-rose-400 hover:underline font-semibold mt-1 flex items-center gap-1"
            >
              <span>View & reorder stock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Area Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Daily Revenue Trend</h3>
              <p className="text-xs text-slate-400">7-day gross sales performance (BDT)</p>
            </div>
            <Badge variant="primary">Last 7 Days</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val), currencySymbol), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Method Distribution Pie Chart */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Payment Distribution</h3>
            <p className="text-xs text-slate-400">Cash vs Mobile Banking vs Cards</p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val), currencySymbol), 'Volume']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
            {paymentMethodData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Branch Performance & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Branch Comparison Bar Chart */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Branch Revenue Comparison</h3>
              <p className="text-xs text-slate-400">Comparing Main Banani, Uttara & Dhanmondi</p>
            </div>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [formatCurrency(Number(val), currencySymbol), 'Total']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Menu Items */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Top Selling Taiwanese Delights</h3>
              <p className="text-xs text-slate-400">Top revenue driving items</p>
            </div>
            <Award className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-3">
            {topSellingProducts.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  {item.product?.image && (
                    <img
                      src={item.product.image}
                      alt={item.name}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-800 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-100 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {item.quantity} portions sold
                    </p>
                  </div>
                </div>

                <span className="text-xs font-extrabold text-amber-400 font-mono shrink-0 ml-2">
                  {formatCurrency(item.revenue, currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Recent Transactions Feed */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Live Transactions Stream</h3>
            <p className="text-xs text-slate-400">Most recent customer checkouts across all branches</p>
          </div>
          <button
            onClick={() => onSelectTab('sales')}
            className="text-xs text-amber-400 hover:underline font-bold"
          >
            View All Sales
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 pl-2">Invoice #</th>
                <th className="pb-3">Branch</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Time</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sales.slice(0, 6).map(sale => (
                <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 pl-2 font-mono font-bold text-amber-400">{sale.invoiceNumber}</td>
                  <td className="py-3 text-slate-300 font-medium truncate max-w-[140px]">{sale.branchName}</td>
                  <td className="py-3 text-slate-300">{sale.customerName || 'Walk-in'}</td>
                  <td className="py-3 text-slate-400">{sale.itemCount || sale.items.length} items</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-white font-mono">
                    {formatCurrency(sale.grandTotal, currencySymbol)}
                  </td>
                  <td className="py-3 text-slate-400 font-mono text-[11px]">
                    {formatDateTime(sale.createdAt || sale.timestamp)}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button
                      onClick={() => setPreviewSale(sale)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px]"
                      title="View Receipt"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal Preview */}
      <ReceiptModal
        isOpen={previewSale !== null}
        onClose={() => setPreviewSale(null)}
        sale={previewSale}
        settings={settings}
      />
    </div>
  );
};
