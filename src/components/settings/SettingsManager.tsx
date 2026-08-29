import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  Receipt, 
  RotateCcw, 
  Save, 
  Database, 
  CheckCircle, 
  Server, 
  Layers, 
  Sparkles,
  ShieldAlert,
  Archive,
  CloudDownload,
  Calendar,
  Clock,
  FileSpreadsheet,
  Printer,
  Sliders,
  UtensilsCrossed,
  FileText,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { backupService } from '../../services/backupService';
import { BusinessSettings, BackupSnapshot } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PrintConfigModal } from './PrintConfigModal';

export const SettingsManager: React.FC = () => {
  const { settings, updateSettings, role, user } = useAuth();

  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Backup snapshots state
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<string>('');
  const [selectedRestoreBackup, setSelectedRestoreBackup] = useState<BackupSnapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await backupService.getBackups();
      setBackups(data);
    } catch (err) {
      console.warn('Load backups note:', err);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setBackupMessage('');
    try {
      const snapshot = await backupService.createDailyBackupSnapshot(
        user?.displayName || 'Super Admin',
        'manual_snapshot',
        'Manual document export triggered from Business Settings terminal'
      );
      setBackupMessage(`Snapshot exported successfully! Preserved ${snapshot.salesCount} sales and ${snapshot.inventoryCount} inventory records.`);
      await loadBackups();
      setTimeout(() => setBackupMessage(''), 5000);
    } catch (err: any) {
      setBackupMessage(`Backup failed: ${err.message || 'Error occurred'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedRestoreBackup) return;
    setIsRestoring(true);
    try {
      const res = await backupService.restoreFromBackup(
        selectedRestoreBackup.id,
        user?.displayName || 'Super Admin'
      );
      setBackupMessage(res.message);
      setSelectedRestoreBackup(null);
      await loadBackups();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupMessage(`Restore failed: ${err.message || 'Error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    await store.resetDemoData();
    setIsResetConfirmOpen(false);
    setIsResetting(false);
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-amber-400" />
            <span>System Configuration & Business Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure global brand details, tax compliance rates, receipt formats, and database synchronization
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Identity */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Store className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Business Identity & Registration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Business Name
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Tagline / Brand Slogan
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                VAT Registration BIN / Tax ID
              </label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Customer Support Hotline
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Headquarters Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Tax Defaults */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Currency, Tax & POS Defaults</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Default VAT Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.defaultTaxRate}
                onChange={(e) => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* VAT Toggle & Options */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <label className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Enable VAT / Tax Calculation</span>
                  <span className="text-[10px] text-slate-400">Apply standard VAT to sales by default (can be toggled in POS)</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableTax !== false}
                  onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                />
              </label>

              <label className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Hide 0% Tax from Receipts</span>
                  <span className="text-[10px] text-slate-400">Do not print tax line if tax amount is 0৳ / exempt</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hideTaxOnReceipt === true}
                  onChange={(e) => setFormData({ ...formData, hideTaxOnReceipt: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                />
              </label>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Receipt Footer Default Thank You Note
              </label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Thermal Receipt & Kitchen Token Print Configuration */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Thermal Receipt & Kitchen Print Settings</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                    {formData.printMode?.replace('_', ' ').toUpperCase() || 'CUSTOMER ONLY'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize thermal print header/footer slogans, auto-print triggers, and food prep kitchen slips (KOT)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer shadow"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Open Print Customizer & Live Preview</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Customer Bill Slip</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {formData.autoPrintReceipt ? 'Auto-Print ON' : 'Manual'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Contains product prices, item subtotal, discounts, VAT (Mushak-6.3), and payment proofs for walk-in guests.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-blue-400" />
                  <span>Kitchen Token (KOT)</span>
                </span>
                <span className="text-[10px] text-blue-400 font-bold">
                  {formData.autoPrintKitchenToken ? 'Auto-Print ON' : 'Manual'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Contains order ticket #, item quantities in bold, and special cooking notes (no prices) for the kitchen chef/barista.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Paper Width</span>
                </span>
                <span className="text-[10px] text-amber-300 font-bold">
                  {formData.receiptPaperSize || '80mm'} Standard
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Standard 80mm thermal receipt roll (or 58mm compact portable mobile POS thermal printer roll).
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save All Configuration</span>
          </button>
        </div>
      </form>

      {/* Firestore Daily Backups & Disaster Recovery Vault */}
      {role === 'super_admin' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Daily Snapshot & Secondary Firestore Backups</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    Auto-Protected
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated background service exports snapshots of <code className="text-amber-400">sales</code> and <code className="text-amber-400">inventory</code> collections daily into Firestore <code className="text-amber-400">backups</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isBackingUp}
              onClick={handleManualBackup}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CloudDownload className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
              <span>{isBackingUp ? 'Capturing Snapshot...' : 'Trigger Snapshot Now'}</span>
            </button>
          </div>

          {backupMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{backupMessage}</span>
            </div>
          )}

          {/* Backup History Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase px-1">
              <span>Cloud Snapshot Archives ({backups.length})</span>
              <span>Preserved Datasets</span>
            </div>

            {backups.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                No backup snapshots found yet. Daily snapshots trigger automatically on system start.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">{b.id}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                          b.type === 'daily_snapshot' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {b.type === 'daily_snapshot' ? 'Daily Snapshot' : 'Manual Snapshot'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{b.date}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>Triggered by: {b.triggeredBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">
                          {b.salesCount} Sales • {b.inventoryCount} Stock Items
                        </div>
                        {b.totalSalesVolume !== undefined && (
                          <div className="text-[10px] text-slate-400">
                            Vol: {b.totalSalesVolume.toLocaleString()} {settings.currencySymbol}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedRestoreBackup(b)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Maintenance: Reset Local Cache & Re-sync */}
      {role === 'super_admin' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-200">Local Cache Reset & Clean Re-sync</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Need to refresh the local store cache? This will clear temporary cached records and re-sync freshly from the connected Firebase database.
          </p>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Clear Local Cache & Re-sync</span>
          </button>
        </div>
      )}

      {/* Print Configuration Modal */}
      {isPrintModalOpen && (
        <PrintConfigModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          settings={formData}
          onSave={async (updated) => {
            await updateSettings(updated);
            setFormData(updated);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
          }}
        />
      )}

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={selectedRestoreBackup !== null}
        onClose={() => setSelectedRestoreBackup(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Data Snapshot?"
        message={`Are you sure you want to restore data from snapshot [${selectedRestoreBackup?.id}] (${selectedRestoreBackup?.date})? This will synchronize inventory items and audit logs back to this snapshot point.`}
        confirmText={isRestoring ? 'Restoring...' : 'Yes, Restore Snapshot'}
        type="warning"
      />

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Clear Local Cache & Re-sync?"
        message="This action will refresh local device storage and reload all data from the database. Continue?"
        confirmText={isResetting ? 'Refreshing...' : 'Yes, Re-sync Now'}
        type="info"
      />
    </div>
  );
};
