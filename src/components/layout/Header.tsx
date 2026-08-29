import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Bell, 
  LogOut, 
  Menu, 
  ShoppingCart, 
  Clock, 
  User, 
  ChevronDown, 
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { BranchInventoryItem } from '../../types';
import { GoogleSheetsSyncModal } from '../settings/GoogleSheetsSyncModal';
import { googleSheetsSync } from '../../services/googleSheetsSync';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenPOS: () => void;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenPOS,
  onSelectTab
}) => {
  const { 
    user, 
    role, 
    activeBranchId, 
    branches, 
    setActiveBranchId, 
    logout 
  } = useAuth();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [lowStockItems, setLowStockItems] = useState<BranchInventoryItem[]>([]);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [sheetsConfig, setSheetsConfig] = useState(googleSheetsSync.getConfig());

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch low stock items
  useEffect(() => {
    const checkStock = async () => {
      const inventory = await store.getInventory(role === 'super_admin' ? (activeBranchId === 'all' ? undefined : activeBranchId) : user?.branchId);
      const low = inventory.filter(i => i.currentStock <= i.minStockAlert);
      setLowStockCount(low.length);
      setLowStockItems(low);
    };
    checkStock();
    const interval = setInterval(checkStock, 15000);
    return () => clearInterval(interval);
  }, [activeBranchId, role, user]);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between select-none z-20">
      {/* Left section: Sidebar toggle & Branch selector */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Branch Selector for Super Admin or Branch Badge */}
        {role === 'super_admin' ? (
          <div className="flex items-center gap-2.5 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-xs">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <label htmlFor="branch-select" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Branch Scope:
            </label>
            <select
              id="branch-select"
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-100 border-0 focus:ring-0 focus:outline-none cursor-pointer pr-4"
            >
              <option value="all" className="bg-slate-900 text-slate-100 font-bold">
                🌐 All Branches (Consolidated System)
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-slate-100 font-medium">
                  📍 {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              {branches.find(b => b.id === activeBranchId)?.name || 'Assigned Branch'}
            </span>
          </div>
        )}
      </div>

      {/* Right section: Fast POS, Live Clock, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-300 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{currentTime}</span>
        </div>

        {/* Quick Launch POS Button */}
        <button
          onClick={onOpenPOS}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all transform active:scale-95 cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          <span>Launch POS</span>
        </button>

        {/* Google Sheets Live Sync Quick Button */}
        <button
          onClick={() => setIsSheetsModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            sheetsConfig.enabled
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 shadow-xs'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
          }`}
          title="Google Sheets Real-Time Sync"
        >
          <FileSpreadsheet className={`w-4 h-4 ${sheetsConfig.enabled ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="hidden md:inline">Google Sheets</span>
          {sheetsConfig.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          )}
        </button>

        {/* Low Stock Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Stock Notifications"
          >
            <Bell className="w-5 h-5" />
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Low Stock Warnings ({lowStockCount})
                </span>
                <button
                  onClick={() => {
                    onSelectTab('inventory');
                    setShowNotifMenu(false);
                  }}
                  className="text-[11px] text-amber-400 hover:underline font-semibold"
                >
                  View Inventory
                </button>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  ✅ All product inventory levels are healthy!
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {lowStockItems.slice(0, 5).map(item => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-200 truncate">{item.productName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{item.branchName}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-bold shrink-0">
                        {item.currentStock} left (Min {item.minStockAlert})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Authenticated User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors cursor-pointer"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt="Avatar"
              className="w-6 h-6 rounded-full object-cover border border-amber-500"
            />
            <span className="text-xs font-bold text-slate-200 max-w-[110px] truncate hidden md:inline">
              {user?.displayName?.split(' ')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs font-bold text-slate-100 truncate">{user?.displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">
                    {role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                {role === 'super_admin' && (
                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    System Settings
                  </button>
                )}
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => {
          setIsSheetsModalOpen(false);
          setSheetsConfig(googleSheetsSync.getConfig());
        }}
      />
    </header>
  );
};
