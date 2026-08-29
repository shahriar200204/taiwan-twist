import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  Percent, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  Users, 
  CheckCircle 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Branch } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';

export const BranchManager: React.FC = () => {
  const { branches, reloadBranches, settings, role } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 5,
    receiptFooter: 'Thank you for dining with TAIWAN X FOODEX!\nAuthentic Taiwanese Street Cuisine & Boba Tea',
    managerName: '',
    isActive: true
  });

  const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone,
        email: branch.email || '',
        taxRate: branch.taxRate,
        receiptFooter: branch.receiptFooter || '',
        managerName: branch.managerName || '',
        isActive: branch.isActive
      });
    } else {
      setEditingBranch(null);
      const rand = Math.floor(10 + Math.random() * 90);
      setFormData({
        name: '',
        code: `TXF-${rand}`,
        address: '',
        phone: '+880 1700-000000',
        email: '',
        taxRate: settings.defaultTaxRate || 5,
        receiptFooter: 'Thank you for dining with TAIWAN X FOODEX!\nAuthentic Taiwanese Street Cuisine & Boba Tea',
        managerName: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Branch name and code are required');
      return;
    }

    const branchToSave: Branch = {
      id: editingBranch ? editingBranch.id : `branch-${Date.now()}`,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      taxRate: Number(formData.taxRate) || 5,
      receiptFooter: formData.receiptFooter.trim() || undefined,
      managerName: formData.managerName.trim() || undefined,
      isActive: formData.isActive,
      createdAt: editingBranch ? editingBranch.createdAt : new Date().toISOString()
    };

    await store.saveBranch(branchToSave);
    await reloadBranches();
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteBranchId) return;
    await store.deleteBranch(deleteBranchId);
    setDeleteBranchId(null);
    await reloadBranches();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-amber-400" />
            <span>Branch Network & Locations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure multi-branch outlets, tax rates, receipt formatting, and branch manager assignments
          </p>
        </div>

        {role === 'super_admin' && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Branch</span>
          </button>
        )}
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map(branch => (
          <div
            key={branch.id}
            className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-xl"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-mono font-bold text-xs border border-amber-500/20">
                  {branch.code}
                </span>
                <Badge variant={branch.isActive ? 'success' : 'neutral'} dot>
                  {branch.isActive ? 'Operational' : 'Closed'}
                </Badge>
              </div>

              <div>
                <h3 className="text-lg font-black text-white">{branch.name}</h3>
                {branch.managerName && (
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Manager: <strong className="text-slate-200">{branch.managerName}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <Percent className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>VAT Rate: {branch.taxRate}%</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {role === 'super_admin' && (
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={() => handleOpenModal(branch)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Branch</span>
                </button>
                {branches.length > 1 && (
                  <button
                    onClick={() => setDeleteBranchId(branch.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                    title="Delete Branch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? 'Edit Branch Profile' : 'Add New Branch'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Taiwan X Foodex — Gulshan Outlet"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Branch Code (Prefix) *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. TXF-04"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Physical Street Address *
            </label>
            <textarea
              rows={2}
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. House 45, Road 11, Block D, Banani, Dhaka"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Branch Hotline / Phone *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Branch Manager Name
              </label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                placeholder="e.g. Shahriar Kabir"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                VAT / Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
              />
              <label htmlFor="isActive" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Branch is Active & Accepting Orders
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Custom Receipt Footer Note
            </label>
            <textarea
              rows={2}
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
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
              Save Branch
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteBranchId !== null}
        onClose={() => setDeleteBranchId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Branch"
        message="Are you sure you want to remove this branch? Associated data will remain archived."
        confirmText="Delete Branch"
        type="danger"
      />
    </div>
  );
};
