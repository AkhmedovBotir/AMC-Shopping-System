import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface MonthlyStats {
  totalSales: number;
  totalAmount: number;
  weeklyStats: Array<{
    week: number;
    salesCount: number;
    totalAmount: number;
  }>;
  paymentMethods: {
    [key: string]: number;
  };
  topProducts: Array<{
    _id: string;
    name: string;
    totalQuantity: number;
    totalAmount: number;
  }>;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    price: number;
    inventory: number;
    category: string;
  }>;
  productSalesHistory: Array<{
    _id: string;
    name: string;
    weeklyStats: Array<{
      week: number;
      quantity: number;
      amount: number;
    }>;
    totalQuantity: number;
    totalAmount: number;
  }>;
}

export default function MonthlyStatisticsScreen() {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();

  const fetchStats = async () => {
    try {
      const response = await fetch('http://164.68.110.82:5000/api/statistics/monthly', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('uz-UZ');
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0 UZS';
    return amount.toLocaleString('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatWeek = (week: number) => {
    return `${week}-hafta`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D1B69" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>Ma'lumotlarni yuklashda xatolik yuz berdi</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D1B69']} />
      }
    >
      {/* Overview Cards */}
      <View style={styles.overviewContainer}>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="cart-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatNumber(stats.totalSales)}</Text>
          <Text style={styles.cardLabel}>Oylik sotuvlar</Text>
        </View>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="cash-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatCurrency(stats.totalAmount)}</Text>
          <Text style={styles.cardLabel}>Oylik summa</Text>
        </View>
      </View>

      {/* Weekly Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Haftalik sotuvlar</Text>
        {!stats.weeklyStats || stats.weeklyStats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Bu oy hali sotuvlar yo'q</Text>
          </View>
        ) : (
          stats.weeklyStats.map((week, index) => (
            <View key={index} style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <Text style={styles.weekText}>{formatWeek(week.week)}</Text>
                <Text style={styles.weekAmount}>{formatCurrency(week.totalAmount)}</Text>
              </View>
              <View style={styles.weekDetails}>
                <Text style={styles.weekDetail}>
                  Sotuvlar soni: {formatNumber(week.salesCount)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>To'lov usullari</Text>
        {!stats.paymentMethods ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>To'lov usullari mavjud emas</Text>
          </View>
        ) : (
          <View style={styles.paymentMethodsContainer}>
            <View style={[styles.methodCard, { borderLeftColor: '#2D1B69' }]}>
              <Text style={styles.methodName}>Plastik karta</Text>
              <Text style={styles.methodAmount}>{formatCurrency(stats.paymentMethods.card)}</Text>
            </View>
            <View style={[styles.methodCard, { borderLeftColor: '#FF6B6B' }]}>
              <Text style={styles.methodName}>Naqd pul</Text>
              <Text style={styles.methodAmount}>{formatCurrency(stats.paymentMethods.cash)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Low Stock Products */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Kam qolgan mahsulotlar</Text>
        {!stats.lowStockProducts || stats.lowStockProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Kam qolgan mahsulotlar yo'q</Text>
          </View>
        ) : (
          stats.lowStockProducts.map((product) => (
            <View key={product._id} style={[styles.productCard, styles.lowStockCard]}>
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                </View>
                <Text style={[styles.productValue, styles.lowStockValue]}>
                  {formatNumber(product.inventory)} dona
                </Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={styles.productDetail}>
                  Narx: {formatCurrency(product.price)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  overviewCard: {
    width: '48%',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginTop: 8,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weekAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  weekDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDetail: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  methodName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  methodAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lowStockCard: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  lowStockValue: {
    color: '#FF6B6B',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
  },
}); 