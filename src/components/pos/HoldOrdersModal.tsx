import React from 'react';
import { Clock, Play, Trash2, ShoppingBag } from 'lucide-react';
import { HeldCart, BusinessSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface HoldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldCarts: HeldCart[];
  onRecallCart: (cart: HeldCart) => void;
  onDeleteHeldCart: (cartId: string) => void;
  settings: BusinessSettings;
}

export const HoldOrdersModal: React.FC<HoldOrdersModalProps> = ({
  isOpen,
  onClose,
  heldCarts,
  onRecallCart,
  onDeleteHeldCart,
  settings
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Held Cart Orders" subtitle="Resume or discard previously parked order drafts" maxWidth="md">
      {heldCarts.length === 0 ? (
        <div className="text-center py-10">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No held orders found</p>
          <p className="text-xs text-slate-500 mt-1">You can park an order at any time using the "Hold Order" button in POS</p>
        </div>
      ) : (
        <div className="space-y-3">
          {heldCarts.map((cart) => {
            const total = cart.items.reduce((sum, it) => sum + it.subtotal, 0);
            const totalQty = cart.items.reduce((sum, it) => sum + it.quantity, 0);

            return (
              <div
                key={cart.id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-amber-500/50 transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 truncate">
                      {cart.label || 'Unnamed Order'}
                    </span>
                    {cart.customer && (
                      <span className="text-xs text-amber-400 font-medium">
                        ({cart.customer.name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {formatDateTime(cart.heldAt)}
                    </span>
                    <span>•</span>
                    <span>{totalQty} items</span>
                    <span>•</span>
                    <span className="font-bold text-slate-200">
                      {formatCurrency(total, settings.currencySymbol)}
                    </span>
                  </div>

                  {/* Preview Items */}
                  <p className="text-[11px] text-slate-400 truncate mt-1.5 font-sans">
                    {cart.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onRecallCart(cart);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Recall</span>
                  </button>
                  <button
                    onClick={() => onDeleteHeldCart(cart.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete Held Cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
