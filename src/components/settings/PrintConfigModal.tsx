import React, { useState } from 'react';
import { 
  Printer, 
  Settings, 
  UtensilsCrossed, 
  Receipt, 
  FileText, 
  CheckCircle, 
  Sliders, 
  HelpCircle, 
  Eye, 
  Copy, 
  Sparkles, 
  Save, 
  X,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { BusinessSettings } from '../../types';

interface PrintConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  onSave: (updatedSettings: BusinessSettings) => Promise<void>;
}

export const PrintConfigModal: React.FC<PrintConfigModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [config, setConfig] = useState<BusinessSettings>({
    ...settings,
    receiptHeader: settings.receiptHeader ?? '*** TAIWAN X FOODEX ***\nAuthentic Taiwanese Street Food & Boba Tea\nVAT Reg / BIN: 009842145-0101 • Mushak-6.3',
    receiptFooter: settings.receiptFooter || 'Thank you for choosing TAIWAN X FOODEX!\nHot food & fresh boba served daily.\nFollow us @taiwanxfoodex.bd',
    kitchenTokenHeader: settings.kitchenTokenHeader ?? '*** KITCHEN ORDER TOKEN (KOT) ***\nPREPARATION SLIP',
    kitchenTokenFooter: settings.kitchenTokenFooter ?? '*** Serve Hot & Fresh — Taiwan X Foodex ***',
    autoPrintReceipt: settings.autoPrintReceipt ?? true,
    autoPrintKitchenToken: settings.autoPrintKitchenToken ?? false,
    printMode: settings.printMode ?? 'customer_only',
    receiptPaperSize: settings.receiptPaperSize ?? '80mm',
    showTaxNumberOnReceipt: settings.showTaxNumberOnReceipt ?? true,
    showCustomerInfoOnReceipt: settings.showCustomerInfoOnReceipt ?? true,
    showCashierOnReceipt: settings.showCashierOnReceipt ?? true,
    showBarcodeOnReceipt: settings.showBarcodeOnReceipt ?? true,
    showItemNotesOnReceipt: settings.showItemNotesOnReceipt ?? true,
    showItemNotesOnKitchenToken: settings.showItemNotesOnKitchenToken ?? true,
    kitchenTokenCopies: settings.kitchenTokenCopies ?? 1
  });

  const [activePreviewTab, setActivePreviewTab] = useState<'customer_receipt' | 'kitchen_token'>('customer_receipt');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(config);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving print configuration:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = () => {
    const originalTitle = document.title;
    document.title = activePreviewTab === 'customer_receipt' ? 'Sample_Customer_Receipt' : 'Sample_Kitchen_Token';
    window.print();
    document.title = originalTitle;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt & Kitchen Print Configuration" maxWidth="2xl">
      <div className="space-y-6">
        {/* Header Introduction & Explanation */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-300 space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Print Behavior: Customer Bill vs. Kitchen Order Token (KOT)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                In food & restaurant POS, two printouts serve distinct purposes:
              </p>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                <li>
                  <strong className="text-white">Customer Bill / Invoice (কাস্টমার বিল):</strong> Full invoice with item prices, tax/VAT (Mushak-6.3), discounts, and payment proofs.
                </li>
                <li>
                  <strong className="text-white">Kitchen Order Token (কিচেন টোকেন):</strong> Compact prep ticket for chefs & baristas with table/order number, item quantities, and special cooking instructions (no prices).
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-5">
            {/* Print Mode & Auto-Print Selector */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Auto-Print Behavior After Checkout</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-bold border border-slate-700">
                  {config.printMode?.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* 4 Mode Option Cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'customer_only',
                    title: 'Customer Bill Only',
                    desc: 'Prints invoice with price & VAT only',
                    icon: Receipt
                  },
                  {
                    id: 'kitchen_only',
                    title: 'Kitchen Token Only',
                    desc: 'Prints food prep slip for chef only',
                    icon: UtensilsCrossed
                  },
                  {
                    id: 'both',
                    title: 'Both Slips (Bill + KOT)',
                    desc: 'Prints customer bill + kitchen slip',
                    icon: Layers
                  },
                  {
                    id: 'manual',
                    title: 'Manual / On-Screen',
                    desc: 'Show on screen, no auto-print',
                    icon: Eye
                  }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = config.printMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setConfig({ 
                        ...config, 
                        printMode: mode.id as any,
                        autoPrintReceipt: mode.id === 'customer_only' || mode.id === 'both',
                        autoPrintKitchenToken: mode.id === 'kitchen_only' || mode.id === 'both'
                      })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{mode.title}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{mode.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Auto-Print Checkbox Toggles */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 cursor-pointer">
                  <span className="text-xs text-slate-300 font-medium">Auto-trigger print dialog after transaction</span>
                  <input
                    type="checkbox"
                    checked={config.autoPrintReceipt || config.autoPrintKitchenToken}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setConfig({
                        ...config,
                        autoPrintReceipt: checked,
                        printMode: checked ? (config.printMode === 'manual' ? 'customer_only' : config.printMode) : 'manual'
                      });
                    }}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Paper Width</label>
                    <select
                      value={config.receiptPaperSize || '80mm'}
                      onChange={(e) => setConfig({ ...config, receiptPaperSize: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="80mm">80mm (Standard POS Thermal)</option>
                      <option value="58mm">58mm (Compact Mobile POS)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Kitchen Token Copies</label>
                    <select
                      value={config.kitchenTokenCopies || 1}
                      onChange={(e) => setConfig({ ...config, kitchenTokenCopies: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value={1}>1 Copy (Kitchen Cook)</option>
                      <option value={2}>2 Copies (Cook + Drink/Boba Bar)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Receipt Header & Footer Text */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Customer Bill Header & Footer</span>
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Receipt Header Text (Business Info / VAT BIN)
                  </label>
                  <textarea
                    rows={3}
                    value={config.receiptHeader || ''}
                    onChange={(e) => setConfig({ ...config, receiptHeader: e.target.value })}
                    placeholder="Enter receipt header message..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Displays at the top of the customer bill above items.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Receipt Footer Text (Thank you / Wifi / Social handle)
                  </label>
                  <textarea
                    rows={3}
                    value={config.receiptFooter || ''}
                    onChange={(e) => setConfig({ ...config, receiptFooter: e.target.value })}
                    placeholder="Enter receipt footer message..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Displays at the bottom of the customer bill below totals.
                  </p>
                </div>
              </div>
            </div>

            {/* Kitchen Token Header & Footer Text */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                <span>Kitchen Order Token (KOT) Slip Text</span>
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kitchen Slip Header Banner
                  </label>
                  <input
                    type="text"
                    value={config.kitchenTokenHeader || ''}
                    onChange={(e) => setConfig({ ...config, kitchenTokenHeader: e.target.value })}
                    placeholder="*** KITCHEN ORDER TOKEN (KOT) ***"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kitchen Slip Footer Note
                  </label>
                  <input
                    type="text"
                    value={config.kitchenTokenFooter || ''}
                    onChange={(e) => setConfig({ ...config, kitchenTokenFooter: e.target.value })}
                    placeholder="*** Serve Hot & Fresh — Taiwan X Foodex ***"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Visibility Toggle Options */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Receipt Data Visibility Options
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={config.showBarcodeOnReceipt ?? true}
                    onChange={(e) => setConfig({ ...config, showBarcodeOnReceipt: e.target.checked })}
                    className="rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>Show Barcode</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={config.showTaxNumberOnReceipt ?? true}
                    onChange={(e) => setConfig({ ...config, showTaxNumberOnReceipt: e.target.checked })}
                    className="rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>Show Tax / BIN Number</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={config.showCustomerInfoOnReceipt ?? true}
                    onChange={(e) => setConfig({ ...config, showCustomerInfoOnReceipt: e.target.checked })}
                    className="rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>Show Customer Info</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={config.showItemNotesOnReceipt ?? true}
                    onChange={(e) => setConfig({ ...config, showItemNotesOnReceipt: e.target.checked })}
                    className="rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>Show Item Cooking Notes</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Thermal Print Preview */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Live Thermal Preview</span>
              </span>

              {/* Preview Tabs */}
              <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('customer_receipt')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    activePreviewTab === 'customer_receipt'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Customer Bill
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('kitchen_token')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    activePreviewTab === 'kitchen_token'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kitchen Token
                </button>
              </div>
            </div>

            {/* Simulated Paper Roll */}
            <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center overflow-hidden">
              <div 
                id="thermal-preview-container"
                className={`bg-white text-slate-950 p-5 rounded-lg shadow-2xl font-mono text-[11px] border border-slate-200 space-y-3 w-full transition-all ${
                  config.receiptPaperSize === '58mm' ? 'max-w-[240px]' : 'max-w-[300px]'
                }`}
              >
                {activePreviewTab === 'customer_receipt' ? (
                  // Customer Receipt Preview
                  <>
                    {/* Header */}
                    <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
                      <div className="font-black text-xs uppercase tracking-tight text-slate-900 whitespace-pre-line">
                        {config.receiptHeader || '*** TAIWAN X FOODEX ***'}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {config.address || 'Plot 45, Road 11, Banani, Dhaka'}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        Tel: {config.phone || '+880 1711-000999'}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-0.5 text-[10px] text-slate-700 py-1 border-b border-dashed border-slate-300">
                      <div className="flex justify-between font-bold">
                        <span>Invoice: #TXF-89241</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                      {config.showCashierOnReceipt && (
                        <div className="flex justify-between">
                          <span>Cashier: Shahriar</span>
                          <span>POS Terminal #1</span>
                        </div>
                      )}
                      {config.showCustomerInfoOnReceipt && (
                        <div className="flex justify-between">
                          <span>Customer: Walk-in Guest</span>
                          <span>Cash Sale</span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="py-1 border-b border-dashed border-slate-300">
                      <div className="grid grid-cols-12 font-bold text-[10px] text-slate-600 border-b border-slate-200 pb-0.5 mb-1">
                        <span className="col-span-6">ITEM</span>
                        <span className="col-span-2 text-center">QTY</span>
                        <span className="col-span-4 text-right">TOTAL</span>
                      </div>
                      
                      <div className="space-y-1.5 text-[10px]">
                        <div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-900">XXL Taiwan Cutlet (Spicy)</span>
                            <span className="font-bold">420 ৳</span>
                          </div>
                          <div className="text-[9px] text-slate-500">1 x 420 ৳</div>
                          {config.showItemNotesOnReceipt && (
                            <div className="text-[9px] text-amber-700 italic">Note: Extra crispy & spicy</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-900">Brown Sugar Boba Milk</span>
                            <span className="font-bold">280 ৳</span>
                          </div>
                          <div className="text-[9px] text-slate-500">1 x 280 ৳</div>
                          {config.showItemNotesOnReceipt && (
                            <div className="text-[9px] text-amber-700 italic">Note: 50% Sugar, Less Ice</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financials */}
                    <div className="space-y-1 text-[10px] py-1 border-b border-dashed border-slate-300">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>700 ৳</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>VAT (5%):</span>
                        <span>+35 ৳</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-950 pt-1 border-t border-slate-300">
                        <span>GRAND TOTAL:</span>
                        <span>735 ৳</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center space-y-1 pt-1">
                      {config.showBarcodeOnReceipt && (
                        <div className="text-[9px] tracking-widest text-slate-400 font-mono">
                          |||| ||||| |||| |||||
                        </div>
                      )}
                      <div className="text-[9px] text-slate-600 whitespace-pre-line leading-tight">
                        {config.receiptFooter}
                      </div>
                    </div>
                  </>
                ) : (
                  // Kitchen Order Token (KOT) Preview
                  <>
                    <div className="text-center pb-2 border-b-2 border-dashed border-slate-400 space-y-0.5">
                      <div className="font-black text-xs uppercase tracking-tight text-slate-950 whitespace-pre-line">
                        {config.kitchenTokenHeader || '*** KITCHEN ORDER TOKEN ***'}
                      </div>
                      <div className="text-[10px] font-bold text-slate-700">
                        BANANI HUB — PREPARATION ORDER
                      </div>
                    </div>

                    <div className="py-1.5 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                      <div className="flex justify-between font-black text-xs text-slate-950">
                        <span>TOKEN #042</span>
                        <span>DINE-IN</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Inv: #TXF-89241</span>
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-slate-600">
                        Server/Cashier: Shahriar
                      </div>
                    </div>

                    {/* KOT Items List (Bold, large counts, special notes) */}
                    <div className="py-2 space-y-2 border-b-2 border-dashed border-slate-400">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-xs text-slate-950">
                            XXL Taiwan Cutlet (Spicy)
                          </div>
                          {config.showItemNotesOnKitchenToken && (
                            <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded mt-0.5">
                              ⚠️ KITCHEN NOTE: Extra crispy & spicy
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                          [ x 1 ]
                        </span>
                      </div>

                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-xs text-slate-950">
                            Brown Sugar Boba Milk
                          </div>
                          {config.showItemNotesOnKitchenToken && (
                            <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded mt-0.5">
                              🧋 BAR NOTE: 50% Sugar, Less Ice
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                          [ x 1 ]
                        </span>
                      </div>
                    </div>

                    <div className="text-center pt-1 text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                      {config.kitchenTokenFooter || '*** Serve Hot & Fresh ***'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Test Print Sample */}
            <button
              type="button"
              onClick={handleTestPrint}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Print Sample ({activePreviewTab === 'customer_receipt' ? 'Customer Bill' : 'Kitchen Token'})</span>
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>Configuration Saved!</span>
              </span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Settings...' : 'Save Print Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
