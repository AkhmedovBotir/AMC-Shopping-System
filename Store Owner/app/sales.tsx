import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.8;
const BOTTOM_SHEET_MIN_HEIGHT = 0;
const MAX_UPWARD_TRANSLATE_Y = -BOTTOM_SHEET_MAX_HEIGHT;
const MIN_DOWNWARD_TRANSLATE_Y = 0;
const DRAG_THRESHOLD = 50;

interface Product {
  productId: {
    _id: string;
    name: string;
    category?: {
      _id: string;
      name: string;
    };
    price: number | { $numberDecimal: string };
    unit: string;
    unitSize: number;
  };
  _id: string;
  name: string;
  quantity: number | { $numberDecimal: string };
  price: number | { $numberDecimal: string };
  unit: string;
  unitSize: number;
}

interface Seller {
  _id: string;
  name: string;
  username: string;
  status: string;
}

interface Order {
  _id: string;
  orderId: number;
  seller: Seller;
  products: Product[];
  totalSum: number;
  status: 'completed' | 'cancelled' | 'pending';
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
  paymentMethod: 'cash' | 'card';
  updatedAt: string;
  __v: number;
}

interface PaginationData {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

interface OrderResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: PaginationData;
  };
}

interface SingleOrderResponse {
  success: boolean;
  data: Order | null;
  message?: string;
}

// Helper function to safely extract decimal values from MongoDB Decimal128 format
const getDecimalValue = (value: any): number => {
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  return typeof value === 'number' ? value : parseFloat(value) || 0;
};

