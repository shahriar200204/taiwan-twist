import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Check, 
  Copy, 
  RefreshCw, 
  Send, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Zap,
  HelpCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { googleSheetsSync, GoogleSheetsConfig } from '../../services/googleSheetsSync';
import { store } from '../../services/store';
import { Badge } from '../common/Badge';

export const GoogleSheetsSyncManager: React.FC = () => {
  const [config, setConfig] = useState<GoogleSheetsConfig>(googleSheetsSync.getConfig());
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'script' | 'batch_sync'>('overview');
  const [syncProgress, setSyncProgress] = useState<{ running: boolean; result?: string }>({ running: false });

  useEffect(() => {
    googleSheetsSync.loadConfig().then(c => setConfig(c));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await googleSheetsSync.saveConfig(config);
    setConfig(updated);
    setTestStatus({ status: 'success', message: 'Google Sheets synchronization settings updated!' });
  };

  const handleTestWebhook = async () => {
    if (!config.webhookUrl) {
      setTestStatus({ status: 'error', message: 'Please enter your Google Apps Script Webhook URL first.' });
      return;
    }

    setTestStatus({ status: 'testing', message: 'Sending test ping to Google Sheets...' });
    const res = await googleSheetsSync.testConnection(config.webhookUrl);
    if (res.success) {
      setTestStatus({ status: 'success', message: res.message });
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
    setSyncProgress({ running: true, result: 'Pushing all historical sales to Google Sheets...' });
    const sales = await store.getSales();
    const res = await googleSheetsSync.syncAllSales(sales);
    setSyncProgress({ 
      running: false, 
      result: res.success ? `Successfully synced ${res.count} sales records to Google Sheets!` : `Sync error: ${res.message}` 
    });
    const refreshed = await googleSheetsSync.loadConfig();
    setConfig(refreshed);
  };

  const handleSyncInventory = async () => {
    setSyncProgress({ running: true, result: 'Syncing real-time inventory stock levels...' });
    const inv = await store.getInventory();
    const res = await googleSheetsSync.syncInventory(inv);
    setSyncProgress({ 
      running: false, 
      result: res.success ? `Successfully updated ${res.count} inventory items in Google Sheets!` : `Sync error: ${res.message}` 
    });
    const refreshed = await googleSheetsSync.loadConfig();
    setConfig(refreshed);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white">Google Sheets Live Sync Engine</h1>
              <Badge variant={config.enabled ? 'success' : 'neutral'} size="sm">
                {config.enabled ? 'ACTIVE & STREAMING' : 'OFFLINE / SETUP NEEDED'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Stream live sales invoices, inventory levels, and branch expenses directly into Google Sheets in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('batch_sync')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Bulk Sync Now
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Copy className="w-4 h-4" />
            Get Script Code
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Live Status & Metrics
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Webhook & Auto-Sync
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'script'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          3-Step Setup Guide
        </button>
        <button
          onClick={() => setActiveTab('batch_sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'batch_sync'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Manual Bulk Sync
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Sync Status</p>
                <p className={`text-xl font-bold mt-1 ${config.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {config.enabled ? 'Connected & Real-Time' : 'Setup Required'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {config.webhookUrl ? 'Webhook configured' : 'No Webhook URL provided'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                config.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
              }`}>
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Rows Synced</p>
                <p className="text-2xl font-black text-white mt-1">{config.totalSyncedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Across all branches & tables</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Last Synced Timestamp</p>
                <p className="text-sm font-bold text-slate-200 mt-1">
                  {config.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString() : 'Never synced yet'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Instant push on checkout</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Sync Sheets Preview */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Synchronized Google Sheet Tabs
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    Tab: <code>Live_Sales</code>
                  </span>
                  <Badge variant={config.autoSyncSales ? 'success' : 'neutral'} size="sm">
                    {config.autoSyncSales ? 'Auto-Push ON' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Logs invoice number, timestamp, cashier, branch, items purchased, totals, VAT, discount, profit, and payment methods.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-400" />
                    Tab: <code>Live_Inventory</code>
                  </span>
                  <Badge variant="info" size="sm">
                    Stock Matrix
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Exports branch stock balances, SKUs, barcode mappings, purchase cost, retail price, and low-stock alert warnings.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-rose-400" />
                    Tab: <code>Live_Expenses</code>
                  </span>
                  <Badge variant={config.autoSyncExpenses ? 'success' : 'neutral'} size="sm">
                    {config.autoSyncExpenses ? 'Auto-Push ON' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Streams operational expenses (rent, utilities, salaries, ingredients) directly to your central accounting ledger.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">Webhook Connection Parameters</h2>
              <p className="text-xs text-slate-400">Set up the endpoint URL generated from Google Apps Script</p>
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Google Apps Script Webhook Web App URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={config.webhookUrl}
                onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none font-mono placeholder-slate-600"
              />
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testStatus.status === 'testing'}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                {testStatus.status === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ensure your deployment access is set to <em>"Anyone"</em> so Taiwan X Foodex POS can stream records securely.
            </p>
          </div>

          {testStatus.message && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
              testStatus.status === 'success' 
                ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300' 
                : testStatus.status === 'error'
                ? 'bg-rose-950/50 border border-rose-500/30 text-rose-300'
                : 'bg-slate-950 text-slate-300'
            }`}>
              {testStatus.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{testStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3.5 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={config.autoSyncSales}
                onChange={e => setConfig({ ...config, autoSyncSales: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <div className="text-xs font-bold text-slate-100">Live Auto-Sync POS Sales</div>
                <div className="text-[11px] text-slate-400">Stream each checkout ticket to Google Sheets instantly</div>
              </div>
            </label>

            <label className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3.5 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={config.autoSyncExpenses}
                onChange={e => setConfig({ ...config, autoSyncExpenses: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4"
              />
              <div>
                <div className="text-xs font-bold text-slate-100">Live Auto-Sync Branch Expenses</div>
                <div className="text-[11px] text-slate-400">Log branch operational costs directly into spreadsheets</div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
            >
              Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* SCRIPT CODE TAB */}
      {activeTab === 'script' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              How to Connect Your Google Sheet in 2 Minutes:
            </h3>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open a spreadsheet on <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold underline">Google Sheets</a>.</li>
              <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete any existing template code and paste the code below.</li>
              <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
              <li>Select type: <strong>Web app</strong>, Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong>.</li>
              <li>Click <strong>Deploy</strong>, grant permission, and paste the generated Web App URL into the <strong>Webhook &amp; Auto-Sync</strong> tab!</li>
            </ol>
          </div>

          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-slate-300">Ready-to-Paste Google Apps Script Code</span>
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScript ? 'Copied to Clipboard!' : 'Copy Code'}
              </button>
            </div>
            <textarea
              readOnly
              rows={12}
              value={googleSheetsSync.getAppsScriptTemplate()}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300/90 select-all focus:outline-none leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* BATCH SYNC TAB */}
      {activeTab === 'batch_sync' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Manual Bulk Synchronization</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Force an immediate refresh of all records from Taiwan X Foodex database into Google Sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  Sync All Historical Sales
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Uploads every completed sale, payment breakdown, customer name, and profit margin into the <code>Live_Sales</code> sheet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBatchSyncSales}
                disabled={syncProgress.running || !config.enabled}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Upload All Sales to Google Sheets
              </button>
            </div>

            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Sync Live Branch Inventory
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Overwrites the <code>Live_Inventory</code> sheet with exact real-time quantities, stock valuation in BDT, and warning flags.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncInventory}
                disabled={syncProgress.running || !config.enabled}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Upload Inventory Matrix
              </button>
            </div>
          </div>

          {syncProgress.result && (
            <div className="p-4 bg-slate-950 border border-slate-700 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{syncProgress.result}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
