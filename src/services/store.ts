import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  onSnapshot 
} from './firebase';
import { 
  Branch, 
  Category, 
  Product, 
  BranchInventoryItem, 
  Sale, 
  Customer, 
  Expense, 
  StockTransfer, 
  AuditLog, 
  BusinessSettings, 
  UserProfile 
} from '../types';
import { 
  INITIAL_BRANCHES, 
  INITIAL_CATEGORIES, 
  INITIAL_PRODUCTS, 
  INITIAL_SETTINGS, 
  INITIAL_CUSTOMERS, 
  INITIAL_EXPENSES, 
  INITIAL_TRANSFERS, 
  DEMO_USERS, 
  generateInitialInventory, 
  generateInitialSales 
} from './demoData';
import { googleSheetsSync } from './googleSheetsSync';

// Local storage backup keys for offline & instant responsiveness
const STORAGE_KEYS = {
  BRANCHES: 'txf_branches_v3',
  PRODUCTS: 'txf_products_v3',
  CATEGORIES: 'txf_categories_v3',
  INVENTORY: 'txf_inventory_v3',
  SALES: 'txf_sales_v3',
  CUSTOMERS: 'txf_customers_v3',
  EXPENSES: 'txf_expenses_v3',
  TRANSFERS: 'txf_transfers_v3',
  SETTINGS: 'txf_settings_v3',
  AUDIT_LOGS: 'txf_audit_logs_v3',
  USERS: 'txf_users_v3',
  SEEDED: 'txf_is_seeded_v3'
};

// Helper for local storage
function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

class StoreService {
  private isInitialized = false;

