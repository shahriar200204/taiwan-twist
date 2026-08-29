import { 
  Branch, 
  Category, 
  Product, 
  UserProfile, 
  BusinessSettings, 
  Customer, 
  Expense, 
  Sale, 
  StockTransfer, 
  BranchInventoryItem 
} from '../types';

export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'TAIWAN X FOODEX',
  tagline: 'Authentic Taiwanese Street Food & Boba Franchise',
  logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
  address: 'Plot 45, Road 11, Block D, Banani, Dhaka-1213, Bangladesh',
  phone: '+880 1711-000999',
  email: 'support@taiwanxfoodex.com',
  taxNumber: 'BIN-009842145-0101',
  currency: 'BDT',
  currencyCode: 'BDT',
  currencySymbol: '৳',
  defaultTaxRate: 5,
  enableTax: true,
  hideTaxOnReceipt: false,
  receiptHeader: '*** TAIWAN X FOODEX ***\nAuthentic Taiwanese Street Food & Boba Tea\nVAT Reg / BIN: 009842145-0101 • Mushak-6.3',
  receiptFooter: 'Thank you for choosing TAIWAN X FOODEX!\nHot food & fresh boba served daily.\nFollow us on Facebook/Instagram @taiwanxfoodex.bd',
  kitchenTokenHeader: '*** KITCHEN ORDER TOKEN (KOT) ***\nPREPARATION SLIP',
  kitchenTokenFooter: '*** Serve Hot & Fresh — Taiwan X Foodex ***',
  autoPrintReceipt: true,
  autoPrintKitchenToken: false,
  printMode: 'customer_only',
  receiptPaperSize: '80mm',
  showTaxNumberOnReceipt: true,
  showCustomerInfoOnReceipt: true,
  showCashierOnReceipt: true,
  showBarcodeOnReceipt: true,
  showItemNotesOnReceipt: true,
  showItemNotesOnKitchenToken: true,
  kitchenTokenCopies: 1,
  enabledPaymentMethods: ['cash', 'card', 'bkash', 'nagad', 'mobile_banking', 'due'],
  lowStockAlertThreshold: 15,
  allowCashierDiscount: true,
  maxCashierDiscountPercent: 15,
  updatedAt: new Date().toISOString()
};

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'branch-main',
    name: 'Taiwan X Foodex — Main Branch (Banani)',
    code: 'TXF-01',
    address: 'Plot 45, Road 11, Block D, Banani Commercial Area, Dhaka',
    phone: '+880 1711-100101',
    managerName: 'Tahsin Chowdhury',
    managerEmail: 'manager.banani@taiwanxfoodex.com',
    status: 'active',
    openingDate: '2023-01-15',
    taxRate: 5,
    receiptFooter: 'Main Hub Banani — Hot Food Served Fresh Daily!',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'branch-uttara',
    name: 'Taiwan X Foodex — Uttara Branch',
    code: 'TXF-02',
    address: 'House 14, Gareeb-e-Newaz Avenue, Sector 13, Uttara, Dhaka',
    phone: '+880 1711-100102',
    managerName: 'Arifur Rahman',
    managerEmail: 'manager.uttara@taiwanxfoodex.com',
    status: 'active',
    openingDate: '2023-08-20',
    taxRate: 5,
    receiptFooter: 'Uttara Sector 13 Outlet — Taste the Night Market Vibe!',
    createdAt: '2023-08-20T08:00:00.000Z'
  },
  {
    id: 'branch-dhanmondi',
    name: 'Taiwan X Foodex — Dhanmondi Branch',
    code: 'TXF-03',
    address: 'Level 2, Rangs Fortune Square, Road 2, Dhanmondi, Dhaka',
    phone: '+880 1711-100103',
    managerName: 'Zubair Hossain',
    managerEmail: 'manager.dhanmondi@taiwanxfoodex.com',
    status: 'active',
    openingDate: '2024-02-10',
    taxRate: 5,
    receiptFooter: 'Dhanmondi Food Street Outlet — Fresh Boba on Demand!',
    createdAt: '2024-02-10T08:00:00.000Z'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-chicken',
    name: 'Fried Chicken & Mains',
    code: 'CAT-CHK',
    icon: 'UtensilsCrossed',
    color: '#f97316',
    description: 'Crispy Taiwanese signature battered chicken & mains',
    productCount: 4,
    status: 'active'
  },
  {
    id: 'cat-boba',
    name: 'Boba & Milk Teas',
    code: 'CAT-BOB',
    icon: 'Coffee',
    color: '#d97706',
    description: 'Fresh brewed black teas with brown sugar tapioca pearls',
    productCount: 4,
    status: 'active'
  },
  {
    id: 'cat-noodles-rice',
    name: 'Noodles & Bento Bowls',
    code: 'CAT-NB',
    icon: 'Soup',
    color: '#ea580c',
    description: 'Authentic Lu Rou Fan and spicy beef soup bowls',
    productCount: 3,
    status: 'active'
  },
  {
    id: 'cat-snacks',
    name: 'Night Market Snacks & Bao',
    code: 'CAT-SNK',
    icon: 'Cookie',
    color: '#f59e0b',
    description: 'Bao buns, dumplings, and pepper tofu',
    productCount: 4,
    status: 'active'
  },
  {
    id: 'cat-dessert',
    name: 'Desserts & Refreshers',
    code: 'CAT-DST',
    icon: 'IceCream',
    color: '#fbbf24',
    description: 'Taro ball bowls, sago, and mango desserts',
    productCount: 3,
    status: 'active'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-xxl-chicken',
    name: 'XXL Crispy Taiwan Chicken Cutlet (Spicy)',
    categoryId: 'cat-chicken',
    categoryName: 'Fried Chicken & Mains',
    barcode: '8934500101',
    sku: 'TXF-CHK-001',
    costPrice: 220,
    sellingPrice: 390,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80',
    description: 'Giant butterfly cut chicken breast dusted in 5-spice chili seasoning',
    isAvailable: true,
    minStockAlert: 20,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-popcorn-chicken',
    name: 'Golden Basil Popcorn Chicken (Large)',
    categoryId: 'cat-chicken',
    categoryName: 'Fried Chicken & Mains',
    barcode: '8934500102',
    sku: 'TXF-CHK-002',
    costPrice: 160,
    sellingPrice: 290,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80',
    description: 'Bite-sized crispy tender chicken thigh wok-tossed with fried sweet basil',
    isAvailable: true,
    minStockAlert: 25,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-honey-garlic-wings',
    name: 'Taiwan Honey Glazed Crispy Wings (6 pcs)',
    categoryId: 'cat-chicken',
    categoryName: 'Fried Chicken & Mains',
    barcode: '8934500103',
    sku: 'TXF-CHK-003',
    costPrice: 190,
    sellingPrice: 340,
    image: 'https://images.unsplash.com/photo-1527477321055-436158a2573d?auto=format&fit=crop&w=400&q=80',
    description: 'Sticky caramelized garlic glaze over super crunch wings',
    isAvailable: true,
    minStockAlert: 15,
    unit: 'set',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-crispy-squid',
    name: 'Shilin Deep Fried Giant Squid with Lemon Pepper',
    categoryId: 'cat-chicken',
    categoryName: 'Fried Chicken & Mains',
    barcode: '8934500104',
    sku: 'TXF-CHK-004',
    costPrice: 260,
    sellingPrice: 460,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=400&q=80',
    description: 'Fresh giant calamari tentacle skewers with Taiwan salt and pepper',
    isAvailable: true,
    minStockAlert: 10,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-brown-sugar-boba',
    name: 'Signature Tiger Brown Sugar Boba Fresh Milk',
    categoryId: 'cat-boba',
    categoryName: 'Boba & Milk Teas',
    barcode: '8934500201',
    sku: 'TXF-BOB-001',
    costPrice: 110,
    sellingPrice: 260,
    image: 'https://images.unsplash.com/photo-1558857563-b37cf0a66d0c?auto=format&fit=crop&w=400&q=80',
    description: 'Warm cooked brown sugar pearls with cold organic whole milk & cream mousse',
    isAvailable: true,
    minStockAlert: 30,
    unit: 'glass',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-taro-milk-tea',
    name: 'Royal Taro Pearl Milk Tea',
    categoryId: 'cat-boba',
    categoryName: 'Boba & Milk Teas',
    barcode: '8934500202',
    sku: 'TXF-BOB-002',
    costPrice: 100,
    sellingPrice: 240,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80',
    description: 'Velvety purple taro milk tea infused with chewy tapioca',
    isAvailable: true,
    minStockAlert: 20,
    unit: 'glass',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-roasted-oolong',
    name: 'Roasted Oolong Tea with Sea Salt Cheese Foam',
    categoryId: 'cat-boba',
    categoryName: 'Boba & Milk Teas',
    barcode: '8934500203',
    sku: 'TXF-BOB-003',
    costPrice: 95,
    sellingPrice: 250,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
    description: 'Smoky high-mountain roasted oolong topped with rich salted cream cheese crown',
    isAvailable: true,
    minStockAlert: 15,
    unit: 'glass',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-mango-green-tea',
    name: 'Passion Mango Jasmine Green Tea with Coconut Jelly',
    categoryId: 'cat-boba',
    categoryName: 'Boba & Milk Teas',
    barcode: '8934500204',
    sku: 'TXF-BOB-004',
    costPrice: 90,
    sellingPrice: 230,
    image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=400&q=80',
    description: 'Refreshing fruit tea with real pulp and nata de coco cubes',
    isAvailable: true,
    minStockAlert: 20,
    unit: 'glass',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-lu-rou-fan',
    name: 'Taiwan Braised Minced Pork Bento (Lu Rou Fan)',
    categoryId: 'cat-noodles-rice',
    categoryName: 'Noodles & Bento Bowls',
    barcode: '8934500301',
    sku: 'TXF-NB-001',
    costPrice: 180,
    sellingPrice: 380,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
    description: 'Slow simmered 5-spice pork belly sauce over fragrant jasmine rice with soy egg & pickled mustard greens',
    isAvailable: true,
    minStockAlert: 25,
    unit: 'box',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-beef-noodle',
    name: 'Taipei Rich Braised Beef Shank Noodle Soup',
    categoryId: 'cat-noodles-rice',
    categoryName: 'Noodles & Bento Bowls',
    barcode: '8934500302',
    sku: 'TXF-NB-002',
    costPrice: 240,
    sellingPrice: 480,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80',
    description: 'Handmade knife-cut noodles in 12-hour aromatic bone broth with tender beef shank',
    isAvailable: true,
    minStockAlert: 15,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-chicken-katsu-rice',
    name: 'Crispy Chicken Chop Bento with Curry Sauce',
    categoryId: 'cat-noodles-rice',
    categoryName: 'Noodles & Bento Bowls',
    barcode: '8934500303',
    sku: 'TXF-NB-003',
    costPrice: 200,
    sellingPrice: 420,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80',
    description: 'Sliced chicken cutlet served with golden potato carrot curry and steamed rice',
    isAvailable: true,
    minStockAlert: 20,
    unit: 'box',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-pork-bao',
    name: 'Gua Bao — Taiwanese Pork Belly Buns (2 pcs)',
    categoryId: 'cat-snacks',
    categoryName: 'Night Market Snacks & Bao',
    barcode: '8934500401',
    sku: 'TXF-SNK-001',
    costPrice: 150,
    sellingPrice: 320,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80',
    description: 'Fluffy steamed lotus leaf buns filled with tender braised pork, crushed peanuts & cilantro',
    isAvailable: true,
    minStockAlert: 15,
    unit: 'set',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-pan-dumplings',
    name: 'Crispy Bottom Pork & Scallion Dumplings (6 pcs)',
    categoryId: 'cat-snacks',
    categoryName: 'Night Market Snacks & Bao',
    barcode: '8934500402',
    sku: 'TXF-SNK-002',
    costPrice: 130,
    sellingPrice: 270,
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=400&q=80',
    description: 'Handmade pan-fried potstickers with black vinegar dipping sauce',
    isAvailable: true,
    minStockAlert: 20,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-crispy-tofu',
    name: 'Night Market Salt & Pepper Silken Tofu',
    categoryId: 'cat-snacks',
    categoryName: 'Night Market Snacks & Bao',
    barcode: '8934500403',
    sku: 'TXF-SNK-003',
    costPrice: 90,
    sellingPrice: 190,
    image: 'https://images.unsplash.com/photo-1546069901-d744a8da928e?auto=format&fit=crop&w=400&q=80',
    description: 'Golden crispy exterior with melt-in-your-mouth tender center',
    isAvailable: true,
    minStockAlert: 18,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-sweet-potato-fries',
    name: 'Taiwanese Golden Sweet Potato Fries with Plum Salt',
    categoryId: 'cat-snacks',
    categoryName: 'Night Market Snacks & Bao',
    barcode: '8934500404',
    sku: 'TXF-SNK-004',
    costPrice: 80,
    sellingPrice: 180,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80',
    description: 'Crispy sweet potato strips dusted with tangy sour plum powder',
    isAvailable: true,
    minStockAlert: 25,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-mango-pomelo',
    name: 'Mango Pomelo Sago Delight',
    categoryId: 'cat-dessert',
    categoryName: 'Desserts & Refreshers',
    barcode: '8934500501',
    sku: 'TXF-DST-001',
    costPrice: 110,
    sellingPrice: 280,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
    description: 'Sweet mango puree with chewy sago pearls, pomelo segments & coconut milk',
    isAvailable: true,
    minStockAlert: 15,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  },
  {
    id: 'prod-taro-balls-bowl',
    name: 'Jiufen Taro & Sweet Potato Ball Grass Jelly Bowl',
    categoryId: 'cat-dessert',
    categoryName: 'Desserts & Refreshers',
    barcode: '8934500502',
    sku: 'TXF-DST-002',
    costPrice: 120,
    sellingPrice: 290,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
    description: 'Chewy handmade taro & sweet potato balls over herbal grass jelly and crushed ice',
    isAvailable: true,
    minStockAlert: 12,
    unit: 'portion',
    createdAt: '2023-01-15T08:00:00.000Z'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-super-admin',
    email: 'shahriar2002hossain@gmail.com',
    displayName: 'Shahriar Hossain',
    role: 'super_admin',
    password: 'Shahriar1122@',
    pinCode: '1122',
    phone: '+880 1711-000001',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Helper to generate initial inventory records for all 3 branches
export function generateInitialInventory(): BranchInventoryItem[] {
  const items: BranchInventoryItem[] = [];
  
  INITIAL_BRANCHES.forEach(branch => {
    INITIAL_PRODUCTS.forEach(prod => {
      let baseStock = 40;
      if (branch.id === 'branch-main') baseStock = 50;
      if (branch.id === 'branch-uttara') baseStock = 30;
      if (branch.id === 'branch-dhanmondi') baseStock = 25;

      items.push({
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
        currentStock: baseStock,
        minStockAlert: prod.minStockAlert,
        lastRestockedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  });

  return items;
}

// Clean production initial sales (no fake dummy records)
export function generateInitialSales(): Sale[] {
  return [];
}

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_TRANSFERS: StockTransfer[] = [];