const formatPrice = (price: any) => {
  const numericPrice = getDecimalValue(price);
  return numericPrice.toLocaleString('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrderDetailsBottomSheet = ({ 
  selectedOrder, 
  onClose 
}: { 
  selectedOrder: Order | null;
  onClose: () => void;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const lastGestureDy = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastGestureDy.current = (animatedValue as any)._value;
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = lastGestureDy.current + gestureState.dy;
        if (newValue <= MIN_DOWNWARD_TRANSLATE_Y && newValue >= MAX_UPWARD_TRANSLATE_Y) {
          animatedValue.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          // Drag down to close
          onClose();
        } else if (gestureState.dy < -DRAG_THRESHOLD) {
          // Drag up to expand
          Animated.spring(animatedValue, {
            toValue: MAX_UPWARD_TRANSLATE_Y,
            useNativeDriver: true,
          }).start();
        } else {
          // Return to previous position
          Animated.spring(animatedValue, {
            toValue: lastGestureDy.current,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  React.useEffect(() => {
    if (selectedOrder) {
      Animated.spring(animatedValue, {
        toValue: MAX_UPWARD_TRANSLATE_Y,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(animatedValue, {
        toValue: MIN_DOWNWARD_TRANSLATE_Y,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedOrder]);

  if (!selectedOrder) return null;

  return (
    <View style={styles.bottomSheetContainer}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: animatedValue }],
          },
        ]}
      >
        <View style={styles.bottomSheetHeader} {...panResponder.panHandlers}>
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.modalTitle}>Buyurtma № {selectedOrder.orderId}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.orderDetails}
          contentContainerStyle={styles.orderDetailsContent}
          showsVerticalScrollIndicator={true}
          bounces={false}
        >
          <Text style={styles.detailsTitle}>Sotuvchi</Text>
          <Text style={styles.detailsText}>{selectedOrder.seller?.name}</Text>

          <Text style={styles.detailsTitle}>To'lov usuli</Text>
          <Text style={styles.detailsText}>
            {selectedOrder.paymentMethod === 'cash' ? 'Naqd' : 'Karta'}
          </Text>

          <Text style={styles.detailsTitle}>Mahsulotlar</Text>
          {selectedOrder.products?.map((product, index) => (
            <View key={index} style={styles.productItemDetails}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productQuantity}>
                {product.quantity} {product.unit} x {formatPrice(product.price)}
              </Text>
              <Text style={styles.productTotal}>
                {formatPrice(product.quantity * product.price)}
              </Text>
            </View>
          ))}

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Jami summa:</Text>
            <Text style={styles.totalAmount}>{formatPrice(selectedOrder.totalSum)}</Text>
          </View>

          <Text style={styles.detailsTitle}>Sana</Text>
          <Text style={styles.detailsText}>
            Yaratilgan: {formatDate(selectedOrder.createdAt)}
            {selectedOrder.completedAt && (
              `\nYakunlangan: ${formatDate(selectedOrder.completedAt)}`
            )}
          </Text>

          <Text style={styles.detailsTitle}>Status</Text>
          <View style={[
            styles.statusTag,
            selectedOrder.status === 'completed' ? styles.completedStatus : 
            selectedOrder.status === 'cancelled' ? styles.cancelledStatus : 
            styles.pendingStatus
          ]}>
            <Text style={[
              styles.statusText,
              selectedOrder.status === 'completed' ? styles.completedStatusText : 
              selectedOrder.status === 'cancelled' ? styles.cancelledStatusText : 
              styles.pendingStatusText
            ]}>
              {selectedOrder.status === 'completed' ? 'Yakunlangan' : 
               selectedOrder.status === 'cancelled' ? 'Bekor qilingan' : 
               'Kutilmoqda'}
            </Text>
          </View>

          {selectedOrder.status === 'cancelled' && selectedOrder.cancelReason && (
            <>
              <Text style={styles.detailsTitle}>Bekor qilish sababi</Text>
              <Text style={styles.detailsText}>{selectedOrder.cancelReason}</Text>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default function SalesScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: 10
  });
  
  // Filter states
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async (page = 1, refresh = false) => {
    try {
      let url = `http://164.68.110.82:5000/api/order-history?page=${page}&limit=${pagination.perPage}`;
      
      if (startDate) {
        url += `&startDate=${startDate.toISOString().split('T')[0]}`;
      }
      if (endDate) {
        url += `&endDate=${endDate.toISOString().split('T')[0]}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data: OrderResponse = await response.json();
      if (data.success) {
        setOrders(page === 1 ? data.data.orders : [...orders, ...data.data.orders]);
        setPagination(data.data.pagination);
      } else {
        Alert.alert('Xato', 'Buyurtmalar ro\'yxatini yuklashda xatolik yuz berdi');
      }
    } catch (error) {
      Alert.alert('Xato', 'Buyurtmalar ro\'yxatini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrderDetails = async (order: Order) => {
    try {
      const response = await fetch(`http://164.68.110.82:5000/api/order-history/admin/orders/${order._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data: SingleOrderResponse = await response.json();

      if (data.success && data.data) {
        setSelectedOrder(data.data);
      } else {
        Alert.alert('Xato', data.message || 'Buyurtma ma\'lumotlarini yuklashda xatolik yuz berdi');
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Xato', 'Buyurtma ma\'lumotlarini yuklashda xatolik yuz berdi');
      setSelectedOrder(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders(1, true);
    }, [startDate, endDate])
  );

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusStyle = {
      'completed': styles.completedOrder,
      'cancelled': styles.cancelledOrder,
      'pending': {}
    }[item.status] || {};
    
    return (
      <TouchableOpacity 
        style={[styles.orderCard, statusStyle]}
        onPress={() => fetchOrderDetails(item)}
      >
      <View style={styles.orderHeader}>
        <View>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderId}>Buyurtma №{item.orderId}</Text>
            <View style={[
              styles.statusBadge,
              item.status === 'completed' && styles.completedBadge,
              item.status === 'cancelled' && styles.cancelledBadge,
            ]}>
              <Text style={styles.statusText}>
                {item.status === 'completed' ? 'Yakunlangan' : 
                 item.status === 'cancelled' ? 'Bekor qilingan' : 'Kutilmoqda'}
              </Text>
            </View>
          </View>
          <Text style={styles.sellerName}>
            <Text style={styles.label}>Sotuvchi: </Text>
            {item.seller?.name || 'Noma\'lum'}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleString('uz-UZ', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Jami:</Text>
          <Text style={styles.orderTotalSum}>{formatPrice(getDecimalValue(item.totalSum))}</Text>
        </View>
      </View>
      
      <View style={styles.productsContainer}>
        {item.products.slice(0, 2).map((product, index) => (
          <View key={index} style={styles.productItemDetails}>
            <Text style={styles.productNameDetails} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.productDetails}>
              <Text style={styles.productQuantity}>
                {getDecimalValue(product.quantity)} {product.unit}
              </Text>
              <Text style={styles.productPrice}>
                {formatPrice(getDecimalValue(product.price) * getDecimalValue(product.quantity))}
              </Text>
            </View>
          </View>
        ))}
        {item.products.length > 2 && (
          <Text style={styles.moreItemsText}>
            + {item.products.length - 2} ta mahsulot ko'proq
          </Text>
        )}
      </View>
      
      <View style={styles.orderFooter}>
        <View style={styles.orderMeta}>
          <Text style={styles.paymentMethod}>
            {item.paymentMethod === 'cash' ? '💵 Naqd' : '💳 Karta'}
          </Text>
          {item.status === 'cancelled' && item.cancelReason && (
            <Text style={styles.cancelReason}>
              <Text style={styles.cancelReasonLabel}>Sabab: </Text>
              {item.cancelReason}
            </Text>
          )}
        </View>
      </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sotuvlar tarixi</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDate(true)}
          >
            <Text style={styles.dateButtonText}>
              {startDate ? startDate.toLocaleDateString() : 'Boshlanish sana'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDate(true)}
          >
            <Text style={styles.dateButtonText}>
              {endDate ? endDate.toLocaleDateString() : 'Tugash sana'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchOrders(1, true);
          }}
          onEndReached={() => {
            if (pagination.currentPage < pagination.pages) {
              fetchOrders(pagination.currentPage + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Buyurtmalar topilmadi</Text>
            </View>
          }
        />
      )}

      <OrderDetailsBottomSheet
        selectedOrder={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />

      {showStartDate && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          onChange={(event, date) => {
            setShowStartDate(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndDate && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          onChange={(event, date) => {
            setShowEndDate(false);
            if (date) setEndDate(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#666',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  completedOrder: {
    borderLeftColor: '#34A853',
  },
  cancelledOrder: {
    borderLeftColor: '#EA4335',
  },
  orderFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  cancelReason: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
  },
  cancelReasonLabel: {
    fontWeight: '500',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
  },
  completedBadge: {
    backgroundColor: '#E6F4EA',
  },
  cancelledBadge: {
    backgroundColor: '#FCE8E6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A73E8',
  },
  statusTextDetails: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A73E8',
  },
  sellerName: {
    fontSize: 14,
    color: '#202124',
    marginBottom: 4,
  },
  label: {
    color: '#5F6368',
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
    color: '#9AA0A6',
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#5F6368',
    marginBottom: 2,
  },
  totalSum: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  orderTotalSum: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  productsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    paddingTop: 12,
  },
  productItem: {
    marginBottom: 8,
  },
  productItemDetails: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 14,
    color: '#202124',
    marginBottom: 2,
  },
  productNameDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productQuantity: {
    fontSize: 13,
    color: '#5F6368',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#202124',
  },
  productPriceDetails: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreItemsText: {
    fontSize: 13,
    color: '#1A73E8',
    textAlign: 'center',
    marginTop: 4,
  },
  completedOrder: {
    borderLeftColor: '#34A853',
  },
  cancelledOrder: {
    borderLeftColor: '#EA4335',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 14,
    color: '#666',
  },

  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#666',
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedStatus: {
    backgroundColor: '#E8F5E9',
  },
  cancelledStatus: {
    backgroundColor: '#FFEBEE',
  },
  pendingStatus: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedStatusText: {
    color: '#4CAF50',
  },
  cancelledStatusText: {
    color: '#D32F2F',
  },
  pendingStatusText: {
    color: '#FF9800',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  bottomSheetContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    width: '100%',
    height: BOTTOM_SHEET_MAX_HEIGHT,
    bottom: -BOTTOM_SHEET_MAX_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  bottomSheetHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  orderDetails: {
    flex: 1,
  },
  orderDetailsContent: {
    padding: 16,
    paddingBottom: 32,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productItemDetails: {
    marginBottom: 12,
  },
  productNameDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cancelReason: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 8,
  },
}); 