import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface DailyStats {
  date: string;
  quantity: number;
  amount: number;
}

interface ProductSalesHistory {
  _id: string;
  dailyStats: DailyStats[];
  totalQuantitySold: number;
  totalAmountSold: number;
  name: string;
  inventory: number;
  price: number;
  category: string;
  unit: string;
  unitSize: number | null;
  averageDailySales: number;
}

interface WarehouseStats {
  overview: {
    _id: null;
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
  };
  categoryStats: Array<{
    categoryId: string;
    categoryName: string;
    productsCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
  topProducts: Array<{
    _id: string;
    name: string;
    price: number;
    unit: string;
    unitSize: number | null;
    inventory: number;
    totalValue: number;
    category: string;
  }>;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    price: number;
    unit: string;
    unitSize: number | null;
    inventory: number;
    totalValue: number;
    category: string;
  }>;
  productSalesHistory: ProductSalesHistory[];
}

export default function WarehouseStatisticsScreen() {
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();

  const fetchStats = async () => {
    try {
      const response = await fetch('http://164.68.110.82:5000/api/statistics/warehouse', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching warehouse stats:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Ma'lumotlarni yuklashda xatolik yuz berdi</Text>
      </View>
    );
  }

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

  const formatUnit = (unit: string, unitSize: number | null) => {
    if (!unitSize) return unit;
    return `${unitSize} ${unit}`;
  };

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
          <Ionicons name="cube-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatNumber(stats?.overview?.totalProducts)}</Text>
          <Text style={styles.cardLabel}>Mahsulotlar</Text>
        </View>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="layers-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatNumber(stats?.overview?.totalQuantity)}</Text>
          <Text style={styles.cardLabel}>Umumiy miqdor</Text>
        </View>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="cash-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatCurrency(stats?.overview?.totalValue)}</Text>
          <Text style={styles.cardLabel}>Umumiy qiymat</Text>
        </View>
      </View>

      {/* Category Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategoriyalar bo'yicha</Text>
        {stats?.categoryStats?.map((category) => (
          <View key={category.categoryId} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category.categoryName}</Text>
              <Text style={styles.categoryValue}>{formatCurrency(category.totalValue)}</Text>
            </View>
            <View style={styles.categoryDetails}>
              <Text style={styles.categoryDetail}>
                Mahsulotlar: {formatNumber(category.productsCount)}
              </Text>
              <Text style={styles.categoryDetail}>
                Miqdor: {formatNumber(category.totalQuantity)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Top Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eng ko'p qolgan mahsulotlar</Text>
        {stats?.topProducts?.map((product) => (
          <View key={product._id} style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
              <Text style={styles.productValue}>{formatCurrency(product.totalValue)}</Text>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productDetail}>
                Miqdor: {formatNumber(product.inventory)} {formatUnit(product.unit, product.unitSize)}
              </Text>
              <Text style={styles.productDetail}>
                Narx: {formatCurrency(product.price)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Low Stock Products */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Kam qolgan mahsulotlar</Text>
        {stats?.lowStockProducts?.map((product) => (
          <View key={product._id} style={[styles.productCard, styles.lowStockCard]}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
              <Text style={[styles.productValue, styles.lowStockValue]}>
                {formatNumber(product.inventory)} {formatUnit(product.unit, product.unitSize)}
              </Text>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productDetail}>
                Narx: {formatCurrency(product.price)}
              </Text>
              <Text style={styles.productDetail}>
                Jami: {formatCurrency(product.totalValue)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sales History */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>Sotuvlar tarixi</Text>
        {stats?.productSalesHistory?.map((product) => (
          <View key={product._id} style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
              <Text style={styles.productValue}>
                {formatNumber(product.totalQuantitySold)} ta
              </Text>
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productDetail}>
                O'rtacha kunlik: {product.averageDailySales.toFixed(1)} ta
              </Text>
              <Text style={styles.productDetail}>
                Jami summa: {formatCurrency(product.totalAmountSold)}
              </Text>
            </View>
          </View>
        ))}
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
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    flexWrap: 'wrap',
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
    width: '31%',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginTop: 8,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  categoryCard: {
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  categoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryDetail: {
    fontSize: 14,
    color: '#666',
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
    borderColor: '#FF3B30',
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
    flex: 1,
    marginRight: 8,
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