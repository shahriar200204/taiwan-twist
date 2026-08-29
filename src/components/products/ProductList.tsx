import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Barcode as BarcodeIcon, 
  Layers, 
  Check, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { store } from '../../services/store';
import { Product, Category, BranchInventoryItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Badge } from '../common/Badge';

export const ProductList: React.FC = () => {
  const { role, settings, activeBranchId, branches } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<BranchInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    barcode: '',
    sku: '',
    costPrice: 150,
    sellingPrice: 280,
    minStockAlert: 15,
    unit: 'portion' as 'portion' | 'pcs' | 'glass' | 'set' | 'box',
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80',
    description: '',
    isAvailable: true
  });

  // Delete Confirmation Dialog
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [pList, cList, iList] = await Promise.all([
      store.getProducts(),
      store.getCategories(),
      store.getInventory(activeBranchId === 'all' ? undefined : activeBranchId)
    ]);
    setProducts(pList);
    setCategories(cList);
    setInventory(iList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId]);

  // Aggregate stock across branch inventory
  const totalStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach(inv => {
      map[inv.productId] = (map[inv.productId] || 0) + inv.currentStock;
    });
    return map;
  }, [inventory]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);

      const stock = totalStockMap[p.id] ?? 0;
      let matchesStock = true;
      if (stockFilter === 'low') matchesStock = stock > 0 && stock <= p.minStockAlert;
      if (stockFilter === 'out') matchesStock = stock <= 0;

      return matchesCat && matchesSearch && matchesStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter, totalStockMap]);

  // Open Modal for Create or Edit
  const handleOpenModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        name: prod.name,
        categoryId: prod.categoryId,
        barcode: prod.barcode,
        sku: prod.sku,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        minStockAlert: prod.minStockAlert,
        unit: prod.unit,
        image: prod.image,
        description: prod.description || '',
        isAvailable: prod.isAvailable
      });
    } else {
      setEditingProduct(null);
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setFormData({
        name: '',
        categoryId: categories[0]?.id || '',
        barcode: `893450${randNum}`,
        sku: `TXF-ITM-${randNum}`,
        costPrice: 120,
        sellingPrice: 250,
        minStockAlert: 15,
        unit: 'portion',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80',
        description: '',
        isAvailable: true
      });
    }
    setIsModalOpen(true);
  };

  // Generate random Barcode / SKU helpers
  const handleGenerateBarcode = () => {
    const rand = Math.floor(1000000000 + Math.random() * 9000000000);
    setFormData(prev => ({ ...prev, barcode: rand.toString() }));
  };

  const handleGenerateSku = () => {
    const cat = categories.find(c => c.id === formData.categoryId);
    const prefix = cat ? cat.code.replace('CAT-', '') : 'GEN';
    const rand = Math.floor(100 + Math.random() * 900);
    setFormData(prev => ({ ...prev, sku: `TXF-${prefix}-${rand}` }));
  };

  // Save Product
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Product name is required');
      return;
    }

    const selectedCat = categories.find(c => c.id === formData.categoryId);

    const productToSave: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: formData.name.trim(),
      categoryId: formData.categoryId,
      categoryName: selectedCat?.name || 'General',
      barcode: formData.barcode.trim() || `893450${Math.floor(1000 + Math.random() * 9000)}`,
      sku: formData.sku.trim() || `TXF-SKU-${Math.floor(100 + Math.random() * 900)}`,
      costPrice: Number(formData.costPrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      minStockAlert: Number(formData.minStockAlert) || 10,
      unit: formData.unit,
      image: formData.image.trim() || 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80',
      description: formData.description.trim() || undefined,
      isAvailable: formData.isAvailable,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
    };

    await store.saveProduct(productToSave);
    setIsModalOpen(false);
    await loadData();
  };

  // Delete Product
  const handleConfirmDelete = async () => {
    if (!deleteProductId) return;
    await store.deleteProduct(deleteProductId);
    setDeleteProductId(null);
    await loadData();
  };

  // Preset Taiwan X Foodex image options
  const presetFoodImages = [
    { label: 'XXL Fried Chicken', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80' },
    { label: 'Crispy Basil Chicken', url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=400&q=80' },
    { label: 'Brown Sugar Boba', url: 'https://images.unsplash.com/photo-1558857563-b37cf0a66d0c?auto=format&fit=crop&w=400&q=80' },
    { label: 'Taro Milk Tea', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80' },
    { label: 'Taiwan Pork Gua Bao', url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80' },
    { label: 'Beef Noodle Soup', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80' },
    { label: 'Lu Rou Fan Bento', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' },
    { label: 'Potsticker Dumplings', url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=400&q=80' },
    { label: 'Sweet Potato Fries', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80' }
  ];

  const currencySymbol = settings.currencySymbol || '৳';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-amber-400" />
            <span>Products & Menu Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage global menu items, pricing, SKUs, barcode mappings and stock thresholds
          </p>
        </div>

        {role === 'super_admin' && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, SKU, or barcode..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer hidden sm:block"
          >
            <option value="all">All Stock Status</option>
            <option value="low">⚠️ Low Stock Alerts</option>
            <option value="out">❌ Out of Stock</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-white">{filteredProducts.length}</strong> items
          </span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40">
                <th className="py-3.5 pl-5">Product Info</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Barcode / SKU</th>
                <th className="py-3.5 text-right">Cost Price</th>
                <th className="py-3.5 text-right">Selling Price</th>
                <th className="py-3.5 text-center">Stock Level</th>
                <th className="py-3.5 text-center">Status</th>
                {role === 'super_admin' && (
                  <th className="py-3.5 text-right pr-5">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading products catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const stock = totalStockMap[product.id] ?? 0;
                  const isLow = stock <= product.minStockAlert && stock > 0;
                  const isOut = stock <= 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Product Info */}
                      <td className="py-3 pl-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-slate-100 truncate">{product.name}</p>
                            <p className="text-[10px] text-slate-400 capitalize">Unit: {product.unit}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 text-slate-300 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700/50">
                          {product.categoryName}
                        </span>
                      </td>

                      {/* Barcode & SKU */}
                      <td className="py-3 font-mono text-[11px]">
                        <div className="text-slate-200 font-semibold">{product.sku}</div>
                        <div className="text-slate-500 text-[10px]">{product.barcode}</div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 text-right font-mono text-slate-400">
                        {formatCurrency(product.costPrice, currencySymbol)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 text-right font-mono font-bold text-amber-400">
                        {formatCurrency(product.sellingPrice, currencySymbol)}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                            OUT OF STOCK ({stock})
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[10px]">
                            LOW: {stock} left
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px]">
                            {stock} {product.unit}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 text-center">
                        <Badge variant={product.isAvailable ? 'success' : 'neutral'} dot>
                          {product.isAvailable ? 'Available' : 'Disabled'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      {role === 'super_admin' && (
                        <td className="py-3 text-right pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                              title="Edit Product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteProductId(product.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Menu Item'}
        subtitle="Manage product catalog item details, barcodes and pricing"
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Signature Brown Sugar Boba Fresh Milk"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Portion / Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="portion">Portion</option>
                <option value="glass">Glass / Cup</option>
                <option value="set">Set</option>
                <option value="box">Bento Box</option>
                <option value="pcs">Pieces (Pcs)</option>
              </select>
            </div>

            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[10px] text-amber-400 hover:underline font-bold"
                >
                  Generate SKU
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Barcode */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Barcode (EAN/UPC) *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-amber-400 hover:underline font-bold"
                >
                  Generate Barcode
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Cost Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Selling Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
              />
              <label htmlFor="isAvailable" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Product is active & available for sale in POS
              </label>
            </div>

            {/* Image URL & Quick Preset Gallery */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Product Image URL
              </label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />

              {/* Preset Gallery Picker */}
              <div className="pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Or pick a Taiwan X Foodex preset food photo:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {presetFoodImages.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, image: preset.url })}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        formData.image === preset.url ? 'border-amber-400 scale-105' : 'border-slate-800 hover:border-slate-600'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Item Description (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Crispiness level, seasoning, ingredients..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors"
            >
              {editingProduct ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteProductId !== null}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to permanently remove this product from the global catalog and all branch inventories?"
        confirmText="Delete Product"
        type="danger"
      />
    </div>
  );
};
