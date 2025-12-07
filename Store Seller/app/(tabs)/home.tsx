import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';
import ProductSelector from "../components/ProductSelector";

interface Category {
  _id: string;
  name: string;
}

// Helper function to handle Decimal128 values from MongoDB
const parseDecimal = (value: number | { $numberDecimal: string }): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  return 0;
};

interface Product {
  _id: string;
  name: string;
  category: Category;
  price: number;
  unit: string;
  unitSize: number | null;
  inventory: number | { $numberDecimal: string };
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface DraftOrder {
  _id: string;
  orderId: number;
  products: {
    productId: string;
    name: string;
    quantity: number | { $numberDecimal: string };
    price: number | { $numberDecimal: string };
    unit: string;
    unitSize: number;
  }[];
  totalSum: number | { $numberDecimal: string };
  status: 'draft' | 'completed';
  timestamp: string;
}

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  showPaymentMethod?: boolean;
  selectedPaymentMethod?: 'cash' | 'card';
  onPaymentMethodChange?: (method: 'cash' | 'card') => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Ha",
  cancelText = "Yo'q",
  loading = false,
  showPaymentMethod = false,
  selectedPaymentMethod = 'cash',
  onPaymentMethodChange
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.confirmModalContent}>
        <Text style={styles.confirmModalTitle}>{title}</Text>
        <Text style={styles.confirmModalMessage}>{message}</Text>

        {showPaymentMethod && (
          <View style={styles.paymentMethodContainer}>
            <Text style={styles.paymentMethodTitle}>To'lov turi:</Text>
            <View style={styles.paymentMethodOptions}>
              <TouchableOpacity 
                style={styles.paymentMethodOption}
                onPress={() => onPaymentMethodChange?.('cash')}
              >
                <View style={styles.radioButton}>
                  {selectedPaymentMethod === 'cash' && <View style={styles.radioButtonSelected} />}
                </View>
                <Text style={styles.paymentMethodText}>Naqd</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.paymentMethodOption}
                onPress={() => onPaymentMethodChange?.('card')}
              >
                <View style={styles.radioButton}>
                  {selectedPaymentMethod === 'card' && <View style={styles.radioButtonSelected} />}
                </View>
                <Text style={styles.paymentMethodText}>Plastik</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.confirmModalButtons}>
          <TouchableOpacity
            style={[styles.confirmModalButton, styles.confirmModalButtonCancel]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={[styles.confirmModalButtonText, { color: '#666' }]}>
              {cancelText}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.confirmModalButton, 
              styles.confirmModalButtonConfirm,
              loading && styles.disabledButton
            ]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.confirmModalButtonText}>{confirmText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function HomeScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card'>('cash');

  const scrollViewRef = useRef<ScrollView>(null);

  // Load draft orders when component mounts
  useEffect(() => {
    loadDraftOrders();
  }, []);

  const loadDraftOrders = async () => {
    setLoadingDrafts(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://164.68.110.82:5000/api/draft-orders/drafts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('Draft orders response:', data);
      
      if (response.ok && data.success) {
        setDraftOrders(data.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: data.message || "Saqlangan sotuvlarni yuklashda xatolik",
        });
      }
    } catch (error) {
      console.error('Error loading draft orders:', error);
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: "Serverga ulanishda xatolik yuz berdi",
      });
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleEditDraft = async (draft: DraftOrder) => {
    try {
      const cartItemPromises = draft.products.map(async (product) => {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`http://164.68.110.82:5000/api/products/${product.productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Mahsulot ma\'lumotlarini yuklashda xatolik');
        }

        // Parse the quantity from Decimal128 if needed
        const quantity = typeof product.quantity === 'number' 
          ? product.quantity 
          : parseFloat(product.quantity.$numberDecimal);

        return {
          product: data.data,
          quantity: quantity
        } as CartItem;
      });

      const newCartItems = await Promise.all(cartItemPromises);
      
      setCartItems(newCartItems);
      setEditingDraftId(draft._id);
      
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }

      Toast.show({
        type: 'info',
        text1: 'Tahrirlash',
        text2: 'Saqlangan sotuv tahrirlash uchun yuklandi',
      });
    } catch (error) {
      console.error('Error loading draft for edit:', error);
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: error instanceof Error ? error.message : "Saqlangan sotuvni yuklashda xatolik",
      });
    }
  };

  const handleSaveDraft = async () => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: "Savatchada mahsulot yo'q",
      });
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      const totalSum = cartItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      );

      const draftRequest = {
        products: cartItems.map(item => {
          const { _id, name, price, unit, unitSize } = item.product;
          return {
            productId: _id,
            name,
            quantity: item.quantity,
            price,
            unit,
            unitSize: unitSize || 1
          };
        }),
        totalSum: totalSum
      };

      const url = editingDraftId 
        ? `http://164.68.110.82:5000/api/draft-orders/draft/${editingDraftId}`
        : 'http://164.68.110.82:5000/api/draft-orders/draft';

      const response = await fetch(url, {
        method: editingDraftId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(draftRequest),
      });

      const data = await response.json();
      
      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Muvaffaqiyatli',
          text2: editingDraftId ? "Sotuv yangilandi" : "Sotuv saqlandi",
        });
        setCartItems([]);
        setSelectedProduct(null);
        setQuantity('1');
        setEditingDraftId(null);
        loadDraftOrders();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: data.message || "Sotuvni saqlashda xatolik",
        });
      }
    } catch (error) {
      console.error('Save draft error:', error);
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: "Serverga ulanishda xatolik yuz berdi",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSale = async () => {
    if (cartItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: "Savatchada mahsulot yo'q",
      });
      return;
    }

    showConfirmation({
      title: "Sotuvni tasdiqlash",
      message: "Ushbu sotuvni amalga oshirishni xohlaysizmi?",
      showPaymentMethod: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const token = await AsyncStorage.getItem('token');
          
          const totalSum = cartItems.reduce((sum, item) => 
            sum + (item.product.price * item.quantity), 0
          );

          const saleRequest = {
            products: cartItems.map(item => {
              const { _id, name, price, unit, unitSize } = item.product;
              return {
                productId: _id,
                name,
                quantity: item.quantity,
                price,
                unit,
                unitSize: unitSize || 1
              };
            }),
            totalSum: totalSum,
            paymentMethod: selectedPaymentMethod
          };

          const response = await fetch('http://164.68.110.82:5000/api/order-history/direct-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(saleRequest),
          });

          const data = await response.json();
          
          if (response.ok) {
            Toast.show({
              type: 'success',
              text1: 'Muvaffaqiyatli',
              text2: "Sotuv muvaffaqiyatli amalga oshirildi",
            });
            setCartItems([]);
            setSelectedProduct(null);
            setQuantity('1');
          } else {
            Toast.show({
              type: 'error',
              text1: 'Xato',
              text2: data.message || "Sotuv xatosi",
            });
          }
        } catch (error) {
          console.error('Direct sale error:', error);
          Toast.show({
            type: 'error',
            text1: 'Xato',
            text2: "Serverga ulanishda xatolik yuz berdi",
          });
        } finally {
          setLoading(false);
          setShowConfirmModal(false);
        }
      }
    });
  };

  const handleConfirmDraft = async (draftId: string) => {
    showConfirmation({
      title: "Sotuvni tasdiqlash",
      message: "Ushbu sotuvni tasdiqlashni xohlaysizmi?",
      showPaymentMethod: true,
      onConfirm: async () => {
        setLoadingDrafts(true);
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            throw new Error('Avtorizatsiya tokeni topilmadi');
          }
          
          const response = await fetch(`http://164.68.110.82:5000/api/draft-orders/draft/${draftId}/confirm`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              paymentMethod: selectedPaymentMethod,
              status: 'completed' 
            }),
          });

          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Sotuvni tasdiqlashda xatolik');
          }
          
          if (data.success) {
            Toast.show({
              type: 'success',
              text1: 'Muvaffaqiyatli',
              text2: data.data?.message || "Sotuv muvaffaqiyatli tasdiqlandi",
            });
            // Reload draft orders
            await loadDraftOrders();
          } else {
            throw new Error(data.message || 'Sotuvni tasdiqlashda xatolik');
          }
        } catch (error) {
          console.error('Confirm draft error:', error);
          Toast.show({
            type: 'error',
            text1: 'Xato',
            text2: error instanceof Error ? error.message : "Serverga ulanishda xatolik yuz berdi",
          });
        } finally {
          setLoadingDrafts(false);
          setShowConfirmModal(false);
        }
      }
    });
  };

  const handleDeleteDraft = async (draftId: string, e: any) => {
    e.stopPropagation();
    
    showConfirmation({
      title: "O'chirish",
      message: "Ushbu vaqtinchalik sotuvni o'chirishni xohlaysizmi?",
      onConfirm: async () => {
        setLoadingDrafts(true);
        try {
          const token = await AsyncStorage.getItem('token');
          
          const response = await fetch(`http://164.68.110.82:5000/api/draft-orders/draft/${draftId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Vaqtinchalik sotuv topilmadi');
            } else if (response.status === 403) {
              throw new Error('Vaqtinchalik sotuvni o\'chirish huquqi yo\'q');
            } else {
              throw new Error('Serverda xatolik yuz berdi');
            }
          }

          const data = await response.json();
          
          if (data.success) {
            if (editingDraftId === draftId) {
              setCartItems([]);
              setSelectedProduct(null);
              setQuantity('1');
              setEditingDraftId(null);
            }
            
            setDraftOrders(prev => prev.filter(draft => draft._id !== draftId));
            Toast.show({
              type: 'success',
              text1: 'Muvaffaqiyatli',
              text2: "Vaqtinchalik sotuv o'chirildi",
            });
          } else {
            Toast.show({
              type: 'error',
              text1: 'Xato',
              text2: data.message || "Vaqtinchalik sotuvni o'chirishda xatolik",
            });
          }
        } catch (error) {
          console.error('Delete draft error:', error);
          Toast.show({
            type: 'error',
            text1: 'Xato',
            text2: error instanceof Error ? error.message : "Serverga ulanishda xatolik yuz berdi",
          });
        } finally {
          setLoadingDrafts(false);
          setShowConfirmModal(false);
        }
      }
    });
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: "Noto'g'ri miqdor. Iltimos, musbat son kiriting (masalan: 1.5)",
      });
      return;
    }

    if (quantityNum > parseDecimal(selectedProduct.inventory)) {
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: "Omborda yetarli mahsulot mavjud emas",
      });
      return;
    }

    const existingItemIndex = cartItems.findIndex(item => item.product._id === selectedProduct._id);
    
    if (existingItemIndex !== -1) {
      const newQuantity = cartItems[existingItemIndex].quantity + quantityNum;
      if (newQuantity > parseDecimal(selectedProduct.inventory)) {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: "Omborda yetarli mahsulot mavjud emas",
        });
        return;
      }
      
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex].quantity = newQuantity;
      setCartItems(updatedItems);
    } else {
      setCartItems([...cartItems, { 
        product: selectedProduct,
        quantity: quantityNum 
      }]);
    }

    setSelectedProduct(null);
    setQuantity('1');

    Toast.show({
      type: 'success',
      text1: 'Qo\'shildi',
      text2: 'Mahsulot savatchaga qo\'shildi',
    });
  };

  const removeFromCart = (index: number) => {
    const updatedItems = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedItems);
    Toast.show({
      type: 'info',
      text1: 'O\'chirildi',
      text2: 'Mahsulot savatchadan o\'chirildi',
    });
  };

  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDraftOrders().finally(() => {
      setRefreshing(false);
      Toast.show({
        type: 'info',
        text1: 'Yangilandi',
        text2: 'Ma\'lumotlar yangilandi',
      });
    });
  }, []);

  const showConfirmation = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    showPaymentMethod?: boolean;
  }) => {
    setConfirmModalConfig(config);
    setShowConfirmModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Xush kelibsiz!</Text>
          <Text style={styles.subtitle}>
            {editingDraftId ? "Sotuvni tahrirlash" : "Yangi sotuv qo'shish"}
          </Text>
        </View>
        
        <View style={styles.saleForm} onStartShouldSetResponder={() => true}>
          <TouchableOpacity 
            style={styles.productSelector}
            onPress={() => setShowProductSelector(true)}
          >
            <Text style={styles.selectorLabel}>
              {selectedProduct ? selectedProduct.name : "Mahsulot tanlang"}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>

          {selectedProduct && (
            <>
              <View style={styles.productInfo}>
                <Text style={styles.infoText}>Turi: {selectedProduct.category.name}</Text>
                <Text style={styles.infoText}>
                  Narxi: {selectedProduct.price.toLocaleString()} so'm
                </Text>
                <Text style={styles.infoText}>
                  Qoldiq: {parseDecimal(selectedProduct.inventory)} {selectedProduct.unit}
                  {selectedProduct.unitSize ? ` (${selectedProduct.unitSize} ${selectedProduct.unit})` : ''}
                </Text>
              </View>

              <View style={styles.quantityInput}>
                <Text style={styles.inputLabel}>Miqdori:</Text>
                <TextInput
                  style={styles.input}
                  value={quantity}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    if (/^\d*\.?\d*$/.test(text) || text === '') {
                      setQuantity(text);
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor="#999"
                  editable={!loading}
                  onSubmitEditing={() => {
                    // Prevent form submission when pressing enter
                    return false;
                  }}
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, styles.addButton]}
                onPress={addToCart}
              >
                <Text style={styles.buttonText}>Qo'shish</Text>
              </TouchableOpacity>
            </>
          )}

          {cartItems.length > 0 && (
            <View style={styles.cartSection}>
              <Text style={styles.cartTitle}>Savatcha</Text>
              {cartItems.map((item, index) => (
                <View key={`${item.product._id}-${index}`} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemDetails}>
                      {item.quantity} {item.product.unit} x {item.product.price.toLocaleString()} so'm
                    </Text>
                  </View>
                  <View style={styles.cartItemRight}>
                    <Text style={styles.cartItemTotal}>
                      {(item.quantity * item.product.price).toLocaleString()} so'm
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removeFromCart(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Jami summa:</Text>
                <Text style={styles.totalAmount}>
                  {getTotalAmount().toLocaleString()} so'm
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSaveDraft}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saqlanmoqda...' : 'Vaqtinchalik saqlash'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.directSaleButton, loading && styles.buttonDisabled]}
                onPress={handleDirectSale}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Saqlanmoqda...' : 'To\'g\'ridan-to\'g\'ri sotuv'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Draft Orders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saqlangan sotuvlar</Text>
          
          {loadingDrafts && !refreshing ? (
            <ActivityIndicator style={styles.loader} />
          ) : draftOrders.length > 0 ? (
            draftOrders.map((draft) => (
              <TouchableOpacity
                key={draft._id}
                style={[
                  styles.draftCard,
                  editingDraftId === draft._id && styles.editingDraftCard
                ]}
                onPress={() => handleEditDraft(draft)}
              >
                <View style={styles.draftHeader}>
                  <Text style={styles.draftTitle}>Sotuv #{draft.orderId}</Text>
                  <Text style={styles.draftDate}>
                    {new Date(draft.timestamp).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.draftProducts}>
                  {draft.products.map((product, index) => (
                    <Text key={index} style={styles.draftProduct}>
                      {product.name} - {parseDecimal(product.quantity)} {product.unit} x {parseDecimal(product.price).toLocaleString()} so'm
                    </Text>
                  ))}
                </View>

                <View style={styles.draftFooter}>
                  <Text style={styles.draftTotal}>
                    Jami: {parseDecimal(draft.totalSum).toLocaleString()} so'm
                  </Text>
                  {draft.status === 'draft' && (
                    <View style={styles.draftActions}>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={(e) => handleDeleteDraft(draft._id, e)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.confirmButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleConfirmDraft(draft._id);
                        }}
                      >
                        <Text style={styles.confirmButtonText}>Tasdiqlash</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Saqlangan sotuvlar yo'q</Text>
          )}
        </View>
      </ScrollView>

      <ProductSelector
        visible={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSelect={(product) => {
          setSelectedProduct(product);
          setShowProductSelector(false);
          addToCart();
        }}
      />

      <ConfirmationModal
        visible={showConfirmModal}
        {...confirmModalConfig}
        onCancel={() => setShowConfirmModal(false)}
        loading={loading || loadingDrafts}
        showPaymentMethod={true}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
      />

      <Toast 
        position='bottom'
        bottomOffset={20}
        visibilityTime={3000}
        autoHide={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  saleForm: {
    margin: 20,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  productSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 16,
    color: "#333",
  },
  productInfo: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  quantityInput: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  cartSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  cartItemDetails: {
    fontSize: 14,
    color: "#666",
  },
  cartItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 10,
  },
  removeButton: {
    padding: 5,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: {
    fontSize: 16,
    color: "#333",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "#34C759",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  directSaleButton: {
    backgroundColor: '#34C759',
    marginTop: 10,
  },
  draftCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  draftDate: {
    fontSize: 14,
    color: '#666',
  },
  draftProducts: {
    marginBottom: 10,
  },
  draftProduct: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  draftTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editingDraftCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF1F0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  confirmModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmModalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  confirmModalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  paymentMethodContainer: {
    marginBottom: 20,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  paymentMethodOptions: {
    flexDirection: 'row',
    gap: 20,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 16,
    color: '#333',
  },
});