  // Initialize Store & Seed Firestore with realistic data if empty
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check local seed marker
      const isLocalSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);

      if (!isLocalSeeded) {
        // Initialize local cache first for instant UI response
        setLocal(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
        setLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
        setLocal(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
        setLocal(STORAGE_KEYS.INVENTORY, generateInitialInventory());
        setLocal(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
        setLocal(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
        setLocal(STORAGE_KEYS.TRANSFERS, INITIAL_TRANSFERS);
        setLocal(STORAGE_KEYS.SALES, generateInitialSales());
        setLocal(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
        setLocal(STORAGE_KEYS.USERS, DEMO_USERS);
        setLocal(STORAGE_KEYS.AUDIT_LOGS, [
          {
            id: 'log-01',
            action: 'SYSTEM_INITIALIZATION',
            details: 'Taiwan X Foodex Smart POS system initialized with multi-branch database.',
            performedBy: 'user-super-admin',
            performedByName: 'Shahriar Hossain',
            role: 'super_admin',
            timestamp: new Date().toISOString()
          }
        ]);
        localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
      }

      // Sync with Firestore asynchronously in background
      this.syncSeedToFirestore().catch(err => {
        console.warn('Firestore background seed notice:', err.message || err);
      });

      this.isInitialized = true;
    } catch (err) {
      console.error('Store initialize error:', err);
      this.isInitialized = true;
    }
  }

  // Seed Firestore if remote collections are empty
  private async syncSeedToFirestore() {
    try {
      const branchesRef = collection(db, 'branches');
      const branchSnap = await getDocs(branchesRef);

      if (branchSnap.empty) {
        console.log('Seeding Firestore with Taiwan X Foodex initial data...');
        const batch = writeBatch(db);

        // Seed Branches
        INITIAL_BRANCHES.forEach(b => {
          batch.set(doc(db, 'branches', b.id), b);
        });

        // Seed Categories
        INITIAL_CATEGORIES.forEach(c => {
          batch.set(doc(db, 'categories', c.id), c);
        });

        // Seed Products
        INITIAL_PRODUCTS.forEach(p => {
          batch.set(doc(db, 'products', p.id), p);
        });

        // Seed Settings
        batch.set(doc(db, 'settings', 'global'), INITIAL_SETTINGS);

        // Seed Users
        DEMO_USERS.forEach(u => {
          batch.set(doc(db, 'users', u.id), u);
        });

        // Seed Customers
        INITIAL_CUSTOMERS.forEach(c => {
          batch.set(doc(db, 'customers', c.id), c);
        });

        // Seed Inventory
        const inventory = generateInitialInventory();
        inventory.forEach(inv => {
          batch.set(doc(db, 'inventory', inv.id), inv);
        });

        // Seed Expenses
        INITIAL_EXPENSES.forEach(exp => {
          batch.set(doc(db, 'expenses', exp.id), exp);
        });

        // Seed Stock Transfers
        INITIAL_TRANSFERS.forEach(tr => {
          batch.set(doc(db, 'stockTransfers', tr.id), tr);
        });

        // Seed Sales
        const sales = generateInitialSales();
        sales.forEach(s => {
          batch.set(doc(db, 'sales', s.id), s);
        });

        await batch.commit();
        console.log('Firestore seed completed successfully.');
      }
    } catch (e) {
      console.warn('Firestore sync note:', e);
    }
  }

  // Re-seed all demo data
  async resetAndReseed(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.SEEDED);
    localStorage.clear();
    this.isInitialized = false;
    await this.initialize();
  }

  async resetDemoData(): Promise<void> {
    await this.resetAndReseed();
  }

  // ================= BRANCHES =================
  async getBranches(): Promise<Branch[]> {
    try {
      const snap = await getDocs(collection(db, 'branches'));
      if (!snap.empty) {
        const branches = snap.docs.map(d => ({ ...d.data(), id: d.id } as Branch));
        setLocal(STORAGE_KEYS.BRANCHES, branches);
        return branches;
      }
    } catch (e) {
      console.warn('Using local branches:', e);
    }
    return getLocal<Branch[]>(STORAGE_KEYS.BRANCHES, INITIAL_BRANCHES);
  }

  async saveBranch(branch: Branch): Promise<void> {
    const branches = await this.getBranches();
    const idx = branches.findIndex(b => b.id === branch.id);
    if (idx >= 0) {
      branches[idx] = branch;
    } else {
      branches.push(branch);
    }
    setLocal(STORAGE_KEYS.BRANCHES, branches);

    try {
      await setDoc(doc(db, 'branches', branch.id), branch);
    } catch (e) {
      console.warn('Firestore branch write fallback:', e);
    }

    // Auto-create inventory for all products for this branch if new
    if (idx === -1) {
      const products = await this.getProducts();
      const inventory = await this.getInventory();
      for (const prod of products) {
        const invItem: BranchInventoryItem = {
          id: `${branch.id}_${prod.id}`,
          branchId: branch.id,
          branchName: branch.name,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: prod.barcode,
          categoryName: prod.categoryName,
          sellingPrice: prod.sellingPrice,
          costPrice: prod.costPrice,
          currentStock: 30,
          minStockAlert: prod.minStockAlert,
          lastRestockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        inventory.push(invItem);
        try {
          await setDoc(doc(db, 'inventory', invItem.id), invItem);
        } catch {
          // ignore
        }
      }
      setLocal(STORAGE_KEYS.INVENTORY, inventory);
    }

    await this.addAuditLog({
      action: idx >= 0 ? 'UPDATE_BRANCH' : 'CREATE_BRANCH',
      details: `${idx >= 0 ? 'Updated' : 'Created'} branch: ${branch.name} (${branch.code})`,
      performedBy: 'current_user',
      performedByName: 'Admin',
      role: 'super_admin'
    });
  }

  async deleteBranch(branchId: string): Promise<void> {
    const branches = (await this.getBranches()).filter(b => b.id !== branchId);
    setLocal(STORAGE_KEYS.BRANCHES, branches);
    try {
      await deleteDoc(doc(db, 'branches', branchId));
    } catch (e) {
      console.warn('Firestore branch delete fallback:', e);
    }
  }

  // ================= CATEGORIES =================
  async getCategories(): Promise<Category[]> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (!snap.empty) {
        const categories = snap.docs.map(d => ({ ...d.data(), id: d.id } as Category));
        setLocal(STORAGE_KEYS.CATEGORIES, categories);
        return categories;
      }
    } catch (e) {
      console.warn('Using local categories:', e);
    }
    return getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  async saveCategory(category: Category): Promise<void> {
    const categories = await this.getCategories();
    const idx = categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      categories[idx] = category;
    } else {
      categories.push(category);
    }
    setLocal(STORAGE_KEYS.CATEGORIES, categories);

    try {
      await setDoc(doc(db, 'categories', category.id), category);
    } catch (e) {
      console.warn('Firestore category write fallback:', e);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const categories = (await this.getCategories()).filter(c => c.id !== categoryId);
    setLocal(STORAGE_KEYS.CATEGORIES, categories);
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (e) {
      console.warn('Firestore category delete fallback:', e);
    }
  }

  // ================= PRODUCTS =================
  async getProducts(): Promise<Product[]> {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const products = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
        setLocal(STORAGE_KEYS.PRODUCTS, products);
        return products;
      }
    } catch (e) {
      console.warn('Using local products:', e);
    }
    return getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  async saveProduct(product: Product, initialStockPerBranch = 30): Promise<void> {
    const products = await this.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    const isNew = idx === -1;

    if (isNew) {
      products.push(product);
    } else {
      products[idx] = product;
    }
    setLocal(STORAGE_KEYS.PRODUCTS, products);

    try {
      await setDoc(doc(db, 'products', product.id), product);
    } catch (e) {
      console.warn('Firestore product write fallback:', e);
    }

    // Sync branch inventory records for this product
    const branches = await this.getBranches();
    const inventory = await this.getInventory();

    branches.forEach(branch => {
      const invId = `${branch.id}_${product.id}`;
      const existingInv = inventory.find(i => i.id === invId);
      if (existingInv) {
        existingInv.productName = product.name;
        existingInv.sku = product.sku;
        existingInv.barcode = product.barcode;
        existingInv.categoryName = product.categoryName;
        existingInv.sellingPrice = product.sellingPrice;
        existingInv.costPrice = product.costPrice;
        existingInv.minStockAlert = product.minStockAlert;
        existingInv.updatedAt = new Date().toISOString();
      } else {
        const newInv: BranchInventoryItem = {
          id: invId,
          branchId: branch.id,
          branchName: branch.name,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          categoryName: product.categoryName,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          currentStock: initialStockPerBranch,
          minStockAlert: product.minStockAlert,
          lastRestockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        inventory.push(newInv);
      }
    });

    setLocal(STORAGE_KEYS.INVENTORY, inventory);

    await this.addAuditLog({
      action: isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
      details: `${isNew ? 'Added new' : 'Updated'} product: ${product.name} (SKU: ${product.sku})`,
      performedBy: 'current_user',
      performedByName: 'Admin',
      role: 'super_admin'
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    const products = (await this.getProducts()).filter(p => p.id !== productId);
    setLocal(STORAGE_KEYS.PRODUCTS, products);

    const inventory = (await this.getInventory()).filter(i => i.productId !== productId);
    setLocal(STORAGE_KEYS.INVENTORY, inventory);

    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (e) {
      console.warn('Firestore product delete fallback:', e);
    }
  }

  // ================= INVENTORY =================
  async getInventory(branchId?: string): Promise<BranchInventoryItem[]> {
    let items: BranchInventoryItem[] = [];
    try {
      const snap = await getDocs(collection(db, 'inventory'));
      if (!snap.empty) {
        items = snap.docs.map(d => ({ ...d.data(), id: d.id } as BranchInventoryItem));
        setLocal(STORAGE_KEYS.INVENTORY, items);
      } else {
        items = getLocal<BranchInventoryItem[]>(STORAGE_KEYS.INVENTORY, generateInitialInventory());
      }
    } catch {
      items = getLocal<BranchInventoryItem[]>(STORAGE_KEYS.INVENTORY, generateInitialInventory());
    }

    if (branchId) {
      return items.filter(i => i.branchId === branchId);
    }
    return items;
  }

  async adjustStock(
    branchId: string, 
    productId: string, 
    adjustmentType: 'add' | 'reduce' | 'set', 
    quantity: number, 
    reason: string,
    performedBy = 'Admin'
  ): Promise<BranchInventoryItem | null> {
    const inventory = await this.getInventory();
    const invId = `${branchId}_${productId}`;
    let item = inventory.find(i => i.id === invId);

    if (!item) {
      const product = (await this.getProducts()).find(p => p.id === productId);
      const branch = (await this.getBranches()).find(b => b.id === branchId);
      if (!product || !branch) return null;

      item = {
        id: invId,
        branchId: branch.id,
        branchName: branch.name,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        categoryName: product.categoryName,
        sellingPrice: product.sellingPrice,
        costPrice: product.costPrice,
        currentStock: 0,
        minStockAlert: product.minStockAlert,
        updatedAt: new Date().toISOString()
      };
      inventory.push(item);
    }

    const previousStock = item.currentStock;
    if (adjustmentType === 'add') {
      item.currentStock += quantity;
      item.lastRestockedAt = new Date().toISOString();
    } else if (adjustmentType === 'reduce') {
      item.currentStock = Math.max(0, item.currentStock - quantity);
    } else if (adjustmentType === 'set') {
      item.currentStock = Math.max(0, quantity);
    }
    item.updatedAt = new Date().toISOString();

    setLocal(STORAGE_KEYS.INVENTORY, inventory);

    try {
      await setDoc(doc(db, 'inventory', item.id), item);
    } catch (e) {
      console.warn('Firestore stock update fallback:', e);
    }

    await this.addAuditLog({
      action: 'STOCK_ADJUSTMENT',
      details: `Stock for "${item.productName}" in ${item.branchName} adjusted from ${previousStock} to ${item.currentStock} (${adjustmentType} ${quantity}). Reason: ${reason}`,
      performedBy,
      performedByName: performedBy,
      role: 'staff',
      branchId
    });

    return item;
  }

  async updateInventoryStock(inventoryId: string, newStock: number): Promise<void> {
    const inventory = await this.getInventory();
    const item = inventory.find(i => i.id === inventoryId);
    if (item) {
      item.currentStock = Math.max(0, newStock);
      item.updatedAt = new Date().toISOString();
      setLocal(STORAGE_KEYS.INVENTORY, inventory);
      try {
        await setDoc(doc(db, 'inventory', item.id), item);
      } catch (e) {
        console.warn('Firestore stock update fallback:', e);
      }
    }
  }

  // ================= SALES & POS CHECKOUT =================
  async getSales(branchId?: string): Promise<Sale[]> {
    let sales: Sale[] = [];
    try {
      const snap = await getDocs(collection(db, 'sales'));
      if (!snap.empty) {
        sales = snap.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
        setLocal(STORAGE_KEYS.SALES, sales);
      } else {
        sales = getLocal<Sale[]>(STORAGE_KEYS.SALES, generateInitialSales());
      }
    } catch {
      sales = getLocal<Sale[]>(STORAGE_KEYS.SALES, generateInitialSales());
    }

    // Sort by timestamp descending
    sales.sort((a, b) => b.timestamp - a.timestamp);

    if (branchId) {
      return sales.filter(s => s.branchId === branchId);
    }
    return sales;
  }

  async processSale(sale: Sale): Promise<Sale> {
    // 1. Save Sale to Local Storage & Firestore
    const sales = await this.getSales();
    sales.unshift(sale);
    setLocal(STORAGE_KEYS.SALES, sales);

    try {
      await setDoc(doc(db, 'sales', sale.id), sale);
    } catch (e) {
      console.warn('Firestore sale write fallback:', e);
    }

    // 2. Reduce Inventory for the Branch atomically
    const inventory = await this.getInventory();
    for (const item of sale.items) {
      const invId = `${sale.branchId}_${item.productId}`;
      const invItem = inventory.find(i => i.id === invId);
      if (invItem) {
        invItem.currentStock = Math.max(0, invItem.currentStock - item.quantity);
        invItem.updatedAt = new Date().toISOString();
        try {
          await setDoc(doc(db, 'inventory', invItem.id), invItem);
        } catch {
          // ignore
        }
      }
    }
    setLocal(STORAGE_KEYS.INVENTORY, inventory);

    // 3. Update Customer records if customer attached
    if (sale.customerId) {
      const customers = await this.getCustomers();
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        customer.totalPurchases += sale.grandTotal;
        customer.totalOrders += 1;
        if (sale.dueAmount > 0) {
          customer.dueAmount += sale.dueAmount;
        }
        customer.lastVisit = sale.createdAt;
        setLocal(STORAGE_KEYS.CUSTOMERS, customers);
        try {
          await setDoc(doc(db, 'customers', customer.id), customer);
        } catch {
          // ignore
        }
      }
    }

    // 4. Record Audit Log
    await this.addAuditLog({
      action: 'NEW_SALE',
      details: `Completed invoice #${sale.invoiceNumber} for ${sale.grandTotal} ৳ by ${sale.cashierName} via ${sale.paymentMethod}`,
      performedBy: sale.cashierId,
      performedByName: sale.cashierName,
      role: 'cashier',
      branchId: sale.branchId,
      branchName: sale.branchName
    });

    // 5. Trigger live Google Sheets sync in background if configured
    googleSheetsSync.syncSale(sale).catch(e => console.warn('Background Sheets sync:', e));

    return sale;
  }

  async refundSale(saleId: string, reason = 'Customer requested refund'): Promise<void> {
    await this.refundOrCancelSale(saleId, 'refunded', reason, 'Admin');
  }

  async refundOrCancelSale(saleId: string, action: 'refunded' | 'cancelled', reason: string, performedBy: string): Promise<void> {
    const sales = await this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    sale.status = action;
    setLocal(STORAGE_KEYS.SALES, sales);

    try {
      await updateDoc(doc(db, 'sales', saleId), { status: action });
    } catch (e) {
      console.warn('Firestore refund fallback:', e);
    }

    // Return stock to branch
    const inventory = await this.getInventory();
    for (const item of sale.items) {
      const invId = `${sale.branchId}_${item.productId}`;
      const invItem = inventory.find(i => i.id === invId);
      if (invItem) {
        invItem.currentStock += item.quantity;
        invItem.updatedAt = new Date().toISOString();
        try {
          await setDoc(doc(db, 'inventory', invItem.id), invItem);
        } catch {
          // ignore
        }
      }
    }
    setLocal(STORAGE_KEYS.INVENTORY, inventory);

    await this.addAuditLog({
      action: action === 'refunded' ? 'SALE_REFUND' : 'SALE_CANCEL',
      details: `${action.toUpperCase()} invoice #${sale.invoiceNumber}. Reason: ${reason}`,
      performedBy,
      performedByName: performedBy,
      role: 'admin',
      branchId: sale.branchId
    });
  }

  // ================= CUSTOMERS =================
  async getCustomers(): Promise<Customer[]> {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      if (!snap.empty) {
        const customers = snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer));
        setLocal(STORAGE_KEYS.CUSTOMERS, customers);
        return customers;
      }
    } catch (e) {
      console.warn('Using local customers:', e);
    }
    return getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  async saveCustomer(customer: Customer): Promise<void> {
    const customers = await this.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = customer;
    } else {
      customers.push(customer);
    }
    setLocal(STORAGE_KEYS.CUSTOMERS, customers);

    try {
      await setDoc(doc(db, 'customers', customer.id), customer);
    } catch (e) {
      console.warn('Firestore customer write fallback:', e);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const customers = (await this.getCustomers()).filter(c => c.id !== customerId);
    setLocal(STORAGE_KEYS.CUSTOMERS, customers);
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (e) {
      console.warn('Firestore customer delete fallback:', e);
    }
  }

  // ================= EXPENSES =================
  async getExpenses(branchId?: string): Promise<Expense[]> {
    let expenses: Expense[] = [];
    try {
      const snap = await getDocs(collection(db, 'expenses'));
      if (!snap.empty) {
        expenses = snap.docs.map(d => ({ ...d.data(), id: d.id } as Expense));
        setLocal(STORAGE_KEYS.EXPENSES, expenses);
      } else {
        expenses = getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
      }
    } catch {
      expenses = getLocal<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    }

    expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (branchId) {
      return expenses.filter(e => e.branchId === branchId);
    }
    return expenses;
  }

  async saveExpense(expense: Expense): Promise<void> {
    const expenses = await this.getExpenses();
    const idx = expenses.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      expenses[idx] = expense;
    } else {
      expenses.unshift(expense);
    }
    setLocal(STORAGE_KEYS.EXPENSES, expenses);

    try {
      await setDoc(doc(db, 'expenses', expense.id), expense);
    } catch (e) {
      console.warn('Firestore expense write fallback:', e);
    }

    await this.addAuditLog({
      action: 'ADD_EXPENSE',
      details: `Added expense "${expense.title}" of ${expense.amount} ৳ (${expense.category}) for ${expense.branchName}`,
      performedBy: expense.addedBy,
      performedByName: expense.addedByName,
      role: 'admin',
      branchId: expense.branchId
    });

    // Trigger live Google Sheets sync
    googleSheetsSync.syncExpense(expense).catch(e => console.warn('Background Sheets expense sync:', e));
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const expenses = (await this.getExpenses()).filter(e => e.id !== expenseId);
    setLocal(STORAGE_KEYS.EXPENSES, expenses);
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (e) {
      console.warn('Firestore expense delete fallback:', e);
    }
  }

  // ================= STOCK TRANSFERS =================
  async getStockTransfers(): Promise<StockTransfer[]> {
    let transfers: StockTransfer[] = [];
    try {
      const snap = await getDocs(collection(db, 'stockTransfers'));
      if (!snap.empty) {
        transfers = snap.docs.map(d => ({ ...d.data(), id: d.id } as StockTransfer));
        setLocal(STORAGE_KEYS.TRANSFERS, transfers);
      } else {
        transfers = getLocal<StockTransfer[]>(STORAGE_KEYS.TRANSFERS, INITIAL_TRANSFERS);
      }
    } catch {
      transfers = getLocal<StockTransfer[]>(STORAGE_KEYS.TRANSFERS, INITIAL_TRANSFERS);
    }
    transfers.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
    return transfers;
  }

  async createStockTransfer(transfer: StockTransfer): Promise<void> {
    const transfers = await this.getStockTransfers();
    transfers.unshift(transfer);
    setLocal(STORAGE_KEYS.TRANSFERS, transfers);

    try {
      await setDoc(doc(db, 'stockTransfers', transfer.id), transfer);
    } catch (e) {
      console.warn('Firestore transfer write fallback:', e);
    }

    // If auto-completed, perform stock movement immediately
    if (transfer.status === 'completed') {
      await this.executeTransferStockMovement(transfer);
    }

    await this.addAuditLog({
      action: 'STOCK_TRANSFER_CREATED',
      details: `Created transfer #${transfer.transferNumber}: ${transfer.quantity}x ${transfer.productName} from ${transfer.sourceBranchName} to ${transfer.destinationBranchName}`,
      performedBy: transfer.createdBy,
      performedByName: transfer.createdByName,
      role: 'super_admin'
    });
  }

  async completeStockTransfer(transferId: string, performedByName: string): Promise<void> {
    const transfers = await this.getStockTransfers();
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer || transfer.status !== 'pending') return;

    transfer.status = 'completed';
    transfer.completedAt = new Date().toISOString();
    setLocal(STORAGE_KEYS.TRANSFERS, transfers);

    try {
      await setDoc(doc(db, 'stockTransfers', transfer.id), transfer);
    } catch (e) {
      console.warn('Firestore transfer update fallback:', e);
    }

    await this.executeTransferStockMovement(transfer);

    await this.addAuditLog({
      action: 'STOCK_TRANSFER_COMPLETED',
      details: `Completed transfer #${transfer.transferNumber} by ${performedByName}`,
      performedBy: 'current_user',
      performedByName,
      role: 'super_admin'
    });
  }

  private async executeTransferStockMovement(transfer: StockTransfer): Promise<void> {
    const inventory = await this.getInventory();
    
    // Reduce from source
    const sourceInvId = `${transfer.sourceBranchId}_${transfer.productId}`;
    const sourceItem = inventory.find(i => i.id === sourceInvId);
    if (sourceItem) {
      sourceItem.currentStock = Math.max(0, sourceItem.currentStock - transfer.quantity);
      sourceItem.updatedAt = new Date().toISOString();
      try {
        await setDoc(doc(db, 'inventory', sourceItem.id), sourceItem);
      } catch {
        // ignore
      }
    }

    // Increase in destination
    const destInvId = `${transfer.destinationBranchId}_${transfer.productId}`;
    let destItem = inventory.find(i => i.id === destInvId);
    if (destItem) {
      destItem.currentStock += transfer.quantity;
      destItem.lastRestockedAt = new Date().toISOString();
      destItem.updatedAt = new Date().toISOString();
    } else {
      const product = (await this.getProducts()).find(p => p.id === transfer.productId);
      if (product) {
        destItem = {
          id: destInvId,
          branchId: transfer.destinationBranchId,
          branchName: transfer.destinationBranchName,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          categoryName: product.categoryName,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          currentStock: transfer.quantity,
          minStockAlert: product.minStockAlert,
          lastRestockedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        inventory.push(destItem);
      }
    }

    if (destItem) {
      try {
        await setDoc(doc(db, 'inventory', destItem.id), destItem);
      } catch {
        // ignore
      }
    }

    setLocal(STORAGE_KEYS.INVENTORY, inventory);
  }

  // ================= USERS =================
  async getUsers(): Promise<UserProfile[]> {
    let users: UserProfile[] = [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        users = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      }
    } catch (e) {
      console.warn('Using local users:', e);
    }
    if (!users || users.length === 0) {
      users = getLocal<UserProfile[]>(STORAGE_KEYS.USERS, DEMO_USERS);
    }

    // Ensure master super admin is always present and active
    const adminEmail = 'shahriar2002hossain@gmail.com';
    const hasAdmin = users.some(u => u.email.toLowerCase() === adminEmail.toLowerCase());
    if (!hasAdmin) {
      const defaultAdmin: UserProfile = {
        id: 'user-super-admin',
        email: adminEmail,
        displayName: 'Shahriar Hossain',
        role: 'super_admin',
        password: 'Shahriar1122@',
        pinCode: '1122',
        phone: '+880 1711-000001',
        status: 'active',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      users.unshift(defaultAdmin);
    }

    setLocal(STORAGE_KEYS.USERS, users);
    return users;
  }

  async saveUser(user: UserProfile): Promise<void> {
    const users = await this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    setLocal(STORAGE_KEYS.USERS, users);

    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (e) {
      console.warn('Firestore user write fallback:', e);
    }

    await this.addAuditLog({
      action: idx >= 0 ? 'UPDATE_USER' : 'CREATE_USER',
      details: `${idx >= 0 ? 'Updated' : 'Created'} user ${user.displayName} with role ${user.role}`,
      performedBy: 'current_user',
      performedByName: 'Admin',
      role: 'super_admin'
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const users = (await this.getUsers()).filter(u => u.id !== userId);
    setLocal(STORAGE_KEYS.USERS, users);
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      console.warn('Firestore user delete fallback:', e);
    }
  }

  // ================= SETTINGS =================
  async getSettings(): Promise<BusinessSettings> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'global'));
      if (snap.exists()) {
        const settings = snap.data() as BusinessSettings;
        setLocal(STORAGE_KEYS.SETTINGS, settings);
        return settings;
      }
    } catch (e) {
      console.warn('Using local settings:', e);
    }
    return getLocal<BusinessSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  async saveSettings(settings: BusinessSettings): Promise<void> {
    setLocal(STORAGE_KEYS.SETTINGS, settings);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
    } catch (e) {
      console.warn('Firestore settings write fallback:', e);
    }

    await this.addAuditLog({
      action: 'UPDATE_SETTINGS',
      details: 'Updated global business configurations and POS parameters',
      performedBy: 'current_user',
      performedByName: 'Super Admin',
      role: 'super_admin'
    });
  }

  // ================= AUDIT LOGS =================
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'auditLogs'));
      if (!snap.empty) {
        const logs = snap.docs.map(d => ({ ...d.data(), id: d.id } as AuditLog));
        setLocal(STORAGE_KEYS.AUDIT_LOGS, logs);
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (e) {
      console.warn('Using local audit logs:', e);
    }
    const localLogs = getLocal<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return localLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    const logs = getLocal<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop(); // Keep top 200
    setLocal(STORAGE_KEYS.AUDIT_LOGS, logs);

    try {
      await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
    } catch {
      // ignore
    }
  }
}

export const store = new StoreService();
