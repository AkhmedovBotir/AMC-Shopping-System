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
  totalSales: number;
  totalAmount: number;
  hourlyStats: Array<{
    hour: number;
    count: number;
    amount: number;
  }>;
  paymentMethods: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
}

export default function DailyStatisticsScreen() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();

  const fetchStats = async () => {
    try {
      const response = await fetch('http://164.68.110.82:5000/api/statistics/daily', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
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

  const formatNumber = (num: number | undefined | null | { $numberDecimal: string }) => {
    if (num === undefined || num === null) return '0';
    // Handle MongoDB Decimal128 format
    const value = typeof num === 'object' && '$numberDecimal' in num 
      ? parseFloat(num.$numberDecimal) 
      : num;
    return value.toLocaleString('uz-UZ');
  };

  const formatCurrency = (amount: number | undefined | null | { $numberDecimal: string }) => {
    if (amount === undefined || amount === null) return '0 UZS';
    // Handle MongoDB Decimal128 format
    const value = typeof amount === 'object' && '$numberDecimal' in amount
      ? parseFloat(amount.$numberDecimal)
      : amount;
    return value.toLocaleString('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
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
          <Text style={styles.cardLabel}>Bugungi sotuvlar</Text>
        </View>
        <View style={[styles.card, styles.overviewCard]}>
          <Ionicons name="cash-outline" size={32} color="#2D1B69" />
          <Text style={styles.cardValue}>{formatCurrency(stats.totalAmount)}</Text>
          <Text style={styles.cardLabel}>Bugungi summa</Text>
        </View>
      </View>

      {/* Hourly Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soatlik sotuvlar</Text>
        {stats.hourlyStats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Bugun hali sotuvlar yo'q</Text>
          </View>
        ) : (
          stats.hourlyStats.map((hour, index) => (
            <View key={index} style={styles.hourCard}>
              <View style={styles.hourHeader}>
                <Text style={styles.hourTime}>{formatHour(hour.hour)}</Text>
                <Text style={styles.hourAmount}>{formatCurrency(hour.amount)}</Text>
              </View>
              <View style={styles.hourDetails}>
                <Text style={styles.hourDetail}>
                  Sotuvlar soni: {formatNumber(hour.count)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Payment Methods */}
      <View style={[styles.section, styles.lastSection]}>
        <Text style={styles.sectionTitle}>To'lov usullari</Text>
        {Object.keys(stats.paymentMethods).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>To'lovlar mavjud emas</Text>
          </View>
        ) : (
          Object.entries(stats.paymentMethods).map(([method, data], index) => (
            <View key={index} style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <Text style={styles.methodName}>
                  {method === 'cash' ? 'Naqd pul' : method === 'card' ? 'Plastik karta' : method}
                </Text>
                <Text style={styles.methodAmount}>{formatCurrency(data.amount)}</Text>
              </View>
              <View style={styles.methodDetails}>
                <Text style={styles.methodDetail}>
                  Sotuvlar soni: {formatNumber(data.count)}
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
  hourCard: {
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
  hourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hourTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  hourAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  hourDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hourDetail: {
    fontSize: 14,
    color: '#666',
  },
  methodCard: {
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
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  methodAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  methodDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodDetail: {
    fontSize: 14,
    color: '#666',
  },
}); 