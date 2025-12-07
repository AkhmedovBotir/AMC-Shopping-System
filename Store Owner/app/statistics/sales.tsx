import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { format, subDays } from 'date-fns';
import { uz } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SalesStats {
  overview: {
    _id: string | null;
    totalSales: number;
    totalAmount: number;
  };
  dailySales: Array<{
    _id: string;
    date: string;
    salesCount: number;
    totalAmount: number;
  }>;
  topSellingProducts: Array<{
    _id: string;
    productName: string;
    totalQuantity: number;
    totalAmount: number;
  }>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function SalesStatisticsScreen() {
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  });
  
  const { token } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://164.68.110.82:5000/api/statistics/sales?startDate=${format(dateRange.startDate, 'yyyy-MM-dd')}&endDate=${format(dateRange.endDate, 'yyyy-MM-dd')}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('API Response:', responseData); // Debug log
      
      // Validate and sanitize the response data
      if (!responseData || !responseData.data) {
        throw new Error('No data received from server');
      }
      
      const { data } = responseData;
      
      // Process the data to ensure it matches our expected format
      const parseDecimal = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'object' && value.$numberDecimal) {
          return parseFloat(value.$numberDecimal) || 0;
        }
        return parseFloat(value) || 0;
      };

      const processedData = {
        overview: {
          _id: data.overview?._id || null,
          totalSales: data.overview?.totalSales || 0,
          totalAmount: parseDecimal(data.overview?.totalAmount)
        },
        dailySales: (data.dailySales || []).map((sale: any) => ({
          _id: sale?._id || '',
          date: sale?._id || '', // Using _id as date since it contains the date string
          salesCount: sale?.salesCount || 0,
          totalAmount: parseDecimal(sale?.totalAmount)
        })),
        topSellingProducts: (data.topSellingProducts || []).map((product: any) => ({
          _id: product?._id || '',
          productName: product?.productName || 'Noma\'lum mahsulot',
          totalQuantity: parseDecimal(product?.totalQuantity),
          totalAmount: parseDecimal(product?.totalAmount)
        }))
      };
      
      console.log('Processed Data:', processedData); // Debug log
      setStats(processedData);
      
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Set default empty state on error
      setStats({
        overview: { _id: null, totalSales: 0, totalAmount: 0 },
        dailySales: [],
        topSellingProducts: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateRange.startDate;
    setShowStartDatePicker(false);
    if (currentDate > dateRange.endDate) {
      setDateRange({
        startDate: currentDate,
        endDate: currentDate,
      });
    } else {
      setDateRange(prev => ({
        ...prev,
        startDate: currentDate,
      }));
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateRange.endDate;
    setShowEndDatePicker(false);
    if (currentDate < dateRange.startDate) {
      setDateRange({
        startDate: currentDate,
        endDate: currentDate,
      });
    } else {
      setDateRange(prev => ({
        ...prev,
        endDate: currentDate,
      }));
    }
  };

  const formatNumber = (num: number | { $numberDecimal: string } | string | undefined | null): string => {
    try {
      if (num === undefined || num === null) return '0';
      
      // Handle object with $numberDecimal
      if (typeof num === 'object' && num !== null && '$numberDecimal' in num) {
        const value = parseFloat(num.$numberDecimal);
        return isNaN(value) ? '0' : value.toLocaleString('uz-UZ');
      }
      
      // Handle string input
      if (typeof num === 'string') {
        const value = parseFloat(num);
        return isNaN(value) ? '0' : value.toLocaleString('uz-UZ');
      }
      
      // Handle number input
      return num.toLocaleString('uz-UZ');
      
    } catch (error) {
      console.error('Error formatting number:', error, { num });
      return '0';
    }
  };

  const formatCurrency = (input: any): string => {
    try {
      // Handle null or undefined input
      if (input === null || input === undefined) return '0 UZS';
      
      // Handle object with $numberDecimal
      if (typeof input === 'object' && input !== null && '$numberDecimal' in input) {
        const num = parseFloat(input.$numberDecimal);
        return isNaN(num) ? '0 UZS' : num.toLocaleString('uz-UZ') + ' UZS';
      }
      
      // Handle string input
      if (typeof input === 'string') {
        const num = parseFloat(input);
        return isNaN(num) ? '0 UZS' : num.toLocaleString('uz-UZ') + ' UZS';
      }
      
      // Handle number input
      if (typeof input === 'number') {
        return input.toLocaleString('uz-UZ') + ' UZS';
      }
      
      // Default fallback
      return '0 UZS';
      
    } catch (error) {
      console.error('Error formatting currency:', error, { input });
      return '0 UZS';
    }
  };

  const parseNumber = (num: number | { $numberDecimal: string } | string | undefined | null): number => {
    try {
      if (num === undefined || num === null) return 0;
      
      // Handle object with $numberDecimal
      if (typeof num === 'object' && num !== null && '$numberDecimal' in num) {
        return parseFloat(num.$numberDecimal) || 0;
      }
      
      // Handle string input
      if (typeof num === 'string') {
        return parseFloat(num) || 0;
      }
      
      // Handle number input
      return num;
      
    } catch (error) {
      console.error('Error parsing number:', error, { num });
      return 0;
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd.MM.yyyy', { locale: uz });
  };

  if (loading && !refreshing) {
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

  // Ensure all required properties have default values
  const safeStats = {
    overview: {
      _id: stats?.overview?._id || null,
      totalSales: stats?.overview?.totalSales || 0,
      totalAmount: typeof stats?.overview?.totalAmount === 'object' && stats?.overview?.totalAmount?.$numberDecimal 
        ? parseFloat(stats.overview.totalAmount.$numberDecimal) 
        : stats?.overview?.totalAmount || 0
    },
    dailySales: (stats?.dailySales || []).map(sale => ({
      _id: sale?._id || '',
      salesCount: sale?.salesCount || 0,
      totalAmount: typeof sale?.totalAmount === 'object' && sale?.totalAmount?.$numberDecimal 
        ? parseFloat(sale.totalAmount.$numberDecimal) 
        : sale?.totalAmount || 0
    })),
    topSellingProducts: (stats?.topSellingProducts || []).map(product => ({
      _id: product?._id || '',
      productName: product?.productName || 'Noma\'lum mahsulot',
      totalQuantity: typeof product?.totalQuantity === 'object' && product?.totalQuantity?.$numberDecimal 
        ? parseFloat(product.totalQuantity.$numberDecimal) 
        : product?.totalQuantity || 0,
      totalAmount: typeof product?.totalAmount === 'object' && product?.totalAmount?.$numberDecimal 
        ? parseFloat(product.totalAmount.$numberDecimal) 
        : product?.totalAmount || 0
    }))
  };

  // Prepare chart data with error handling
  const chartData = {
    labels: (safeStats.dailySales || []).map(item => 
      item?._id ? format(new Date(item._id), 'dd.MM') : ''
    ).filter(Boolean),
    datasets: [
      {
        data: (safeStats.dailySales || []).map(item => {
          try {
            return parseNumber(item?.totalAmount || 0);
          } catch (error) {
            console.error('Error parsing chart data:', error);
            return 0;
          }
        }),
        color: (opacity = 1) => `rgba(45, 27, 105, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(45, 27, 105, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2D1B69',
    },
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D1B69']} />
      }
    >
      {/* Date Range Picker */}
      <View style={styles.dateRangeContainer}>
        <TouchableOpacity 
          style={styles.dateInput}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#2D1B69" />
          <Text style={styles.dateText}>
            {formatDate(dateRange.startDate)}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.dateSeparator}>dan</Text>
        
        <TouchableOpacity 
          style={styles.dateInput}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#2D1B69" />
          <Text style={styles.dateText}>
            {formatDate(dateRange.endDate)}
          </Text>
        </TouchableOpacity>
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={dateRange.startDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          maximumDate={dateRange.endDate}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={dateRange.endDate}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          minimumDate={dateRange.startDate}
          maximumDate={new Date()}
        />
      )}
      {/* Overview Cards */}
      <View style={styles.overviewContainer}>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="cart-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatNumber(safeStats.overview.totalSales)}</Text>
          <Text style={styles.cardLabel}>Jami sotuvlar</Text>
        </View>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="cash-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatCurrency(safeStats.overview.totalAmount)}</Text>
          <Text style={styles.cardLabel}>Jami summa</Text>
        </View>
      </View>

      {/* Sales Chart */}
      {safeStats.dailySales.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savdo grafigi</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              withInnerLines={false}
              withOuterLines={false}
              fromZero
            />
          </View>
        </View>
      )}

      {/* Daily Sales */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kunlik savdolar</Text>
          <Text style={styles.sectionSubtitle}>
            Jami: {formatNumber(safeStats.overview.totalSales)} ta savdo
          </Text>
        </View>
        {safeStats.dailySales.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>Ushbu davrda savdolar mavjud emas</Text>
          </View>
        ) : (
          <View style={styles.dailySalesContainer}>
            {safeStats.dailySales.map((sale) => (
              <View key={sale._id} style={styles.dailySaleCard}>
                <View style={styles.dailySaleDate}>
                  <Text style={styles.dailySaleDateText}>
                    {format(new Date(sale._id), 'dd MMMM', { locale: uz })}
                  </Text>
                  <Text style={styles.dailySaleDayText}>
                    {format(new Date(sale._id), 'EEEE', { locale: uz })}
                  </Text>
                </View>
                <View style={styles.dailySaleStats}>
                  <Text style={styles.dailySaleCount}>{sale.salesCount} ta savdo</Text>
                  <Text style={styles.dailySaleAmount}>
                    {formatCurrency(sale.totalAmount)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top Selling Products */}
      <View style={[styles.section, styles.lastSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Eng ko'p sotilgan mahsulotlar</Text>
          <Text style={styles.sectionSubtitle}>
            Jami: {formatCurrency(safeStats.overview.totalAmount)}
          </Text>
        </View>
        
        {safeStats.topSellingProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>Sotilgan mahsulotlar mavjud emas</Text>
          </View>
        ) : (
          safeStats.topSellingProducts.map((product, index) => (
            <View 
              key={product._id} 
              style={[
                styles.productCard,
                index === 0 && styles.topProductCard
              ]}
            >
              <View style={styles.productHeader}>
                <View style={styles.productNameContainer}>
                  {index === 0 && (
                    <View style={styles.bestSellerBadge}>
                      <Ionicons name="trophy" size={14} color="#F59E0B" />
                    </View>
                  )}
                  <Text 
                    style={[
                      styles.productName,
                      index === 0 && styles.topProductName
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {product.productName}
                  </Text>
                </View>
                <Text style={styles.productValue}>
                  {formatCurrency(product.totalAmount)}
                </Text>
              </View>
              <View style={styles.productDetails}>
                <Text style={styles.productDetail}>
                  Sotilgan: {formatNumber(product.totalQuantity)} dona
                </Text>
                {index === 0 && (
                  <View style={styles.bestSellerLabel}>
                    <Text style={styles.bestSellerText}>Eng yaxshi sotuvchi</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  // Base container
  // Base container
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  
  // Overview section
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 16,
  },
  overviewCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
  },
  
  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginVertical: 8,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // Sections
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 10,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 14,
  },
  
  // Date range picker
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  dateText: {
    marginLeft: 8,
    color: '#1F2937',
    fontWeight: '500',
  },
  dateSeparator: {
    color: '#6B7280',
    marginHorizontal: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  dailySalesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dailySaleCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dailySaleDate: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailySaleDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dailySaleDayText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  dailySaleStats: {
    flex: 1,
    justifyContent: 'center',
  },
  dailySaleCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dailySaleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  topProductCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  productNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bestSellerBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 4,
    marginRight: 8,
  },
  topProductName: {
    color: '#1F2937',
    fontWeight: '600',
  },
  bestSellerLabel: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bestSellerText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '600',
  },

  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2D1B69',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  productValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetail: {
    fontSize: 14,
    color: '#6B7280',
  },

  lastSection: {
    marginBottom: 24,
  },
});