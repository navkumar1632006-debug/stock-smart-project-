import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../lib/api/inventoryApi';
import { salesApi } from '../lib/api/salesApi';
import { storeApi } from '../lib/api/storeApi';
import { realtimeApi } from '../lib/api/realtime';
import { Product } from '../types/retail';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface CartItem {
  product: Product;
  quantity: number;
}

export const POSScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSku, setManualSku] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadProducts();

    let unsubscribe: (() => void) | undefined;
    storeApi
      .getCurrentStoreId()
      .then((storeId) => {
        unsubscribe = realtimeApi.subscribeToStoreData(storeId, (_table, _payload) => {
          loadProducts();
        });
      })
      .catch((err) => console.warn('POS realtime warning:', err));

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await inventoryApi.getProducts();
      setProducts(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    if (product.stockLevel <= 0) {
      Alert.alert('Out of Stock', `${product.name} currently has 0 inventory.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockLevel) {
          Alert.alert('Stock Limit', `Cannot exceed available inventory (${product.stockLevel}).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  }

  function handleBarcodeLookup(targetCode?: string) {
    const rawTarget = targetCode !== undefined ? targetCode : manualSku;
    const target = rawTarget.trim().toLowerCase();
    if (!target) return;
    const found = products.find(
      (p) =>
        p.sku.toLowerCase() === target ||
        ((p as any).barcode && (p as any).barcode.toLowerCase() === target)
    );
    if (found) {
      addToCart(found);
      setManualSku('');
    } else {
      Alert.alert('Item Not Found', `No registered product matches Barcode / SKU: "${rawTarget.trim()}"`);
    }
  }

  // StockSmart AI Category-specific GST slab rules matching RetailDashboard.tsx
  const getGstRate = (category: string) => {
    switch (category) {
      case 'Dairy':
      case 'Bakery':
      case 'Staples':
        return 0.05;
      case 'Pharmacy':
        return 0.12;
      case 'Grocery':
        return 0.18;
      case 'Fruits & Vegetables':
        return 0;
      default:
        return 0;
    }
  };

  async function handleCheckout() {
    if (cart.length === 0) return;
    try {
      setProcessing(true);
      for (const item of cart) {
        const itemTotal = item.product.price * item.quantity;
        await salesApi.processSale(item.product.id, item.quantity, itemTotal, 'In-Store');
      }
      Alert.alert(
        'Transaction Complete',
        `Processed ${cart.reduce((s, i) => s + i.quantity, 0)} units. Total: ₹${totalAmount.toFixed(2)}`
      );
      setCart([]);
      loadProducts();
    } catch (e: any) {
      Alert.alert('Checkout Failed', e.message || 'Transaction aborted.');
    } finally {
      setProcessing(false);
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = cart.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity * getGstRate(item.product.category),
    0
  );
  const totalAmount = subtotal + tax;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading POS inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Search & SKU Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748b" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.inputField}
            placeholder="Search catalog by name or SKU..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Barcode / SKU Quick Scan Input */}
      <View style={styles.barcodeRow}>
        <Ionicons name="barcode-outline" size={20} color="#2563eb" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.barcodeInput}
          placeholder="Scan or enter Barcode / SKU..."
          placeholderTextColor="#94a3b8"
          value={manualSku}
          onChangeText={setManualSku}
          onSubmitEditing={() => handleBarcodeLookup()}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.scanAddBtn} onPress={() => handleBarcodeLookup()}>
          <Text style={styles.scanAddBtnText}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cameraScanBtn}
          onPress={() => setScannerVisible(true)}
          accessibilityLabel="Open camera barcode scanner"
        >
          <Ionicons name="camera" size={18} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.cameraScanBtnText}>Camera</Text>
        </TouchableOpacity>
      </View>

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(scannedCode) => handleBarcodeLookup(scannedCode)}
        title="POS Barcode Scanner"
      />

      {/* Product Catalog List */}
      <View style={styles.catalogSection}>
        <Text style={styles.sectionHeader}>Quick Tap Selection</Text>
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          style={styles.productList}
          renderItem={({ item }) => {
            const inCart = cart.find((i) => i.product.id === item.id);
            const isOutOfStock = item.stockLevel <= 0;
            const itemGst = getGstRate(item.category) * 100;
            return (
              <TouchableOpacity
                style={[styles.productCard, isOutOfStock && styles.outOfStockCard]}
                onPress={() => addToCart(item)}
                disabled={isOutOfStock}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.skuText}>
                    SKU: {item.sku} • Stock: {item.stockLevel}
                    {itemGst > 0 ? ` • GST: ${itemGst}%` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
                  {inCart && (
                    <View style={styles.inCartBadge}>
                      <Text style={styles.inCartBadgeText}>{inCart.quantity} in cart</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Cart Summary & Sticky Checkout Drawer */}
      <View style={styles.cartContainer}>
        <View style={styles.cartHeaderRow}>
          <Text style={styles.cartHeader}>Current Order ({cart.length} line items)</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={() => setCart([])}>
              <Text style={styles.clearCartText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {cart.length > 0 && (
          <View style={styles.activeCartItems}>
            {cart.map((item) => (
              <View key={item.product.id} style={styles.cartLine}>
                <Text style={styles.cartLineName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => removeFromCart(item.product.id)}
                  >
                    <Ionicons name="remove" size={14} color="#1e293b" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => addToCart(item.product)}
                  >
                    <Ionicons name="add" size={14} color="#1e293b" />
                  </TouchableOpacity>
                  <Text style={styles.lineTotal}>
                    ₹{(item.product.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Subtotal: ₹{subtotal.toFixed(2)}</Text>
          <Text style={styles.pricingLabel}>GST: ₹{tax.toFixed(2)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, (cart.length === 0 || processing) && styles.disabledBtn]}
          disabled={cart.length === 0 || processing}
          onPress={handleCheckout}
        >
          {processing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Charge ₹{totalAmount.toFixed(2)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  searchRow: {
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  barcodeInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  scanAddBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scanAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  cameraScanBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  catalogSection: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  productList: {
    flex: 1,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  outOfStockCard: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  skuText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  inCartBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  inCartBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
  },
  cartContainer: {
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cartHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  clearCartText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  activeCartItems: {
    maxHeight: 110,
    marginBottom: 8,
  },
  cartLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cartLineName: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    color: '#0f172a',
  },
  lineTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    width: 55,
    textAlign: 'right',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pricingLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16a34a',
  },
  checkoutBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
