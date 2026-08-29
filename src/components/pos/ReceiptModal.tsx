import React, { useRef, useState, useEffect } from 'react';
import { 
  Printer, 
  CheckCircle, 
  RotateCcw, 
  X, 
  Share2, 
  UtensilsCrossed, 
  Receipt, 
  Layers, 
  Sliders,
  Sparkles
} from 'lucide-react';
import { Sale, BusinessSettings, Branch } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { PrintConfigModal } from '../settings/PrintConfigModal';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: BusinessSettings;
  branch?: Branch | null;
  onNewSale?: () => void;
  onUpdateSettings?: (updated: BusinessSettings) => Promise<void>;
  autoTriggerPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
  branch,
  onNewSale,
  onUpdateSettings,
  autoTriggerPrint = false
}) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'kitchen' | 'both'>('customer');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Determine paper width
  const paperSize = settings.receiptPaperSize || '80mm';
  const paperWidthClass = paperSize === '58mm' ? 'max-w-[260px]' : 'max-w-sm';

  // Handle automatic print trigger based on settings
  useEffect(() => {
    if (isOpen && autoTriggerPrint && sale) {
      const mode = settings.printMode || 'customer_only';
      if (mode === 'customer_only') {
        setActiveTab('customer');
        const timer = setTimeout(() => {
          window.print();
        }, 400);
        return () => clearTimeout(timer);
      } else if (mode === 'kitchen_only') {
        setActiveTab('kitchen');
        const timer = setTimeout(() => {
          window.print();
        }, 400);
        return () => clearTimeout(timer);
      } else if (mode === 'both') {
        setActiveTab('both');
        const timer = setTimeout(() => {
          window.print();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoTriggerPrint, sale, settings.printMode]);

  if (!isOpen || !sale) return null;

  const handlePrint = (tabToPrint?: 'customer' | 'kitchen' | 'both') => {
    if (tabToPrint) {
      setActiveTab(tabToPrint);
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  const branchAddress = branch?.address || settings.address;
  const branchPhone = branch?.phone || settings.phone;
  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Order Slips & Receipt" maxWidth="lg">
        {/* Top Action & Mode Selector Bar */}
        <div className="space-y-3 mb-4 pb-3 border-b border-slate-800 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>Payment Successful</span>
              <span className="text-[11px] font-mono text-slate-400">({sale.invoiceNumber})</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Config Button */}
              {onUpdateSettings && (
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  title="Configure print header/footer and auto-print rules"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Print Settings</span>
                </button>
              )}

              {/* Print Customer Slip */}
              <button
                onClick={() => handlePrint('customer')}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>

              {/* Print Kitchen Token (KOT) */}
              <button
                onClick={() => handlePrint('kitchen')}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Print KOT</span>
              </button>

              {/* Print Both */}
              <button
                onClick={() => handlePrint('both')}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Both</span>
              </button>

              {onNewSale && (
                <button
                  onClick={() => {
                    onClose();
                    onNewSale();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Next Sale</span>
                </button>
              )}
            </div>
          </div>

          {/* View Tab Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex p-0.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  activeTab === 'customer'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Customer Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kitchen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  activeTab === 'kitchen'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Kitchen Token (KOT)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                  activeTab === 'both'
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Side-by-Side View</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Format: {paperSize} Thermal
            </span>
          </div>
        </div>

        {/* Slips Container */}
        <div className={`space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar p-1 ${activeTab === 'both' ? 'flex flex-col md:flex-row md:space-y-0 md:gap-4 items-start justify-center' : ''}`}>
          
          {/* 1. Customer Bill Slip */}
          {(activeTab === 'customer' || activeTab === 'both') && (
            <div 
              ref={receiptRef}
              id="printable-receipt"
              className={`bg-white text-slate-950 p-6 rounded-2xl font-mono text-xs shadow-inner ${paperWidthClass} mx-auto border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 w-full`}
            >
              {/* Brand Header */}
              <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
                <div className="text-xs font-black tracking-tight text-slate-900 uppercase whitespace-pre-line">
                  {branch?.receiptHeader || settings.receiptHeader || '*** TAIWAN X FOODEX ***'}
                </div>
                <p className="text-[11px] font-bold text-slate-700">
                  {sale.branchName || branch?.name || 'Main Branch'}
                </p>
                <p className="text-[10px] text-slate-600 leading-tight">
                  {branchAddress}
                </p>
                <p className="text-[10px] text-slate-600">
                  Tel: {branchPhone}
                </p>
                {(settings.showTaxNumberOnReceipt ?? true) && (
                  <p className="text-[9px] text-slate-500">
                    BIN: {settings.taxNumber || '009842145-0101'} • Mushak-6.3
                  </p>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{formatDateTime(sale.createdAt || sale.timestamp)}</span>
                </div>
                {(settings.showCashierOnReceipt ?? true) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cashier:</span>
                    <span>{sale.cashierName}</span>
                  </div>
                )}
                {(settings.showCustomerInfoOnReceipt ?? true) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-800">{sale.customerName || 'Guest Walk-in'}</span>
                  </div>
                )}
                {(settings.showCustomerInfoOnReceipt ?? true) && sale.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span>{sale.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2.5 border-b-2 border-dashed border-slate-300">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] text-slate-500 font-semibold uppercase">
                      <th className="py-1">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Price</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="text-[11px]">
                        <td className="py-1.5 pr-2 font-medium">
                          <div>{item.productName}</div>
                          {(settings.showItemNotesOnReceipt ?? true) && item.notes && (
                            <div className="text-[9px] text-amber-700 italic">Note: {item.notes}</div>
                          )}
                        </td>
                        <td className="py-1.5 text-center font-bold text-slate-700">{item.quantity}</td>
                        <td className="py-1.5 text-right text-slate-600">{item.unitPrice}</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">{item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="py-2.5 space-y-1.5 text-[11px] border-b-2 border-dashed border-slate-300">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal ({sale.itemCount || sale.items.length} items):</span>
                  <span className="font-semibold">{formatCurrency(sale.subtotal, currencySymbol)}</span>
                </div>

                {sale.discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Discount {sale.discountType === 'percentage' ? `(${sale.discountValue}%)` : ''}:</span>
                    <span>- {formatCurrency(sale.discountAmount, currencySymbol)}</span>
                  </div>
                )}

                {(!settings.hideTaxOnReceipt || sale.taxAmount > 0) && (
                  <div className="flex justify-between text-slate-700">
                    <span>VAT / Tax {sale.taxRate > 0 ? `(${sale.taxRate}%)` : '(Exempt)'}:</span>
                    <span>{sale.taxAmount > 0 ? `+${formatCurrency(sale.taxAmount, currencySymbol)}` : '0৳'}</span>
                  </div>
                )}

                {/* Grand Total Highlight */}
                <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-1.5 border-t border-slate-300">
                  <span>GRAND TOTAL:</span>
                  <span className="text-base">{formatCurrency(sale.grandTotal, currencySymbol)}</span>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                    {sale.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid Amount:</span>
                  <span className="font-semibold">{formatCurrency(sale.paidAmount, currencySymbol)}</span>
                </div>
                {sale.changeAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Change Returned:</span>
                    <span>{formatCurrency(sale.changeAmount, currencySymbol)}</span>
                  </div>
                )}
                {sale.dueAmount > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Due Balance:</span>
                    <span>{formatCurrency(sale.dueAmount, currencySymbol)}</span>
                  </div>
                )}
              </div>

              {/* Barcode Simulation & Footer */}
              <div className="pt-3 text-center space-y-2">
                {(settings.showBarcodeOnReceipt ?? true) && (
                  <>
                    <div className="flex justify-center items-center gap-1 py-1 px-4 bg-slate-100 rounded">
                      <div className="h-6 tracking-[4px] font-mono text-xs font-bold text-slate-800 flex items-center">
                        ||| | |||| | | ||| || ||| |
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {sale.invoiceNumber}
                    </p>
                  </>
                )}

                <p className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed font-sans">
                  {branch?.receiptFooter || settings.receiptFooter}
                </p>
                <p className="text-[9px] text-slate-400">
                  Powered by TAIWAN X FOODEX POS
                </p>
              </div>
            </div>
          )}

          {/* 2. Kitchen Order Token (KOT) Slip */}
          {(activeTab === 'kitchen' || activeTab === 'both') && (
            <div 
              id="printable-kitchen-token"
              className={`bg-white text-slate-950 p-6 rounded-2xl font-mono text-xs shadow-inner ${paperWidthClass} mx-auto border-2 border-dashed border-blue-400 print:border-none print:shadow-none print:p-0 print:m-0 w-full`}
            >
              {/* Header */}
              <div className="text-center pb-2 border-b-2 border-dashed border-slate-400 space-y-1">
                <div className="font-black text-sm uppercase tracking-tight text-slate-950 whitespace-pre-line">
                  {settings.kitchenTokenHeader || '*** KITCHEN ORDER TOKEN (KOT) ***'}
                </div>
                <p className="text-xs font-black text-blue-900 uppercase">
                  {sale.branchName || branch?.name || 'Main Kitchen'}
                </p>
              </div>

              {/* Token Meta */}
              <div className="py-2 border-b-2 border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between items-center bg-slate-100 p-1.5 rounded">
                  <span className="font-bold text-slate-600">ORDER TOKEN:</span>
                  <span className="text-sm font-black text-slate-950">
                    #{sale.invoiceNumber.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Ref:</span>
                  <span className="font-bold">{sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Placed:</span>
                  <span>{new Date(sale.createdAt || sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{sale.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Server / Cashier:</span>
                  <span>{sale.cashierName}</span>
                </div>
              </div>

              {/* Kitchen Item List */}
              <div className="py-3 space-y-3 border-b-2 border-dashed border-slate-400">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  ITEMS TO PREPARE ({sale.items.reduce((s, i) => s + i.quantity, 0)} TOTAL)
                </div>

                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-100 last:border-0">
                    <div className="space-y-0.5">
                      <div className="font-black text-xs text-slate-950">
                        {item.productName}
                      </div>
                      {(settings.showItemNotesOnKitchenToken ?? true) && item.notes && (
                        <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          ⚠️ SPECIAL NOTE: {item.notes}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-black bg-slate-950 text-white px-2 py-0.5 rounded shrink-0">
                      x {item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer Note */}
              <div className="pt-2 text-center text-[10px] font-black text-slate-700 uppercase tracking-wider">
                {settings.kitchenTokenFooter || '*** Serve Hot & Fresh — Taiwan X Foodex ***'}
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* Embedded Print Configuration Modal */}
      {isConfigModalOpen && onUpdateSettings && (
        <PrintConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          settings={settings}
          onSave={async (updated) => {
            await onUpdateSettings(updated);
            setIsConfigModalOpen(false);
          }}
        />
      )}
    </>
  );
};
