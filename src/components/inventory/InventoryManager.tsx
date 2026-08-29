import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  ArrowUpDown, 
  Plus, 
  Minus, 
  AlertTriangle, 
  ArrowRightLeft, 
  RotateCcw, 
  Download, 
  CheckCircle, 
  FileSpreadsheet,
  Building2,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { BranchInventoryItem, Product, Branch } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const InventoryManager: React.FC = () => {
  const { role, settings, activeBranchId, branches } = useAuth();

  const [inventory, setInventory] = useState<BranchInventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranchId, setFilterBranchId] = useState<string>(activeBranchId);
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<BranchInventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('Supplier Delivery Restock');

  // Branch Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferFromBranchId, setTransferFromBranchId] = useState<string>(branches[0]?.id || 'branch-main');
  const [transferToBranchId, setTransferToBranchId] = useState<string>(branches[1]?.id || 'branch-uttara');
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number>(10);

  const loadData = async () => {
    setLoading(true);
    const branchScope = filterBranchId === 'all' ? undefined : filterBranchId;
    const [invList, prodList] = await Promise.all([
      store.getInventory(branchScope),
      store.getProducts()
    ]);
    setInventory(invList);
    setProducts(prodList);
    if (!transferProductId && prodList.length > 0) {
      setTransferProductId(prodList[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    setFilterBranchId(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    loadData();
  }, [filterBranchId]);

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.branchName.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter === 'low') matchesStatus = item.currentStock <= item.minStockAlert && item.currentStock > 0;
      if (statusFilter === 'out') matchesStatus = item.currentStock <= 0;

      return matchesSearch && matchesStatus;
    });
  }, [inventory, searchQuery, statusFilter]);

  // Inventory Totals Summary
  const totals = useMemo(() => {
    let totalItems = 0;
    let totalStockUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    filteredInventory.forEach(item => {
      totalItems += 1;
      totalStockUnits += item.currentStock;
      const prod = products.find(p => p.id === item.productId);
      const cost = prod ? prod.costPrice : 0;
      totalStockValue += item.currentStock * cost;

      if (item.currentStock <= 0) outOfStockCount++;
      else if (item.currentStock <= item.minStockAlert) lowStockCount++;
    });

    return { totalItems, totalStockUnits, totalStockValue, lowStockCount, outOfStockCount };
  }, [filteredInventory, products]);

  // Open Adjust Modal
  const handleOpenAdjust = (item: BranchInventoryItem) => {
    setSelectedItem(item);
    setAdjustType('add');
    setAdjustQty(20);
    setAdjustReason('Supplier Restock Batch');
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    let newStock = selectedItem.currentStock;
    if (adjustType === 'add') newStock += adjustQty;
    if (adjustType === 'subtract') newStock = Math.max(0, newStock - adjustQty);
    if (adjustType === 'set') newStock = Math.max(0, adjustQty);

    await store.updateInventoryStock(selectedItem.id, newStock);
    setIsAdjustModalOpen(false);
    await loadData();
  };

  // Submit Inter-Branch Transfer
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromBranchId === transferToBranchId) {
      alert('Source and destination branches must be different');
      return;
    }

    if (transferQty <= 0) {
      alert('Transfer quantity must be greater than 0');
      return;
    }

    // Check available stock in source branch
    const sourceInv = inventory.find(
      i => i.branchId === transferFromBranchId && i.productId === transferProductId
    );

    if (!sourceInv || sourceInv.currentStock < transferQty) {
      alert(`Insufficient stock in source branch! Available: ${sourceInv?.currentStock || 0}`);
      return;
    }

    // Deduct from source
    await store.updateInventoryStock(sourceInv.id, sourceInv.currentStock - transferQty);

    // Add to destination
    const destInv = inventory.find(
      i => i.branchId === transferToBranchId && i.productId === transferProductId
    );

    if (destInv) {
      await store.updateInventoryStock(destInv.id, destInv.currentStock + transferQty);
    } else {
      const prod = products.find(p => p.id === transferProductId);
      const destBranch = branches.find(b => b.id === transferToBranchId);
      if (prod && destBranch) {
        await store.updateInventoryStock(`inv-${destBranch.id}-${prod.id}`, transferQty);
      }
    }

    alert(`Successfully transferred ${transferQty} units between branches!`);
    setIsTransferModalOpen(false);
    await loadData();
  };

  // Export Inventory CSV
  const handleExportCSV = () => {
    const headers = ['Branch', 'Product Name', 'SKU', 'Current Stock', 'Min Alert', 'Unit', 'Cost Value (BDT)'];
    const rows = filteredInventory.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const cost = prod ? prod.costPrice * item.currentStock : 0;
      return [
        `"${item.branchName}"`,
        `"${item.productName}"`,
        `"${item.sku}"`,
        item.currentStock,
        item.minStockAlert,
        `"${item.unit}"`,
        cost
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TXF_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Boxes className="w-7 h-7 text-amber-400" />
            <span>Branch Inventory & Stock Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-branch stock levels, automated low-stock warnings, and inter-branch transfers
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {role === 'super_admin' && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Inter-Branch Transfer</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Stock Units</span>
          <h3 className="text-xl font-black text-white font-mono mt-1">{totals.totalStockUnits}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Across {totals.totalItems} inventory records</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Stock Valuation</span>
          <h3 className="text-xl font-black text-amber-400 font-mono mt-1">{formatCurrency(totals.totalStockValue, currencySymbol)}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Based on purchase cost price</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Low Stock Alerts</span>
          <h3 className="text-xl font-black text-amber-400 font-mono mt-1">{totals.lowStockCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">At or below reorder threshold</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Out of Stock Items</span>
          <h3 className="text-xl font-black text-rose-400 font-mono mt-1">{totals.outOfStockCount}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Urgent restock needed</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, branch..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Branch Filter (for Super Admin) */}
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

          {/* Stock Alert Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Inventory</option>
            <option value="low">⚠️ Low Stock Alerts</option>
            <option value="out">❌ Out of Stock (0 Units)</option>
          </select>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40">
                <th className="py-3.5 pl-5">Product Name</th>
                <th className="py-3.5">Branch Location</th>
                <th className="py-3.5">SKU Code</th>
                <th className="py-3.5 text-center">Current Stock</th>
                <th className="py-3.5 text-center">Min Threshold</th>
                <th className="py-3.5 text-right">Unit Cost</th>
                <th className="py-3.5 text-right">Total Value</th>
                <th className="py-3.5 text-center">Stock Status</th>
                <th className="py-3.5 text-right pr-5">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Loading inventory records...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No inventory records match current filter.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const prod = products.find(p => p.id === item.productId);
                  const isOut = item.currentStock <= 0;
                  const isLow = item.currentStock <= item.minStockAlert && !isOut;
                  const cost = prod ? prod.costPrice : 0;
                  const value = item.currentStock * cost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pl-5 font-bold text-slate-100">
                        {item.productName}
                      </td>
                      <td className="py-3 text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{item.branchName}</span>
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400 text-[11px]">
                        {item.sku}
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-base text-white">
                        {item.currentStock} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 text-center font-mono text-slate-400">
                        {item.minStockAlert}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-400">
                        {formatCurrency(cost, currencySymbol)}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-amber-400">
                        {formatCurrency(value, currencySymbol)}
                      </td>
                      <td className="py-3 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px]">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-5">
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedItem && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Adjust Inventory Stock"
          subtitle={`${selectedItem.productName} • ${selectedItem.branchName}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Stock in Branch:</span>
              <span className="text-sm font-bold text-white font-mono">{selectedItem.currentStock} {selectedItem.unit}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase">Adjustment Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    adjustType === 'add' ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('subtract')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    adjustType === 'subtract' ? 'bg-rose-500 text-white border-rose-400 font-black' : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  - Deduct (Wastage)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    adjustType === 'set' ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  Set Count
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                {adjustType === 'add' ? 'Quantity to Add' : adjustType === 'subtract' ? 'Quantity to Deduct' : 'Exact Count Value'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Reason / Note for Audit
              </label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Supplier Shipment, Damaged Batch, Physical Count Correction"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
              >
                Update Stock
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Inter-Branch Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Inter-Branch Inventory Transfer"
        subtitle="Move product stock seamlessly between Taiwan X Foodex branches"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Source Branch (From)
              </label>
              <select
                value={transferFromBranchId}
                onChange={(e) => setTransferFromBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Destination Branch (To)
              </label>
              <select
                value={transferToBranchId}
                onChange={(e) => setTransferToBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Select Product to Transfer
            </label>
            <select
              value={transferProductId}
              onChange={(e) => setTransferProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Transfer Quantity (Units)
            </label>
            <input
              type="number"
              min="1"
              required
              value={transferQty}
              onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              Execute Stock Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
