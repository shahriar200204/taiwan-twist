import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  ShieldCheck, 
  Building2, 
  Key, 
  Edit3, 
  Trash2, 
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { UserRole, AppUser } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const StaffManager: React.FC = () => {
  const { user: currentUser, role, branches } = useAuth();

  const [staffList, setStaffList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<AppUser | null>(null);
  const [showPass, setShowPass] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    password: '',
    role: 'cashier' as UserRole,
    branchId: branches[0]?.id || 'branch-main',
    pinCode: '1234',
    isActive: true
  });

  const loadStaff = async () => {
    setLoading(true);
    const users = await store.getUsers();
    setStaffList(users);
    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleOpenModal = (staff?: AppUser) => {
    setShowPass(false);
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        displayName: staff.displayName,
        email: staff.email,
        phone: staff.phone || '',
        password: staff.password || (staff.role === 'super_admin' ? 'Shahriar1122@' : 'password123'),
        role: staff.role,
        branchId: staff.branchId || branches[0]?.id || 'branch-main',
        pinCode: staff.pinCode || '1234',
        isActive: staff.isActive !== false
      });
    } else {
      setEditingStaff(null);
      setFormData({
        displayName: '',
        email: '',
        phone: '',
        password: 'password123',
        role: 'cashier',
        branchId: branches[0]?.id || 'branch-main',
        pinCode: '1234',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.email.trim()) {
      alert('Full Name and Email are required.');
      return;
    }

    const branch = branches.find(b => b.id === formData.branchId);

    if (editingStaff) {
      const updatedUser: AppUser = {
        ...editingStaff,
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password.trim(),
        role: formData.role,
        branchId: formData.role === 'super_admin' ? undefined : formData.branchId,
        branchName: formData.role === 'super_admin' ? undefined : branch?.name,
        pinCode: formData.pinCode.trim(),
        isActive: formData.isActive,
        status: formData.isActive ? 'active' : 'inactive'
      };
      await store.saveUser(updatedUser);
    } else {
      const newMember: AppUser = {
        id: `user-${Date.now()}`,
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password.trim(),
        role: formData.role,
        branchId: formData.role === 'super_admin' ? undefined : formData.branchId,
        branchName: formData.role === 'super_admin' ? undefined : branch?.name,
        pinCode: formData.pinCode.trim() || '1234',
        isActive: formData.isActive,
        status: formData.isActive ? 'active' : 'inactive',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: new Date().toISOString()
      };
      await store.saveUser(newMember);
    }

    setIsModalOpen(false);
    await loadStaff();
  };

  const handleDeleteStaff = async (id: string) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (confirm('Are you sure you want to deactivate and remove this staff account?')) {
      const target = staffList.find(s => s.id === id);
      if (target) {
        await store.saveUser({ ...target, isActive: false, status: 'inactive' });
        await loadStaff();
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-amber-400" />
            <span>Staff & Role Access Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tier user accounts, branch permissions, passwords, PINs, and security policies
          </p>
        </div>

        {role === 'super_admin' && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Role Matrix Explanation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Super Admin</span>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Full global access: All branches, global catalog, inventory transfers, master reports & business settings.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Branch Admin</span>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Branch-scoped manager: POS, branch inventory adjustments, branch sales reports, and local expenses.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Key className="w-4 h-4" />
            <span>Cashier / Staff</span>
          </div>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Frontline speed: Fast POS register checkout, receipt reprinting, customer registration & shift totals.
          </p>
        </div>
      </div>

      {/* Staff Members Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40">
                <th className="py-3.5 pl-5">Staff Member</th>
                <th className="py-3.5">Assigned Role</th>
                <th className="py-3.5">Branch Location</th>
                <th className="py-3.5 font-mono">Password / PIN</th>
                <th className="py-3.5 text-center">Status</th>
                <th className="py-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {staffList.map(member => {
                const isCurrent = currentUser?.id === member.id;

                return (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt={member.displayName}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{member.displayName}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-extrabold">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        member.role === 'super_admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        member.role === 'branch_admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 text-slate-300 font-medium">
                      {member.role === 'super_admin' ? (
                        <span className="text-amber-400 font-bold">🌐 All Outlets (Global)</span>
                      ) : (
                        <span>{member.branchName || 'Assigned Branch'}</span>
                      )}
                    </td>

                    <td className="py-3.5 font-mono text-slate-400">
                      <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px] text-slate-300">
                        {member.password ? '••••••••' : `PIN: ${member.pinCode || '1234'}`}
                      </span>
                    </td>

                    <td className="py-3.5 text-center">
                      <Badge variant={member.isActive !== false ? 'success' : 'neutral'} dot>
                        {member.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="py-3.5 text-right pr-5">
                      <div className="flex items-center justify-end gap-2">
                        {role === 'super_admin' && (
                          <>
                            <button
                              onClick={() => handleOpenModal(member)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                              title="Edit Password & Access"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Edit Access</span>
                            </button>

                            {!isCurrent && (
                              <button
                                onClick={() => handleDeleteStaff(member.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                                title="Deactivate Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? `Edit Credentials: ${editingStaff.displayName}` : 'Add New Team Member'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g. Arif Hossain"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Email Address / Login *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. arif@taiwanxfoodex.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+880 1711-XXXXXX"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Login Password *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Secret password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                POS Quick PIN (4 Digits)
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.pinCode}
                onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Access Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="cashier">Cashier / Staff</option>
                <option value="branch_admin">Branch Admin</option>
                <option value="super_admin">Super Admin (Global)</option>
              </select>
            </div>

            {formData.role !== 'super_admin' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Assigned Branch
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
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-500"
              />
              <span className="text-xs font-semibold text-slate-300">Account is Active and Authorized</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
            >
              Save Credentials
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
