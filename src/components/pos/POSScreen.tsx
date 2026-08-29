import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Tag, 
  CreditCard, 
  Coins, 
  Smartphone, 
  Percent, 
  CheckCircle2, 
  PauseCircle, 
  Play, 
  X, 
  UserPlus, 
  Clock, 
  Receipt as ReceiptIcon,
  AlertCircle,
  Utensils,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { 
  Product, 
  Category, 
  BranchInventoryItem, 
  CartItem, 
  Customer, 
  PaymentMethod, 
  Sale, 
  HeldCart 
} from '../../types';
import { formatCurrency, generateInvoiceNumber } from '../../utils/formatters';
import { ReceiptModal } from './ReceiptModal';
import { HoldOrdersModal } from './HoldOrdersModal';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

const LOCAL_CART_KEY = 'txf_active_pos_cart_v1';
const HELD_CARTS_KEY = 'txf_held_carts_v1';

export const POSScreen: React.FC = () => {
  const { user, role, activeBranchId, branches, settings, updateSettings } = useAuth();

  // Selected branch for POS (if super_admin and activeBranchId === 'all', use first branch)
  const currentBranchId = useMemo(() => {
    if (role === 'super_admin') {
      return activeBranchId === 'all' ? (branches[0]?.id || 'branch-main') : activeBranchId;
    }
    return user?.branchId || branches[0]?.id || 'branch-main';
  }, [activeBranchId, branches, role, user]);

  const currentBranch = useMemo(() => {
    return branches.find(b => b.id === currentBranchId) || branches[0];
  }, [branches, currentBranchId]);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<BranchInventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isTaxEnabled, setIsTaxEnabled] = useState<boolean>(true);
  const [hideTaxRow, setHideTaxRow] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Modals
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState<boolean>(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const saved = localStorage.getItem(HELD_CARTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customer picker / quick add modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [newCustomerEmail, setNewCustomerEmail] = useState<string>('');

  // Item note modal
  const [editingNoteItem, setEditingNoteItem] = useState<{ index: number; note: string } | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [prods, cats, inv, custs] = await Promise.all([
        store.getProducts(),
        store.getCategories(),
        store.getInventory(currentBranchId),
        store.getCustomers()
      ]);
      setProducts(prods);
      setCategories(cats);
      setInventory(inv);
      setCustomers(custs);

      // Default customer to Guest Walk-in
      if (!selectedCustomer) {
        const guest = custs.find(c => c.id === 'cust-walkin') || custs[0];
        if (guest) setSelectedCustomer(guest);
      }
      setLoading(false);
    };

    loadData();
  }, [currentBranchId]);

  // Save Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  }, [cart]);

  // Save Held Carts
  useEffect(() => {
    localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(heldCarts));
  }, [heldCarts]);

  // Map stock level by productId
  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach(item => {
      map[item.productId] = item.currentStock;
    });
    return map;
  }, [inventory]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(prod => {
      const matchesCat = selectedCategory === 'all' || prod.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.barcode.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        prod.categoryName.toLowerCase().includes(q);
      
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Barcode / Search submit handler
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Find exact barcode match or top match
      const exactBarcode = products.find(p => p.barcode === searchQuery.trim() || p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearchQuery('');
        return;
      }
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearchQuery('');
      }
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    const currentStock = stockMap[product.id] ?? 50;
    
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        if (existing.quantity >= currentStock) {
          alert(`Warning: Only ${currentStock} units available in ${currentBranch?.name || 'this branch'}.`);
        }
        const updated = [...prev];
        const newQty = existing.quantity + 1;
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.unitPrice - (existing.discount * newQty)
        };
        return updated;
      } else {
        if (currentStock <= 0) {
          const proceed = confirm(`Notice: "${product.name}" is currently recorded with 0 stock in this branch. Do you still wish to add it?`);
          if (!proceed) return prev;
        }
        const newItem: CartItem = {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          costPrice: product.costPrice,
          discount: 0,
          subtotal: product.sellingPrice
        };
        return [...prev, newItem];
      }
    });
  };

  // Update Item Quantity
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      const currentStock = stockMap[item.product.id] ?? 50;
      if (newQty > currentStock) {
        // warning
      }
      updated[index] = {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.unitPrice - (item.discount * newQty)
      };
      return updated;
    });
  };

  // Remove Item from Cart
  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Clear Cart
  const clearCart = () => {
    if (cart.length > 0) {
      setCart([]);
      setDiscountValue(0);
      setPaidAmountInput('');
      setOrderNotes('');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0 || subtotal <= 0) return 0;
    if (discountType === 'percentage') {
      const percent = Math.min(100, Math.max(0, discountValue));
      return Math.round((subtotal * percent) / 100);
    }
    return Math.min(subtotal, Math.max(0, discountValue));
  }, [subtotal, discountType, discountValue]);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const baseTaxRate = currentBranch?.taxRate ?? settings.defaultTaxRate ?? 5;
  const isTaxActive = isTaxEnabled && (settings.enableTax !== false);
  const taxRate = isTaxActive ? baseTaxRate : 0;
  const taxAmount = isTaxActive ? Math.round((discountedSubtotal * taxRate) / 100) : 0;
  const grandTotal = discountedSubtotal + taxAmount;

  // Paid amount calculation
  const paidAmount = useMemo(() => {
    if (selectedPaymentMethod === 'due') return 0;
    if (!paidAmountInput) return grandTotal;
    const num = parseFloat(paidAmountInput);
    return isNaN(num) ? grandTotal : num;
  }, [paidAmountInput, grandTotal, selectedPaymentMethod]);

  const changeAmount = Math.max(0, paidAmount - grandTotal);
  const dueAmount = selectedPaymentMethod === 'due' ? grandTotal : Math.max(0, grandTotal - paidAmount);

  // Quick cash tender helper
  const handleQuickCash = (amount: number) => {
    setSelectedPaymentMethod('cash');
    setPaidAmountInput(amount.toString());
  };

  // Hold current order
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const label = prompt('Enter a label or table reference for this held order:', selectedCustomer?.name ? `${selectedCustomer.name}` : `Order #${heldCarts.length + 1}`);
    if (label === null) return; // cancelled

    const newHeld: HeldCart = {
      id: `held-${Date.now()}`,
      label: label.trim() || `Held Order #${heldCarts.length + 1}`,
      items: [...cart],
      customer: selectedCustomer,
      discountType,
      discountValue,
      heldAt: new Date().toISOString()
    };

    setHeldCarts(prev => [newHeld, ...prev]);
    setCart([]);
    setDiscountValue(0);
    setPaidAmountInput('');
  };

  // Recall held cart
  const handleRecallCart = (held: HeldCart) => {
    setCart(held.items);
    if (held.customer) setSelectedCustomer(held.customer);
    setDiscountType(held.discountType);
    setDiscountValue(held.discountValue);
    setHeldCarts(prev => prev.filter(h => h.id !== held.id));
  };

  // Checkout process
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Please add items to checkout.');
      return;
    }

    if (selectedPaymentMethod === 'due' && (!selectedCustomer || selectedCustomer.id === 'cust-walkin')) {
      alert('Due payments require a registered customer with valid phone number.');
      setIsCustomerModalOpen(true);
      return;
    }

    try {
      setIsProcessing(true);

      const invoiceNumber = generateInvoiceNumber(currentBranch?.code || 'TXF-01');
      const now = new Date();

      const saleItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        subtotal: item.quantity * item.unitPrice,
        notes: item.notes
      }));

      const newSale: Sale = {
        id: `sale-${Date.now()}`,
        invoiceNumber,
        branchId: currentBranchId,
        branchName: currentBranch?.name || 'Main Branch',
        cashierId: user?.id || 'cashier-1',
        cashierName: user?.displayName || 'Cashier',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || 'Walk-in Guest',
        customerPhone: selectedCustomer?.phone,
        items: saleItems,
        itemCount: saleItems.reduce((sum, it) => sum + it.quantity, 0),
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxRate,
        taxAmount,
        grandTotal,
        totalCost,
        netProfit: discountedSubtotal - totalCost,
        paymentMethod: selectedPaymentMethod,
        paymentStatus: dueAmount > 0 ? (paidAmount > 0 ? 'partial' : 'due') : 'completed',
        paidAmount: selectedPaymentMethod === 'due' ? 0 : (paidAmount || grandTotal),
        changeAmount,
        dueAmount,
        status: 'completed',
        notes: orderNotes.trim() || undefined,
        createdAt: now.toISOString(),
        timestamp: now.getTime()
      };

      // Process in store
      const processed = await store.processSale(newSale);
      
      // Update local inventory state
      setInventory(await store.getInventory(currentBranchId));
      
      // Reset cart and open receipt
      setCompletedSale(processed);
      setCart([]);
      setDiscountValue(0);
      setPaidAmountInput('');
      setOrderNotes('');
      setIsReceiptOpen(true);
    } catch (err: any) {
      alert('Checkout error: ' + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  // Add new customer on the fly
  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      alert('Customer name and phone are required');
      return;
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim(),
      email: newCustomerEmail.trim() || undefined,
      totalPurchases: 0,
      totalOrders: 0,
      dueAmount: 0,
      createdAt: new Date().toISOString()
    };

    await store.saveCustomer(newCust);
    const updatedCusts = await store.getCustomers();
    setCustomers(updatedCusts);
    setSelectedCustomer(newCust);
    setIsCustomerModalOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
  };

  // Customer search filtered
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-950 overflow-hidden select-none">
      {/* ================= LEFT SIDE: PRODUCTS & SEARCH ================= */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-slate-950">
        {/* Top Control Bar: Search & Barcode & Categories */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-3">
            {/* Search Input with Auto-focus Barcode Support */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search food item, SKU, or scan barcode (Press Enter)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-medium"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Barcode className="w-4 h-4 text-amber-400/70 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Held Carts quick badge / button */}
            <button
              onClick={() => setIsHoldModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shrink-0"
              title="View Held Orders"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Parked</span>
              {heldCarts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                  {heldCarts.length}
                </span>
              )}
            </button>
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>All Items</span>
              <span className="text-[10px] opacity-75 font-mono">({products.length})</span>
            </button>

            {categories.map(cat => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color || '#f59e0b' }}
                  />
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Loading menu catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Utensils className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No menu items found</p>
              <p className="text-xs text-slate-500 mt-1">Try another category or search keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map(product => {
                const stock = stockMap[product.id] ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= product.minStockAlert;

                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group relative bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-150 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5"
                  >
                    {/* Product Image & Stock Badge */}
                    <div className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-950 mb-2.5">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                      {/* Stock Pill Badge */}
                      <div className="absolute top-2 right-2">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/90 text-white font-extrabold text-[10px] shadow-sm">
                            OUT OF STOCK
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-extrabold text-[10px] shadow-sm">
                            {stock} left
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                            {stock} in stock
                          </span>
                        )}
                      </div>

                      {/* Category Label */}
                      <div className="absolute bottom-1.5 left-2">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                          {product.unit}
                        </span>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {product.sku}
                      </p>
                    </div>

                    {/* Price & Add Indicator */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80">
                      <span className="text-sm font-extrabold text-amber-400">
                        {formatCurrency(product.sellingPrice, currencySymbol)}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-amber-500 text-slate-300 group-hover:text-slate-950 flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT SIDE: CART & CHECKOUT ================= */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-slate-900 border-l border-slate-800 shrink-0">
        {/* Customer Header Bar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 truncate">
                  {selectedCustomer?.name || 'Walk-in Guest'}
                </span>
                {selectedCustomer?.dueAmount ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold">
                    Due: {formatCurrency(selectedCustomer.dueAmount, currencySymbol)}
                  </span>
                ) : null}
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {selectedCustomer?.phone || 'Standard retail customer'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition-colors shrink-0 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Change</span>
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Utensils className="w-12 h-12 text-slate-700 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-slate-300">Order Cart is Empty</p>
              <p className="text-xs text-slate-500 mt-1">
                Select items from the catalog or scan barcodes to begin a sale
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-slate-100 truncate">
                      {item.product.name}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatCurrency(item.unitPrice, currencySymbol)} / {item.product.unit}
                    </p>
                    {item.notes && (
                      <p className="text-[10px] text-amber-400/90 italic mt-0.5">
                        📝 {item.notes}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-extrabold text-slate-100 shrink-0 font-mono">
                    {formatCurrency(item.subtotal, currencySymbol)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                  {/* Note trigger */}
                  <button
                    onClick={() => setEditingNoteItem({ index: idx, note: item.notes || '' })}
                    className="text-[10px] text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {item.notes ? 'Edit note' : '+ Add kitchen note'}
                  </button>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-slate-100 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors ml-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation & Payment Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 space-y-3">
          {/* Discount & Clear & Hold Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
              <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0 mr-1.5" />
              <button
                onClick={() => setDiscountType(discountType === 'percentage' ? 'fixed' : 'percentage')}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 mr-1.5 hover:text-amber-400"
              >
                {discountType === 'percentage' ? '%' : currencySymbol}
              </button>
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Discount"
                className="w-full bg-transparent text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1 shrink-0"
              title="Park / Hold Order"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hold</span>
            </button>

            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 disabled:opacity-40 transition-colors shrink-0"
              title="Clear Cart"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Totals Summary */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-200">{formatCurrency(subtotal, currencySymbol)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-rose-400 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- {formatCurrency(discountAmount, currencySymbol)}</span>
              </div>
            )}
            
            {/* Tax / VAT Toggle & Visibility */}
            {!hideTaxRow && (
              <div className="flex justify-between items-center text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>VAT / Tax:</span>
                  <button
                    type="button"
                    onClick={() => setIsTaxEnabled(!isTaxEnabled)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                      isTaxActive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                    }`}
                    title="Click to enable or disable VAT calculation"
                  >
                    {isTaxActive ? `${baseTaxRate}% Applied` : 'Exempt (0%)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideTaxRow(true)}
                    className="text-[9px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                    title="Hide VAT line completely from POS"
                  >
                    Hide
                  </button>
                </div>
                <span className="font-mono text-slate-200">
                  {isTaxActive ? `+${formatCurrency(taxAmount, currencySymbol)}` : '0৳'}
                </span>
              </div>
            )}

            {hideTaxRow && (
              <div className="flex justify-between items-center text-[10px] text-slate-500 italic">
                <span>VAT / Tax: Hidden (0%)</span>
                <button
                  type="button"
                  onClick={() => {
                    setHideTaxRow(false);
                    setIsTaxEnabled(true);
                  }}
                  className="text-amber-400 hover:underline not-italic font-semibold cursor-pointer"
                >
                  Unhide VAT
                </button>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm font-extrabold text-white">
              <span>Total Payable:</span>
              <span className="text-base font-black text-amber-400 font-mono">
                {formatCurrency(grandTotal, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', label: 'Cash', icon: Coins },
                { id: 'bkash', label: 'bKash', icon: Smartphone },
                { id: 'nagad', label: 'Nagad', icon: Smartphone },
                { id: 'card', label: 'Card / POS', icon: CreditCard },
                { id: 'mobile_banking', label: 'M-Bank', icon: Smartphone },
                { id: 'due', label: 'Due / Credit', icon: Clock }
              ].map(method => {
                const isSelected = selectedPaymentMethod === method.id;
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id as PaymentMethod)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Cash Tender Tender & Change (If Cash Selected) */}
          {selectedPaymentMethod === 'cash' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={`Cash Received (Exact: ${grandTotal})`}
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="flex-1 py-1.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
                {changeAmount > 0 && (
                  <span className="text-xs text-emerald-400 font-bold font-mono shrink-0">
                    Change: {formatCurrency(changeAmount, currencySymbol)}
                  </span>
                )}
              </div>

              {/* Quick Cash Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setPaidAmountInput(grandTotal.toString())}
                  className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-amber-400 border border-slate-700 hover:bg-slate-700 shrink-0"
                >
                  Exact
                </button>
                {[500, 1000, 1500, 2000, 5000].map(val => (
                  <button
                    key={val}
                    onClick={() => handleQuickCash(val)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700 hover:bg-slate-700 shrink-0 font-mono"
                  >
                    {val}৳
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Big Complete Sale Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>Processing Sale...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>COMPLETE ORDER • {formatCurrency(grandTotal, currencySymbol)}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* Item Note Modal */}
      {editingNoteItem !== null && (
        <Modal
          isOpen={true}
          onClose={() => setEditingNoteItem(null)}
          title="Add Kitchen Instructions"
          subtitle={cart[editingNoteItem.index]?.product.name}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <textarea
              rows={3}
              value={editingNoteItem.note}
              onChange={(e) => setEditingNoteItem({ ...editingNoteItem, note: e.target.value })}
              placeholder="e.g., Less spicy, no ice, extra sauce on side..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNoteItem(null)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCart(prev => {
                    const updated = [...prev];
                    updated[editingNoteItem.index].notes = editingNoteItem.note.trim() || undefined;
                    return updated;
                  });
                  setEditingNoteItem(null);
                }}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow"
              >
                Save Note
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Picker / Add Modal */}
      {isCustomerModalOpen && (
        <Modal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          title="Select or Register Customer"
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Search Customer */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by customer name or phone number..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Existing Customers List */}
            <div className="max-h-44 overflow-y-auto space-y-1.5 custom-scrollbar border border-slate-800 rounded-xl p-2 bg-slate-950/40">
              {filteredCustomers.map(cust => (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomer(cust);
                    setIsCustomerModalOpen(false);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-200">{cust.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{cust.phone}</p>
                  </div>
                  {cust.dueAmount > 0 && (
                    <span className="text-[10px] text-rose-400 font-bold">
                      Due: {formatCurrency(cust.dueAmount, currencySymbol)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Form */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Register New Customer
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Phone Number *"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <input
                type="email"
                placeholder="Email Address (Optional)"
                value={newCustomerEmail}
                onChange={(e) => setNewCustomerEmail(e.target.value)}
                className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleAddNewCustomer}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
              >
                Create Customer & Select
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Held Orders Modal */}
      <HoldOrdersModal
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
        heldCarts={heldCarts}
        onRecallCart={handleRecallCart}
        onDeleteHeldCart={(id) => setHeldCarts(prev => prev.filter(h => h.id !== id))}
        settings={settings}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        settings={settings}
        branch={currentBranch}
        onUpdateSettings={updateSettings}
        autoTriggerPrint={settings.autoPrintReceipt || settings.autoPrintKitchenToken || settings.printMode === 'both' || settings.printMode === 'customer_only' || settings.printMode === 'kitchen_only'}
        onNewSale={() => {
          setCart([]);
          searchInputRef.current?.focus();
        }}
      />
    </div>
  );
};
