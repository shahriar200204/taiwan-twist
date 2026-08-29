import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Building2, 
  Download, 
  TrendingDown, 
  PieChart as PieIcon,
  Tag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Expense } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const ExpenseManager: React.FC = () => {
  const { role, settings, activeBranchId, branches, user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>(activeBranchId);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Add Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: '',
    branchId: branches[0]?.id || 'branch-main',
    category: 'utilities' as Expense['category'],
    amount: 1500,
    paymentMethod: 'cash' as Expense['paymentMethod'],
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Delete
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const loadExpenses = async () => {
    setLoading(true);
    const branchScope = filterBranchId === 'all' ? undefined : filterBranchId;
    const eList = await store.getExpenses(branchScope);
    setExpenses(eList);
    setLoading(false);
  };

  useEffect(() => {
    setFilterBranchId(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    loadExpenses();
  }, [filterBranchId]);

  // Filtered
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.branchName.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [expenses, searchQuery, categoryFilter]);

  // Total Expenses
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Save Expense
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.amount <= 0) {
      alert('Title and valid amount are required');
      return;
    }

    const branch = branches.find(b => b.id === formData.branchId) || branches[0];

    const expenseToSave: Expense = {
      id: `exp-${Date.now()}`,
      title: formData.title.trim(),
      branchId: formData.branchId,
      branchName: branch.name,
      category: formData.category,
      amount: Number(formData.amount),
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim() || undefined,
      createdBy: user?.displayName || 'Admin',
      date: formData.date,
      createdAt: new Date().toISOString()
    };

    await store.saveExpense(expenseToSave);
    setIsModalOpen(false);
    await loadExpenses();
  };

  // Delete Expense
  const handleConfirmDelete = async () => {
    if (!deleteExpenseId) return;
    await store.deleteExpense(deleteExpenseId);
    setDeleteExpenseId(null);
    await loadExpenses();
  };

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <TrendingDown className="w-7 h-7 text-rose-400" />
            <span>Operational Expenses & Outflows</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track utilities, rent, ingredient deliveries, staff welfare and maintenance
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              title: '',
              branchId: role === 'super_admin' ? (branches[0]?.id || 'branch-main') : (user?.branchId || 'branch-main'),
              category: 'utilities',
              amount: 1500,
              paymentMethod: 'cash',
              notes: '',
              date: new Date().toISOString().split('T')[0]
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Filtered Operational Expenses</span>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">
            {formatCurrency(totalAmount, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{filteredExpenses.length} expense entries</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expense description, notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

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

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Expense Categories</option>
            <option value="rent">Rent & Premises</option>
            <option value="utilities">Utilities & Electricity</option>
            <option value="salaries">Staff Wages</option>
            <option value="supplies">Packaging & Supplies</option>
            <option value="marketing">Marketing & Promo</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other Outflows</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40">
                <th className="py-3.5 pl-5">Expense Title</th>
                <th className="py-3.5">Branch</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Date</th>
                <th className="py-3.5 text-right">Amount</th>
                <th className="py-3.5">Payment</th>
                <th className="py-3.5">Recorded By</th>
                <th className="py-3.5 text-right pr-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-5 font-bold text-slate-100">
                      <div>{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[10px] text-slate-400 font-normal">{exp.notes}</div>
                      )}
                    </td>

                    <td className="py-3.5 text-slate-300 font-medium truncate max-w-[130px]">
                      {exp.branchName}
                    </td>

                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold text-[11px] uppercase">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3.5 font-mono text-slate-400 text-[11px]">
                      {exp.date}
                    </td>

                    <td className="py-3.5 text-right font-mono font-black text-rose-400">
                      {formatCurrency(exp.amount, currencySymbol)}
                    </td>

                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
                        {exp.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3.5 text-slate-400">
                      {exp.createdBy}
                    </td>

                    <td className="py-3.5 text-right pr-5">
                      <button
                        onClick={() => setDeleteExpenseId(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Operational Expense"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Expense Description *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Electricity Bill or Tapioca Pearl Shipment"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Branch Location
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Expense Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="utilities">Utilities & Electricity</option>
                <option value="rent">Rent & Premises</option>
                <option value="salaries">Staff Wages</option>
                <option value="supplies">Packaging & Supplies</option>
                <option value="marketing">Marketing & Promo</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other Outflows</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Expense Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="cash">Cash in Hand</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Company Debit Card</option>
              <option value="mobile_banking">bKash / Nagad</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Internal Notes / Receipt Voucher # (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Voucher #DESCO-2026-08, authorized by Branch Manager"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              Record Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteExpenseId !== null}
        onClose={() => setDeleteExpenseId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Expense Entry"
        message="Are you sure you want to delete this recorded expense?"
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};
