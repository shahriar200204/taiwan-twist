import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  ShoppingBag, 
  Coins, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock, 
  CreditCard,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Customer, Sale } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const CustomerManager: React.FC = () => {
  const { settings, role } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dueFilterOnly, setDueFilterOnly] = useState<boolean>(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Due settlement modal
  const [settleCust, setSettleCust] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);

  // Customer order history modal
  const [historyCust, setHistoryCust] = useState<Customer | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [cList, sList] = await Promise.all([
      store.getCustomers(),
      store.getSales()
    ]);
    setCustomers(cList);
    setSales(sList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchesDue = !dueFilterOnly || c.dueAmount > 0;

      return matchesSearch && matchesDue;
    });
  }, [customers, searchQuery, dueFilterOnly]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalCust = customers.length;
    let totalPurchases = 0;
    let totalDue = 0;

    customers.forEach(c => {
      totalPurchases += c.totalPurchases || 0;
      totalDue += c.dueAmount || 0;
    });

    return { totalCust, totalPurchases, totalDue };
  }, [customers]);

  // Save Customer
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Name and phone are required');
      return;
    }

    const custToSave: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      totalPurchases: editingCustomer ? editingCustomer.totalPurchases : 0,
      totalOrders: editingCustomer ? editingCustomer.totalOrders : 0,
      dueAmount: editingCustomer ? editingCustomer.dueAmount : 0,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    await store.saveCustomer(custToSave);
    setIsModalOpen(false);
    await loadData();
  };

  // Open Settle Due
  const handleOpenSettle = (c: Customer) => {
    setSettleCust(c);
    setSettleAmount(c.dueAmount);
  };

  // Submit Due Settlement
  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleCust || settleAmount <= 0) return;

    const remainingDue = Math.max(0, settleCust.dueAmount - settleAmount);
    await store.saveCustomer({
      ...settleCust,
      dueAmount: remainingDue
    });

    setSettleCust(null);
    await loadData();
  };

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-400" />
            <span>Customer Directory & Credit Ledgers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage customer records, loyalty metrics, and due payment settlement
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Registered Customers</span>
          <h3 className="text-2xl font-black text-white font-mono mt-1">{stats.totalCust}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all branch operations</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Lifetime Customer Spend</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(stats.totalPurchases, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Total orders revenue</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Outstanding Due Balances</span>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">
            {formatCurrency(stats.totalDue, currencySymbol)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Credit sales awaiting payment</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name, phone number, email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setDueFilterOnly(!dueFilterOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              dueFilterOnly
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {dueFilterOnly ? '⚠️ Showing Due Customers Only' : 'Filter Outstanding Due'}
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40">
                <th className="py-3.5 pl-5">Customer Profile</th>
                <th className="py-3.5">Contact Details</th>
                <th className="py-3.5 text-center">Total Orders</th>
                <th className="py-3.5 text-right">Lifetime Spend</th>
                <th className="py-3.5 text-right">Due Balance</th>
                <th className="py-3.5 text-center">Tier</th>
                <th className="py-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading customer database...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => {
                  const hasDue = cust.dueAmount > 0;
                  const isVIP = (cust.totalPurchases || 0) > 5000;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 pl-5">
                        <div className="font-bold text-slate-100">{cust.name}</div>
                        {cust.address && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{cust.address}</div>
                        )}
                      </td>

                      <td className="py-3.5 font-mono text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                        {cust.email && (
                          <div className="text-[10px] text-slate-500 font-sans">{cust.email}</div>
                        )}
                      </td>

                      <td className="py-3.5 text-center font-mono font-bold text-slate-200">
                        {cust.totalOrders || 0}
                      </td>

                      <td className="py-3.5 text-right font-mono font-bold text-white">
                        {formatCurrency(cust.totalPurchases || 0, currencySymbol)}
                      </td>

                      <td className="py-3.5 text-right font-mono font-bold">
                        {hasDue ? (
                          <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                            {formatCurrency(cust.dueAmount, currencySymbol)}
                          </span>
                        ) : (
                          <span className="text-emerald-400">0.00</span>
                        )}
                      </td>

                      <td className="py-3.5 text-center">
                        <Badge variant={isVIP ? 'warning' : 'primary'}>
                          {isVIP ? 'VIP Foodie' : 'Regular'}
                        </Badge>
                      </td>

                      <td className="py-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <button
                              onClick={() => handleOpenSettle(cust)}
                              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold text-[11px] rounded-lg shadow-sm hover:bg-amber-400 transition-colors"
                            >
                              Settle Due
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryCust(cust)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="View Purchase History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCustomer(cust);
                              setFormData({
                                name: cust.name,
                                phone: cust.phone,
                                email: cust.email || '',
                                address: cust.address || ''
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit3 className="w-4 h-4" />
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
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Info' : 'Register Customer'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Customer Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tanvir Ahmed"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +880 1711-234567"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tanvir@example.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Delivery / Billing Address (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Road 11, Banani, Dhaka"
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
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Settle Due Balance Modal */}
      {settleCust && (
        <Modal
          isOpen={true}
          onClose={() => setSettleCust(null)}
          title="Settle Customer Due Balance"
          subtitle={settleCust.name}
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmSettle} className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
              <span className="text-xs text-slate-400">Total Outstanding Due:</span>
              <span className="text-sm font-black text-rose-400 font-mono">
                {formatCurrency(settleCust.dueAmount, currencySymbol)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Payment Amount Received ({currencySymbol})
              </label>
              <input
                type="number"
                min="1"
                max={settleCust.dueAmount}
                required
                value={settleAmount}
                onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSettleCust(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
              >
                Record Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Purchase History Modal */}
      {historyCust && (
        <Modal
          isOpen={true}
          onClose={() => setHistoryCust(null)}
          title="Customer Purchase History"
          subtitle={`${historyCust.name} (${historyCust.phone})`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            {sales.filter(s => s.customerId === historyCust.id || s.customerPhone === historyCust.phone).length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500">
                No orders recorded under this customer yet.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                {sales
                  .filter(s => s.customerId === historyCust.id || s.customerPhone === historyCust.phone)
                  .map(s => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-amber-400 font-mono">{s.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-400">{formatDateTime(s.createdAt)} • {s.branchName}</p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {s.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                        </p>
                      </div>

                      <div className="text-right font-mono">
                        <p className="font-bold text-white">{formatCurrency(s.grandTotal, currencySymbol)}</p>
                        <span className="text-[10px] text-slate-400 uppercase">{s.paymentMethod}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
