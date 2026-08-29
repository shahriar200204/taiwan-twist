import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Receipt, 
  Package, 
  Layers, 
  Warehouse, 
  ArrowLeftRight, 
  Users, 
  TrendingDown, 
  BarChart3, 
  UserCheck, 
  Building2, 
  Settings, 
  History,
  Store,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../common/Badge';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab: (tab: string) => void;
  collapsed?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  collapsed,
  isCollapsed
}) => {
  const { user, role, activeBranch } = useAuth();
  const selectedTab = currentTab || activeTab || 'dashboard';
  const isSidebarCollapsed = isCollapsed ?? collapsed ?? false;

  // Navigation Items with role permissions
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'branch_admin'],
      badge: undefined
    },
    {
      id: 'pos',
      label: 'Point of Sale',
      icon: ShoppingCart,
      roles: ['super_admin', 'branch_admin', 'cashier'],
      badge: 'Fast POS'
    },
    {
      id: 'sales',
      label: 'Sales & Orders',
      icon: Receipt,
      roles: ['super_admin', 'branch_admin', 'cashier']
    },
    {
      id: 'products',
      label: 'Products Catalog',
      icon: Package,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: Layers,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'inventory',
      label: 'Inventory Control',
      icon: Warehouse,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'transfers',
      label: 'Stock Transfers',
      icon: ArrowLeftRight,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'customers',
      label: 'Customers CRM',
      icon: Users,
      roles: ['super_admin', 'branch_admin', 'cashier']
    },
    {
      id: 'expenses',
      label: 'Expenses Tracker',
      icon: TrendingDown,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'sheets',
      label: 'Google Sheets Sync',
      icon: FileSpreadsheet,
      roles: ['super_admin', 'branch_admin'],
      badge: 'Live'
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: UserCheck,
      roles: ['super_admin', 'branch_admin']
    },
    {
      id: 'branches',
      label: 'Branches Network',
      icon: Building2,
      roles: ['super_admin']
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      icon: History,
      roles: ['super_admin']
    },
    {
      id: 'settings',
      label: 'Business Settings',
      icon: Settings,
      roles: ['super_admin']
    }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 select-none z-30 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
          <Store className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        {!isSidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
              TAIWAN <span className="text-amber-400">X</span> FOODEX
            </span>
            <span className="text-[11px] font-medium text-slate-400 truncate">
              Smart Multi-Branch POS
            </span>
          </div>
        )}
      </div>

      {/* Active Branch Info Badge (if branch locked) */}
      {!isSidebarCollapsed && (
        <div className="px-4 py-3 bg-slate-950/20 border-b border-slate-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Role Scope
            </span>
            <Badge 
              variant={role === 'super_admin' ? 'warning' : role === 'branch_admin' ? 'primary' : 'info'}
              size="sm"
            >
              {role === 'super_admin' ? 'SUPER ADMIN' : role === 'branch_admin' ? 'BRANCH ADMIN' : 'CASHIER'}
            </Badge>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1 truncate flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {role === 'super_admin' ? 'All System Access' : activeBranch?.name || 'Assigned Branch'}
          </p>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map(item => {
          const Icon = item.icon;
          const isActive = selectedTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group relative ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                }`}
              />

              {!isSidebarCollapsed && (
                <>
                  <span className="truncate text-left flex-1">{item.label}</span>
                  {item.badge && !isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-slate-950 shrink-0" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Mini Bar */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700/40 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
            alt="User"
            className="w-8 h-8 rounded-full object-cover border border-amber-500/40 shrink-0"
          />
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-100 truncate">
                {user?.displayName}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
