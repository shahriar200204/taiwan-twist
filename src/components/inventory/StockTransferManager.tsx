import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  Package, 
  Search, 
  ArrowRight, 
  Calendar, 
  FileText,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { StockTransfer, Branch, Product, BranchInventoryItem } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const StockTransferManager: React.FC = () => {
  const { user, role, activeBranchId, branches } = useAuth();

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<BranchInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // New Transfer Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [sourceBranchId, setSourceBranchId] = useState<string>(branches[0]?.id || 'branch-main');
  const [destinationBranchId, setDestinationBranchId] = useState<string>(branches[1]?.id || 'branch-uttara');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    const [tList, pList, invList] = await Promise.all([
      store.getStockTransfers(),
      store.getProducts(),
      store.getInventory()
    ]);
    setTransfers(tList);
    setProducts(pList);
    setInventory(invList);
    if (!selectedProductId && pList.length > 0) {
      setSelectedProductId(pList[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute available stock at source branch
  const sourceStockItem = inventory.find(
    i => i.branchId === sourceBranchId && i.productId === selectedProductId
  );
  const availableSourceStock = sourceStockItem ? sourceStockItem.currentStock : 0;

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceBranchId === destinationBranchId) {
      alert('Source and destination branches cannot be the same!');
      return;
    }
    if (transferQuantity <= 0) {
      alert('Transfer quantity must be greater than 0');
      return;
    }
    if (transferQuantity > availableSourceStock) {
      alert(`Cannot transfer ${transferQuantity} units. Only ${availableSourceStock} units available at the source branch.`);
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    const srcBranch = branches.find(b => b.id === sourceBranchId);
    const destBranch = branches.find(b => b.id === destinationBranchId);

    if (!prod || !srcBranch || !destBranch) return;

    setSubmitting(true);
    const newTransfer: StockTransfer = {
      id: `trf_${Date.now()}`,
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      productId: prod.id,
      productName: prod.name,
      productSku: prod.sku,
      quantity: transferQuantity,
      sourceBranchId: srcBranch.id,
      sourceBranchName: srcBranch.name,
      destinationBranchId: destBranch.id,
      destinationBranchName: destBranch.name,
      status: role === 'super_admin' ? 'completed' : 'pending',
      createdBy: user?.id || 'admin',
      createdByName: user?.displayName || 'Admin',
      notes: notes.trim() || undefined,
      transferDate: new Date().toISOString(),
      completedAt: role === 'super_admin' ? new Date().toISOString() : undefined
    };

    await store.createStockTransfer(newTransfer);
    await loadData();
    setSubmitting(false);
    setIsModalOpen(false);
    setNotes('');
  };

  const handleCompleteTransfer = async (transfer: StockTransfer) => {
    if (!window.confirm(`Confirm receipt of ${transfer.quantity}x ${transfer.productName} at ${transfer.destinationBranchName}? Stock will be added to ${transfer.destinationBranchName} and deducted from ${transfer.sourceBranchName}.`)) {
      return;
    }

    await store.completeStockTransfer(transfer.id, user?.displayName || 'Branch Admin');
    await loadData();
  };

  const filteredTransfers = transfers.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      t.transferNumber.toLowerCase().includes(q) ||
      t.productName.toLowerCase().includes(q) ||
      t.sourceBranchName.toLowerCase().includes(q) ||
      t.destinationBranchName.toLowerCase().includes(q);

    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Inter-Branch Stock Transfers
            </h1>
            <p className="text-xs text-slate-400">
              Dispatch inventory between outlets with real-time stock deductions and audit trails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            New Stock Transfer
          </button>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Transfers Logged</p>
            <p className="text-2xl font-extrabold text-white mt-1">{transfers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-medium">In Transit / Pending</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">
              {transfers.filter(t => t.status === 'pending').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium">Successfully Received</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              {transfers.filter(t => t.status === 'completed').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transfer #, product, branch..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'pending', 'completed', 'cancelled'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Transfer #</th>
                <th className="px-5 py-3.5">Date & Time</th>
                <th className="px-5 py-3.5">Product & SKU</th>
                <th className="px-5 py-3.5 text-center">Qty</th>
                <th className="px-5 py-3.5">From Branch (Source)</th>
                <th className="px-5 py-3.5">To Branch (Dest.)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
                    <p className="font-semibold text-slate-400">No stock transfers found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click "+ New Stock Transfer" to dispatch inventory between branches.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(trf => (
                  <tr key={trf.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-mono font-bold text-amber-400">
                      {trf.transferNumber}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {formatDateTime(trf.transferDate)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{trf.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{trf.productSku}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-800 text-amber-300 font-bold rounded-lg border border-slate-700">
                        {trf.quantity} pcs
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{trf.sourceBranchName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span className="font-medium text-slate-200">{trf.destinationBranchName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          trf.status === 'completed' 
                            ? 'success' 
                            : trf.status === 'pending' 
                            ? 'warning' 
                            : 'danger'
                        }
                        size="sm"
                      >
                        {trf.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {trf.status === 'pending' && (
                        <button
                          onClick={() => handleCompleteTransfer(trf)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1.5 shadow transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Receive & Add Stock
                        </button>
                      )}
                      {trf.status === 'completed' && (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stock Transfer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Dispatch Inter-Branch Stock Transfer"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Source Branch (Dispatch From)
              </label>
              <select
                value={sourceBranchId}
                onChange={e => setSourceBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Destination Branch (Receive At)
              </label>
              <select
                value={destinationBranchId}
                onChange={e => setDestinationBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} disabled={b.id === sourceBranchId}>
                    {b.name} ({b.code}) {b.id === sourceBranchId ? '(Source)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Product to Transfer
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.sku}] — {p.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Current Source Stock Indicator */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Available Stock at Source Branch:</span>
            <span className={`font-bold font-mono ${availableSourceStock > 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {availableSourceStock} Units
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Transfer Quantity (Units)
            </label>
            <input
              type="number"
              min={1}
              max={availableSourceStock}
              value={transferQuantity}
              onChange={e => setTransferQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Transfer Notes / Driver info (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Dispatched with Driver Rahim, Van #DHAKA-METRO-1122"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableSourceStock < transferQuantity}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
