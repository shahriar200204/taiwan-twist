import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Zap,
  Download,
  HelpCircle,
  Clock
} from 'lucide-react';
import { googleSheetsSync, GoogleSheetsConfig } from '../../services/googleSheetsSync';
import { store } from '../../services/store';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose
}) => {
  const [config, setConfig] = useState<GoogleSheetsConfig>(googleSheetsSync.getConfig());
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'script' | 'sync_now'>('settings');
  const [syncProgress, setSyncProgress] = useState<{ running: boolean; result?: string }>({ running: false });

  useEffect(() => {
    if (isOpen) {
      googleSheetsSync.loadConfig().then(c => setConfig(c));
    }
  }, [isOpen]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await googleSheetsSync.saveConfig(config);
    setConfig(updated);
    setTestStatus({ status: 'success', message: 'Settings saved successfully!' });
  };

  const handleTestWebhook = async () => {
    if (!config.webhookUrl) {
      setTestStatus({ status: 'error', message: 'Please enter your Google Apps Script Webhook URL first.' });
      return;
    }

    setTestStatus({ status: 'testing', message: 'Sending test ping to Google Sheet...' });
    const res = await googleSheetsSync.testConnection(config.webhookUrl);
    if (res.success) {
      setTestStatus({ status: 'success', message: res.message });
      // Auto enable if test passed
      const updated = await googleSheetsSync.saveConfig({ ...config, enabled: true });
      setConfig(updated);
    } else {
      setTestStatus({ status: 'error', message: res.message });
    }
  };

  const handleCopyScript = () => {
    const script = googleSheetsSync.getAppsScriptTemplate();
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleBatchSyncSales = async () => {
    setSyncProgress({ running: true, result: 'Syncing sales history to Google Sheets...' });
    const sales = await store.getSales();
    const res = await googleSheetsSync.syncAllSales(sales);
    setSyncProgress({ 
      running: false, 
      result: res.success ? `Successfully synced ${res.count} sales records to Google Sheets!` : `Sync error: ${res.message}` 
    });
  };

  const handleSyncInventory = async () => {
    setSyncProgress({ running: true, result: 'Syncing real-time inventory to Google Sheets...' });
    const inv = await store.getInventory();
    const res = await googleSheetsSync.syncInventory(inv);
    setSyncProgress({ 
      running: false, 
      result: res.success ? `Successfully synced ${res.count} inventory items to Google Sheets!` : `Sync error: ${res.message}` 
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Sheets Live Real-Time Synchronization"
    >
      <div className="space-y-5 max-w-3xl">
        {/* Sync Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          config.enabled 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
              config.enabled ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Live Google Sheets Sync</span>
                <Badge variant={config.enabled ? 'success' : 'neutral'} size="sm">
                  {config.enabled ? 'LIVE ACTIVE' : 'DISCONNECTED'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {config.lastSyncedAt 
                  ? `Last synchronized: ${new Date(config.lastSyncedAt).toLocaleTimeString()}`
                  : 'Stream live orders, inventory & expenses straight into your spreadsheet'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={async (e) => {
                const updated = await googleSheetsSync.saveConfig({ enabled: e.target.checked });
                setConfig(updated);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'settings'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Connection Settings
          </button>
          <button
            onClick={() => setActiveSubTab('script')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'script'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            Apps Script Code & Instructions
          </button>
          <button
            onClick={() => setActiveSubTab('sync_now')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'sync_now'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Manual Batch Sync
          </button>
        </div>

        {/* TAB 1: CONNECTION SETTINGS */}
        {activeSubTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Apps Script Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  value={config.webhookUrl}
                  onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none font-mono placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testStatus.status === 'testing'}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  {testStatus.status === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Paste the Web App deployment URL generated from your Google Sheet's Apps Script.
              </p>
            </div>

            {testStatus.message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testStatus.status === 'success' 
                  ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300' 
                  : testStatus.status === 'error'
                  ? 'bg-rose-950/50 border border-rose-500/30 text-rose-300'
                  : 'bg-slate-900 text-slate-300'
              }`}>
                {testStatus.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                <span>{testStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSyncSales}
                  onChange={e => setConfig({ ...config, autoSyncSales: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">Auto-sync Sales & Invoices</div>
                  <div className="text-[10px] text-slate-400">Push each POS receipt immediately</div>
                </div>
              </label>

              <label className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSyncExpenses}
                  onChange={e => setConfig({ ...config, autoSyncExpenses: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">Auto-sync Branch Expenses</div>
                  <div className="text-[10px] text-slate-400">Push outflow records to sheet</div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Total records synced: <strong className="text-white">{config.totalSyncedCount}</strong></span>
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-amber-500/20"
              >
                Save Configuration
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: APPS SCRIPT CODE & STEP BY STEP */}
        {activeSubTab === 'script' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Easy 3-Step Setup Instructions
              </h3>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                <li>Create or open a blank spreadsheet on <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">Google Sheets</a>.</li>
                <li>Click <strong>Extensions &gt; Apps Script</strong> from the top menu in Google Sheets.</li>
                <li>Delete any placeholder code, click the <strong>Copy Script Code</strong> button below, paste it into the editor, and click Save.</li>
                <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, set <em>Execute as: Me</em>, and <em>Who has access: Anyone</em>.</li>
                <li>Click Deploy, approve permissions, and copy the Web App URL into Taiwan X Foodex!</li>
              </ol>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-300">Google Apps Script Snippet</span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedScript ? 'Copied to Clipboard!' : 'Copy Script Code'}
                </button>
              </div>
              <textarea
                readOnly
                rows={8}
                value={googleSheetsSync.getAppsScriptTemplate()}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-amber-300/90 select-all focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 3: MANUAL BATCH SYNC & EXPORT */}
        {activeSubTab === 'sync_now' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Trigger instant bulk synchronization to update your Google Sheet with all recorded transactions and current stock.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Sync All Historical Sales
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Upload all completed invoices into the <code>Live_Sales</code> tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBatchSyncSales}
                  disabled={syncProgress.running || !config.enabled}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Sync Sales History
                </button>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Sync Branch Stock Levels
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Refresh current branch inventory and stock valuation into <code>Live_Inventory</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncInventory}
                  disabled={syncProgress.running || !config.enabled}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Sync Stock Quantities
                </button>
              </div>
            </div>

            {syncProgress.result && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {syncProgress.result}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
