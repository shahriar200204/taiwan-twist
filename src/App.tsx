import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginScreen } from './components/auth/LoginScreen';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';
import { POSScreen } from './components/pos/POSScreen';
import { SalesHistory } from './components/sales/SalesHistory';
import { ProductList } from './components/products/ProductList';
import { CategoryManager } from './components/products/CategoryManager';
import { InventoryManager } from './components/inventory/InventoryManager';
import { StockTransferManager } from './components/inventory/StockTransferManager';
import { CustomerManager } from './components/customers/CustomerManager';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { GoogleSheetsSyncManager } from './components/settings/GoogleSheetsSyncManager';
import { StaffManager } from './components/staff/StaffManager';
import { BranchManager } from './components/branches/BranchManager';
import { AuditTrailViewer } from './components/dashboard/AuditTrailViewer';
import { SettingsManager } from './components/settings/SettingsManager';
import { backupService } from './services/backupService';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Initialize automatic daily backup snapshot scheduler
  useEffect(() => {
    if (user) {
      backupService.initDailyBackupScheduler();
    }
    return () => {
      backupService.stopScheduler();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-slate-200">Initializing Taiwan X Foodex POS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Top Application Header */}
      <Header
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenPOS={() => setActiveTab('pos')}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar">
          {activeTab === 'dashboard' && (
            <SuperAdminDashboard onSelectTab={setActiveTab} />
          )}
          {activeTab === 'pos' && (
            <POSScreen />
          )}
          {activeTab === 'sales' && (
            <SalesHistory />
          )}
          {activeTab === 'products' && (
            <ProductList />
          )}
          {activeTab === 'categories' && (
            <CategoryManager />
          )}
          {activeTab === 'inventory' && (
            <InventoryManager />
          )}
          {activeTab === 'transfers' && (
            <StockTransferManager />
          )}
          {activeTab === 'customers' && (
            <CustomerManager />
          )}
          {activeTab === 'expenses' && (
            <ExpenseManager />
          )}
          {activeTab === 'reports' && (
            <ReportsAnalytics />
          )}
          {activeTab === 'sheets' && (
            <GoogleSheetsSyncManager />
          )}
          {activeTab === 'staff' && (
            <StaffManager />
          )}
          {activeTab === 'branches' && (
            <BranchManager />
          )}
          {activeTab === 'audit' && (
            <AuditTrailViewer />
          )}
          {activeTab === 'settings' && (
            <SettingsManager />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
