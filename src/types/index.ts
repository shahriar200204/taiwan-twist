export type UserRole = 'super_admin' | 'branch_admin' | 'cashier';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  password?: string;
  branchId?: string; // Optional for super_admin, required for branch_admin and cashier
  branchName?: string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  pinCode?: string;
  createdAt: string;
}

export type AppUser = UserProfile;

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  managerName?: string;
  managerEmail?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  openingDate?: string;
  taxRate: number; // e.g. 5 for 5%
  enableTax?: boolean;
  receiptFooter?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  slug?: string;
  icon?: string;
  color?: string;
  description?: string;
  productCount?: number;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  displayOrder?: number;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  barcode: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  image: string;
  description?: string;
  isAvailable: boolean;
  minStockAlert: number;
  unit: 'pcs' | 'portion' | 'glass' | 'set' | 'box';
  createdAt: string;
}

export interface BranchInventoryItem {
  id: string; // branchId_productId
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  categoryName: string;
  sellingPrice: number;
  costPrice: number;
  currentStock: number;
  minStockAlert: number;
  unit?: string;
  lastRestockedAt?: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number; // per item discount
  subtotal: number;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'bkash' | 'nagad' | 'mobile_banking' | 'due' | 'bank';
export type PaymentStatus = 'completed' | 'partial' | 'due';
export type SaleStatus = 'completed' | 'refunded' | 'cancelled';

export interface Sale {
  id: string;
  invoiceNumber: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  itemCount: number;
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  totalCost: number; // Total cost price to compute profit
  netProfit: number; // grandTotal (excl. tax) - totalCost
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  changeAmount: number;
  dueAmount: number;
  status: SaleStatus;
  notes?: string;
  createdAt: string;
  timestamp: number; // unix timestamp for easy sorting & filtering
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  totalOrders: number;
  dueAmount: number;
  lastVisit?: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'rent'
  | 'utilities'
  | 'electricity'
  | 'salaries'
  | 'staff_salary'
  | 'transport'
  | 'supplies'
  | 'food_cost'
  | 'maintenance'
  | 'marketing'
  | 'other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  branchId: string;
  branchName: string;
  date: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  addedBy?: string;
  addedByName?: string;
  createdBy?: string;
  createdAt: string;
}

export type TransferStatus = 'pending' | 'completed' | 'cancelled';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  status: TransferStatus;
  createdBy: string;
  createdByName: string;
  notes?: string;
  transferDate: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  role: string;
  branchId?: string;
  branchName?: string;
  timestamp: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  taxNumber?: string;
  currency?: string;
  currencyCode?: string;
  currencySymbol: string;
  defaultTaxRate: number;
  enableTax?: boolean;
  hideTaxOnReceipt?: boolean;
  receiptHeader?: string;
  receiptFooter: string;
  kitchenTokenHeader?: string;
  kitchenTokenFooter?: string;
  autoPrintReceipt?: boolean;
  autoPrintKitchenToken?: boolean;
  printMode?: 'customer_only' | 'kitchen_only' | 'both' | 'manual';
  receiptPaperSize?: '80mm' | '58mm';
  showTaxNumberOnReceipt?: boolean;
  showCustomerInfoOnReceipt?: boolean;
  showCashierOnReceipt?: boolean;
  showBarcodeOnReceipt?: boolean;
  showItemNotesOnReceipt?: boolean;
  showItemNotesOnKitchenToken?: boolean;
  kitchenTokenCopies?: number;
  enabledPaymentMethods?: PaymentMethod[];
  lowStockAlertThreshold?: number;
  allowCashierDiscount?: boolean;
  maxCashierDiscountPercent?: number;
  updatedAt?: string;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  customer?: Customer | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  heldAt: string;
}

export interface BackupSnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO 8601
  epoch: number;
  type: 'daily_snapshot' | 'manual_snapshot';
  salesCount: number;
  inventoryCount: number;
  totalSalesVolume?: number;
  sales: Sale[];
  inventory: BranchInventoryItem[];
  status: 'success' | 'failed';
  triggeredBy: string;
  notes?: string;
  createdAt: string;
}
