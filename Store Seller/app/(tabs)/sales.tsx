import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from "react";

// Helper function to handle Decimal128 values from MongoDB
const parseDecimal = (value: number | { $numberDecimal: string }): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  return 0;
};
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';

interface Product {
  productId: {
    _id: string;
    name: string;
    price: number | { $numberDecimal: string };
    unit: string;
    unitSize: number;
    category?: {
      _id: string;
      name: string;
    };
  };
  name: string;
  price: number | { $numberDecimal: string };
  unit: string;
  unitSize: number;
  quantity: number | { $numberDecimal: string };
  _id: string;
}

interface Seller {
  _id: string;
  name: string;
  username: string;
  status: string;
}

interface RestoredProduct {
  id: string;
  name: string;
  restoredQuantity: number | { $numberDecimal: string };
  newInventory: number | { $numberDecimal: string };
}

interface Order {
  _id: string;
  orderId: number;
  seller: Seller;
  products: Product[];
  totalSum: number | { $numberDecimal: string };
  status: 'completed' | 'pending' | 'cancelled';
  paymentMethod: 'cash' | 'card';
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

interface Pagination {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

interface CancelModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
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
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Ha",
  cancelText = "Yo'q",
  loading = false
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

export default function SalesScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: 10
  });

  // Date filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

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

  useEffect(() => {
    loadOrders();
  }, [pagination.currentPage, startDate, endDate]);

  const loadOrders = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      let url = `http://164.68.110.82:5000/api/order-history?page=${pagination.currentPage}&limit=${pagination.perPage}`;
      
      if (startDate && endDate) {
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setOrders(data.data.orders);
        setPagination(data.data.pagination);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: 'Buyurtmalar olishda xatolik',
        });
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      Toast.show({
        type: 'error',
        text1: 'Xato',
        text2: 'Serverga ulanishda xatolik yuz berdi',
      });
    } finally {
      setLoading(false);
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const renderDateFilters = () => (
    <View style={styles.dateFilterContainer}>
      <View style={styles.dateFiltersRow}>
        <View style={styles.datePickerWrapper}>
          <Text style={styles.dateLabel}>Boshlanish:</Text>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {startDate ? startDate.toLocaleDateString('uz-UZ') : 'Tanlang'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.datePickerWrapper}>
          <Text style={styles.dateLabel}>Tugash:</Text>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {endDate ? endDate.toLocaleDateString('uz-UZ') : 'Tanlang'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          maximumDate={endDate}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          minimumDate={startDate}
        />
      )}
    </View>
  );

  const showConfirmation = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => {
    setConfirmModalConfig(config);
    setShowConfirmModal(true);
  };

  const handleCancelSale = (saleId: string) => {
    showConfirmation({
      title: "Buyurtmani bekor qilish",
      message: "Ushbu buyurtmani bekor qilishni xohlaysizmi?",
      onConfirm: () => {
        setSelectedSaleId(saleId);
        setShowCancelModal(true);
        setShowConfirmModal(false);
      }
    });
  };

  const confirmCancelSale = async () => {
    if (!selectedSaleId) return;
    
    setCancelLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`http://164.68.110.82:5000/api/order-history/${selectedSaleId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelReason.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        
        if (response.status === 404) {
          throw new Error('Buyurtma topilmadi');
        } else if (response.status === 403) {
          throw new Error('Buyurtmani bekor qilish huquqi yo\'q');
        } else if (response.status === 400) {
          throw new Error('Buyurtma allaqachon bekor qilingan');
        } else {
          throw new Error('Serverda xatolik yuz berdi');
        }
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === selectedSaleId
              ? {
                  ...order,
                  ...data.data.order
                }
              : order
          )
        );
        
        const restoredInfo = data.data.restoredProducts
          .map((p: RestoredProduct) => `${p.name}: +${p.restoredQuantity}`)
          .join('\n');
        
        Toast.show({
          type: 'success',
          text1: 'Buyurtma bekor qilindi',
          text2: `Qaytarilgan mahsulotlar:\n${restoredInfo}`,
          visibilityTime: 4000,
        });
        
        setShowCancelModal(false);
        setSelectedSaleId(null);
        setCancelReason('');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: data.message || "Buyurtmani bekor qilishda xatolik yuz berdi",
        });
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (error instanceof Error) {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: error.message,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Xato',
          text2: 'Serverda xatolik yuz berdi',
        });
      }
      // Close the modal even on error
      setShowCancelModal(false);
      setSelectedSaleId(null);
      setCancelReason('');
    } finally {
      setCancelLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadOrders().finally(() => {
      setRefreshing(false);
      Toast.show({
        type: 'info',
        text1: 'Yangilandi',
        text2: 'Ma\'lumotlar yangilandi',
        visibilityTime: 2000,
      });
    });
  }, []);

  interface CancelModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    reason: string;
    onReasonChange: (text: string) => void;
  }

  const CancelModal: React.FC<CancelModalProps> = React.memo(({ 
    visible, 
    onClose, 
    onConfirm, 
    loading, 
    reason, 
    onReasonChange 
  }) => {
    // Local state to handle input
    const [inputValue, setInputValue] = React.useState(reason);

    // Update local state when prop changes
    React.useEffect(() => {
      setInputValue(reason);
    }, [reason]);

    const handleConfirm = () => {
      onReasonChange(inputValue);
      onConfirm();
    };

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay} onStartShouldSetResponder={() => true}>
          <View style={styles.cancelModalContent}>
            <Text style={styles.cancelModalTitle}>Buyurtmani bekor qilish</Text>
            
            <View style={styles.cancelReasonContainer}>
              <Text style={styles.cancelReasonLabel}>Bekor qilish sababi:</Text>
              <TextInput
                style={styles.cancelReasonInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Ixtiyoriy"
                multiline
                numberOfLines={3}
                maxLength={200}
                autoFocus
              />
            </View>

            <View style={styles.cancelModalButtons}>
              <TouchableOpacity
                style={[styles.cancelModalButton, styles.cancelModalButtonCancel]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.cancelModalButtonText, { color: '#666' }]}>Yo'q</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.cancelModalButton, 
                  styles.cancelModalButtonConfirm,
                  loading && styles.disabledButton
                ]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.cancelModalButtonText}>Ha</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  });

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setShowModal(true);
      }}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>#{item.orderId}</Text>
          {item.products.length > 1 && (
            <Text style={styles.productCount}>
              {item.products.length} ta mahsulot
            </Text>
          )}
        </View>
        <Text style={styles.orderDate}>
          {new Date(item.createdAt).toLocaleString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          })}
        </Text>
      </View>

      <View style={styles.productsPreview}>
        {item.products.map((product, index) => {
          const quantity = parseDecimal(product.quantity);
          const price = parseDecimal(product.price);
          const total = quantity * price;
          
          return (
            <View key={product._id} style={styles.productItem}>
              <Text style={styles.productPreview} numberOfLines={1}>
                {quantity} x {product.name} ({price.toLocaleString()} so'm) - {total.toLocaleString()} so'm
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderTotal}>
          {parseDecimal(item.totalSum).toLocaleString()} so'm
        </Text>
        <View style={styles.orderMeta}>
          <Text style={[
            styles.orderStatus,
            { 
              color: item.status === 'completed' ? '#4CAF50' : 
                     item.status === 'cancelled' ? '#FF3B30' : '#FFC107'
            }
          ]}>
            {item.status === 'completed' ? 'Yakunlangan' : 
             item.status === 'cancelled' ? 'Bekor qilingan' : 'Kutilmoqda'}
          </Text>
          {item.status === 'completed' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelSale(item._id)}
            >
              <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = 1;
    let endPage = pagination.pages;

    if (pagination.pages > maxVisiblePages) {
      const leftOffset = Math.floor(maxVisiblePages / 2);
      const rightOffset = maxVisiblePages - leftOffset - 1;

      if (pagination.currentPage <= leftOffset) {
        // Near the start
        endPage = maxVisiblePages;
      } else if (pagination.currentPage >= pagination.pages - rightOffset) {
        // Near the end
        startPage = pagination.pages - maxVisiblePages + 1;
      } else {
        // Middle
        startPage = pagination.currentPage - leftOffset;
        endPage = pagination.currentPage + rightOffset;
      }
    }

    // Add first page button
    if (startPage > 1) {
      pageNumbers.push(
        <TouchableOpacity
          key="1"
          style={[styles.pageButton]}
          onPress={() => setPagination(prev => ({ ...prev, currentPage: 1 }))}
          disabled={loading}
        >
          <Text style={styles.pageButtonText}>1</Text>
        </TouchableOpacity>
      );
      if (startPage > 2) {
        pageNumbers.push(
          <Text key="leftEllipsis" style={styles.ellipsis}>...</Text>
        );
      }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.pageButton,
            i === pagination.currentPage && styles.activePageButton
          ]}
          onPress={() => {
            if (i !== pagination.currentPage && !loading) {
              setPagination(prev => ({ ...prev, currentPage: i }));
            }
          }}
          disabled={loading || i === pagination.currentPage}
        >
          <Text style={[
            styles.pageButtonText,
            i === pagination.currentPage && styles.activePageButtonText
          ]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    // Add last page button
    if (endPage < pagination.pages) {
      if (endPage < pagination.pages - 1) {
        pageNumbers.push(
          <Text key="rightEllipsis" style={styles.ellipsis}>...</Text>
        );
      }
      pageNumbers.push(
        <TouchableOpacity
          key={pagination.pages}
          style={[styles.pageButton]}
          onPress={() => setPagination(prev => ({ ...prev, currentPage: pagination.pages }))}
          disabled={loading}
        >
          <Text style={styles.pageButtonText}>{pagination.pages}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, pagination.currentPage === 1 && styles.disabledPageButton]}
          onPress={() => {
            if (pagination.currentPage > 1 && !loading) {
              setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
            }
          }}
          disabled={pagination.currentPage === 1 || loading}
        >
          <Ionicons name="chevron-back" size={20} color={pagination.currentPage === 1 ? "#999" : "#333"} />
        </TouchableOpacity>

        {pageNumbers}

        <TouchableOpacity
          style={[styles.pageButton, pagination.currentPage === pagination.pages && styles.disabledPageButton]}
          onPress={() => {
            if (pagination.currentPage < pagination.pages && !loading) {
              setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
            }
          }}
          disabled={pagination.currentPage === pagination.pages || loading}
        >
          <Ionicons name="chevron-forward" size={20} color={pagination.currentPage === pagination.pages ? "#999" : "#333"} />
        </TouchableOpacity>
      </View>
    );
  };

  const handleCancelModalClose = React.useCallback(() => {
    setShowCancelModal(false);
    setSelectedSaleId(null);
    setCancelReason('');
  }, []);

  const handleCancelReasonChange = React.useCallback((text: string) => {
    setCancelReason(text);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sotuvlar tarixi</Text>
      </View>

      {renderDateFilters()}

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Sotuvlar mavjud emas</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <>
            {loading && !refreshing && (
              <ActivityIndicator style={styles.loader} color="#007AFF" />
            )}
            {renderPagination()}
          </>
        )}
      />

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buyurtma #{selectedOrder?.orderId}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>Sotuvchi</Text>
                <Text style={styles.sellerName}>{selectedOrder?.seller.name}</Text>
                <Text style={styles.sellerUsername}>@{selectedOrder?.seller.username}</Text>
              </View>

              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>Mahsulotlar</Text>
                {selectedOrder?.products.map((product, index) => (
                  <View key={index} style={styles.productItem}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.productDetails}>
                      <Text style={styles.productQuantity}>
                      {parseDecimal(product.quantity)} {product.unit}
                    </Text>
                    <Text style={styles.productPrice}>
                      {parseDecimal(product.price).toLocaleString()} so'm
                    </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.orderDetailSection}>
                <Text style={styles.sectionTitle}>To'lov ma'lumotlari</Text>
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Sana:</Text>
                    <Text style={styles.paymentValue}>
                      {selectedOrder?.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('uz-UZ') : ''}
                    </Text>
                  </View>
                  <View style={[styles.paymentRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Jami:</Text>
                    <Text style={styles.totalAmount}>
                      {selectedOrder?.totalSum.toLocaleString()} so'm
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CancelModal 
        visible={showCancelModal}
        onClose={handleCancelModalClose}
        onConfirm={confirmCancelSale}
        loading={cancelLoading}
        reason={cancelReason}
        onReasonChange={handleCancelReasonChange}
      />
      
      <ConfirmationModal
        visible={showConfirmModal}
        {...confirmModalConfig}
        onCancel={() => setShowConfirmModal(false)}
        loading={loading}
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
  contentContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  datePickerWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 0,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  productCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  productsPreview: {
    marginVertical: 8,
  },
  productPreview: {
    fontSize: 14,
    color: '#666',
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalScroll: {
    maxHeight: '80%',
  },
  orderDetailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sellerName: {
    fontSize: 17,
    color: '#333',
    marginBottom: 4,
  },
  sellerUsername: {
    fontSize: 14,
    color: '#666',
  },
  productItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  paymentDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  pageButton: {
    minWidth: 35,
    height: 35,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activePageButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  disabledPageButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#eee',
  },
  pageButtonText: {
    fontSize: 14,
    color: '#333',
  },
  activePageButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  ellipsis: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 8,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  cancelModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  cancelModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelModalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  cancelModalButtonConfirm: {
    backgroundColor: '#FF3B30',
  },
  cancelModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelReasonContainer: {
    marginBottom: 20,
  },
  cancelReasonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cancelReasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
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
});