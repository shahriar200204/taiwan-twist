import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Eye, 
  RotateCcw, 
  Download, 
  Printer, 
  DollarSign, 
  Calendar, 
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Sale, Branch } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { ReceiptModal } from '../pos/ReceiptModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const SalesHistory: React.FC = () => {
  const { role, settings, activeBranchId, branches } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>(activeBranchId);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Preview / Print Receipt Modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Refund Dialog
  const [refundSaleId, setRefundSaleId] = useState<string | null>(null);

  const loadSales = async () => {
    setLoading(true);
    const branchScope = filterBranchId === 'all' ? undefined : filterBranchId;
    const sList = await store.getSales(branchScope);
    setSales(sList);
    setLoading(false);
  };

  useEffect(() => {
    setFilterBranchId(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    loadSales();
  }, [filterBranchId]);

  // Date threshold helper
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = now.getTime() - (7 * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.cashierName.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q);

      // Date
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = s.createdAt.startsWith(todayStr);
      else if (dateFilter === '7days') matchesDate = s.timestamp >= sevenDaysAgo;
      else if (dateFilter === 'month') matchesDate = s.timestamp >= startOfMonth;

      // Payment
      let matchesPayment = true;
      if (paymentFilter !== 'all') matchesPayment = s.paymentMethod === paymentFilter;

      // Status
      let matchesStatus = true;
      if (statusFilter !== 'all') matchesStatus = s.status === statusFilter;

      return matchesSearch && matchesDate && matchesPayment && matchesStatus;
    });
  }, [sales, searchQuery, dateFilter, paymentFilter, statusFilter, todayStr, sevenDaysAgo, startOfMonth]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalDue = 0;
    let completedOrders = 0;

    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        totalRevenue += s.grandTotal;
        totalTax += s.taxAmount;
        totalDiscount += s.discountAmount;
        totalDue += s.dueAmount;
        completedOrders++;
      }
    });

    return { totalRevenue, totalTax, totalDiscount, totalDue, completedOrders };
  }, [filteredSales]);

  // Handle Refund
  const handleConfirmRefund = async () => {
    if (!refundSaleId) return;
    await store.refundSale(refundSaleId, 'Customer return / order cancelled');
    setRefundSaleId(null);
    await loadSales();
  };

  // Export Sales to CSV
  const handleExportCSV = () => {
    const headers = [
      'Invoice #', 
      'Date & Time', 
      'Branch', 
      'Cashier', 
      'Customer', 
      'Items Count', 
      'Subtotal', 
      'Discount', 
      'Tax', 
      'Grand Total', 
      'Payment Method', 
      'Status'
    ];

    const rows = filteredSales.map(s => [
      `"${s.invoiceNumber}"`,
      `"${formatDateTime(s.createdAt)}"`,
      `"${s.branchName}"`,
      `"${s.cashierName}"`,
      `"${s.customerName || 'Walk-in'}"`,
      s.itemCount || s.items.length,
      s.subtotal,
      s.discountAmount,
      s.taxAmount,
      s.grandTotal,
      `"${s.paymentMethod}"`,
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TXF_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-amber-400" />
            <span>Sales & Order Transactions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete transaction registry, invoice reprint, and customer returns
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Filtered Gross Sales</span>
          <h3 className="text-xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(metrics.totalRevenue, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{metrics.completedOrders} completed transactions</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Tax / VAT Collected</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            {formatCurrency(metrics.totalTax, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Government VAT pool</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Discounts Given</span>
          <h3 className="text-xl font-black text-rose-400 font-mono mt-1">
            {formatCurrency(metrics.totalDiscount, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Promotional concessions</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Due / Receivables</span>
          <h3 className="text-xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(metrics.totalDue, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Unsettled credit balances</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer name, phone, cashier..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
            <option value="7days">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>

          {/* Branch Filter */}
          {role === 'super_admin' && (
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">🌐 All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>📍 {b.name}</option>
              ))}
            </select>
          )}

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="card">Card / POS</option>
            <option value="due">Due / Credit</option>
          </select>
        </div>

        <button
          onClick={loadSales}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40">
                <th className="py-3.5 pl-5">Invoice #</th>
                <th className="py-3.5">Date & Time</th>
                <th className="py-3.5">Branch</th>
                <th className="py-3.5">Customer</th>
                <th className="py-3.5">Cashier</th>
                <th className="py-3.5 text-center">Items</th>
                <th className="py-3.5 text-right">Grand Total</th>
                <th className="py-3.5">Payment</th>
                <th className="py-3.5 text-center">Status</th>
                <th className="py-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Loading sales transactions...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No sales found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isRefunded = sale.status === 'refunded';

                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 pl-5 font-mono font-bold text-amber-400">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3.5 font-mono text-slate-400 text-[11px]">
                        {formatDateTime(sale.createdAt || sale.timestamp)}
                      </td>
                      <td className="py-3.5 text-slate-300 font-medium truncate max-w-[130px]">
                        {sale.branchName}
                      </td>
                      <td className="py-3.5 text-slate-200 font-medium">
                        {sale.customerName || 'Walk-in Guest'}
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {sale.cashierName}
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-300">
                        {sale.itemCount || sale.items.length}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-white">
                        {formatCurrency(sale.grandTotal, currencySymbol)}
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 text-center">
                        <Badge
                          variant={isRefunded ? 'danger' : sale.dueAmount > 0 ? 'warning' : 'success'}
                          dot
                        >
                          {isRefunded ? 'Refunded' : sale.dueAmount > 0 ? 'Due Pending' : 'Completed'}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="View & Print Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isRefunded && (role === 'super_admin' || role === 'branch_admin') && (
                            <button
                              onClick={() => setRefundSaleId(sale.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Refund / Return Sale"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={selectedSale !== null}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        settings={settings}
      />

      {/* Refund Confirmation */}
      <ConfirmDialog
        isOpen={refundSaleId !== null}
        onClose={() => setRefundSaleId(null)}
        onConfirm={handleConfirmRefund}
        title="Refund & Void Sale"
        message="Are you sure you want to refund this order? This will mark the transaction as refunded and restore all product stock quantities to the branch inventory."
        confirmText="Confirm Refund"
        type="danger"
      />
    </div>
  );
};
