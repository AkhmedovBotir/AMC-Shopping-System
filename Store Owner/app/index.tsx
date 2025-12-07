import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

declare module '@react-navigation/native' {
  export function useNavigation<S = any>(): S;
}

// Helper function to handle MongoDB Decimal128 values
const getDecimalValue = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value.$numberDecimal) return parseFloat(value.$numberDecimal);
  return parseFloat(value);
};

interface DashboardStats {
  today: {
    sales: number;
    amount: number;
    products: number;
    profit: {
      total: number;
      cost: number;
      revenue: number;
      margin: number;
    };
    payments: Record<string, any>; // Flexible payments object
  };
  products: {
    total: number;
    quantity: number | { $numberDecimal: string };
    value: number | { $numberDecimal: string };
    lowStock: number;
  };
  sellers: {
    total: number;
    active: number;
  };
  lastWeek: Array<{
    date: string;
    sales: number;
    amount: number;
  }>;
}

interface QuickAction {
  title: string;
  icon: any;
  color: string;
  onPress: () => void;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const auth = useAuth();
  const { token, logout } = auth || { token: null, logout: async () => { /* no-op */ } };
  const fetchDashboardStatsRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fetchDashboardStats = useCallback(async (isRefreshing = false) => {
    if (!token) {
      console.log('No token found, redirecting to login...');
      // You might want to redirect to login here
      return;
    }

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      console.log('Fetching dashboard stats...');
      const response = await fetch('http://164.68.110.82:5000/api/statistics/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      const responseData = await response.json();
      console.log('=== DASHBOARD API RESPONSE ===');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('=== END OF RESPONSE ===');
      
      if (response.status === 401 || (responseData.success === false && responseData.message === "Do'kon topilmadi")) {
        // Token is invalid, expired, or store not found
        console.log('Authentication failed or store not found, logging out...');
        await logout();
        return;
      }
      
      if (!response.ok || !responseData.success) {
        console.error('Failed to fetch dashboard stats:', responseData);
        throw new Error(responseData.message || 'Dashboard ma\'lumotlarini yuklashda xatolik yuz berdi');
      }
      
      setStats(responseData.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // You might want to show an error message to the user here
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardStatsRef.current = fetchDashboardStats;
  }, [fetchDashboardStats]);

  const onRefresh = useCallback(async () => {
    console.log('Pull to refresh triggered');
    await fetchDashboardStats(true);
  }, [fetchDashboardStats]);
  
  // Fetch data on screen focus and when token changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Dashboard screen focused, refreshing data...');
      fetchDashboardStats(true);
    });

    // Initial fetch
    fetchDashboardStats(false);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigation, fetchDashboardStats, token]); // Add token to dependency array

  // Format currency helper
  const formatCurrency = (amount: any) => {
    const value = typeof amount === 'number' ? amount : getDecimalValue(amount);
    return value.toLocaleString('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Format decimal helper
  const formatDecimal = (value: any) => {
    const num = getDecimalValue(value);
    return new Intl.NumberFormat('uz-UZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Quick actions removed as per request

  interface StatCardProps { 
    title: string; 
    value: string | number; 
    subtitle?: string | React.ReactNode;
    icon: any; 
    color: string;
    compact?: boolean;
    footer?: React.ReactNode;
  }

  const StatCard = ({ title, value, subtitle, icon, color, compact, footer }: StatCardProps) => (
    <View style={[
      styles.statCard, 
      compact ? styles.compactCard : {},
      { borderLeftColor: color }
    ]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={compact ? 20 : 24} color={color} />
      </View>
      <View style={[styles.statContent, compact ? styles.compactContent : {}]}>
        <Text style={[
          styles.statValue, 
          compact ? styles.compactValue : {},
          { color: compact ? color : '#000' }
        ]}>
          {value}
        </Text>
        <Text style={[
          styles.statTitle,
          compact ? styles.compactTitle : {}
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[
            styles.statSubtitle,
            compact ? styles.compactSubtitle : {}
          ]}>
            {subtitle}
          </Text>
        )}
        {footer && (
          <View style={styles.cardFooter}>
            {footer}
          </View>
        )}
      </View>
    </View>
  );

  if (loading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProtectedRoute>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        >
          {/* Header with Date */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Boshqaruv paneli</Text>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('uz-UZ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </Text>
          </View>

          {/* Profit Section */}
          <View style={[styles.section, {marginTop: 0}]}>
            <View style={styles.profitSection}>
              <View style={styles.profitHeader}>
                <Ionicons name="trending-up" size={24} color="#FF9500" />
                <Text style={styles.profitTitle}>Bugungi foyda</Text>
                <Text style={styles.profitPercent}>
                  {stats.today.profit.margin.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.profitDetails}>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Jami foyda:</Text>
                  <Text style={[styles.profitValue, {color: '#4CD964', fontSize: 16, fontWeight: 'bold'}]}>
                    {formatCurrency(stats.today.profit.total)}
                  </Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Daromad:</Text>
                  <Text style={[styles.profitValue, {color: '#4CD964'}]}>
                    {formatCurrency(stats.today.profit.revenue)}
                  </Text>
                </View>
                <View style={styles.profitRow}>
                  <Text style={styles.profitLabel}>Xarajat:</Text>
                  <Text style={[styles.profitValue, {color: '#FF3B30'}]}>
                    {formatCurrency(stats.today.profit.cost)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Today's Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bugungi hisobot</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, {borderLeftColor: '#007AFF'}]}>
                <Text style={styles.statValue}>{formatCurrency(stats.today.amount)}</Text>
                <Text style={styles.statLabel}>Jami savdo</Text>
                <Ionicons name="cash-outline" size={24} color="#007AFF" style={styles.statIcon} />
              </View>
              
              <View style={[styles.statCard, {borderLeftColor: '#4CD964'}]}>
                <Text style={styles.statValue}>{stats.today.sales} ta</Text>
                <Text style={styles.statLabel}>Sotuvlar soni</Text>
                <Ionicons name="cart-outline" size={24} color="#4CD964" style={styles.statIcon} />
              </View>

              <View style={[styles.statCard, {borderLeftColor: '#FF9500'}]}>
                <Text style={styles.statValue}>
                  {formatDecimal(stats.today.products)} dona
                </Text>
                <Text style={styles.statLabel}>Sotilgan mahsulot</Text>
                <Ionicons name="cube-outline" size={24} color="#FF9500" style={styles.statIcon} />
              </View>

              {/* Payment Methods */}
              <View style={[styles.statCard, {borderLeftColor: '#5856D6'}]}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
                  <View style={{alignItems: 'center', flex: 1}}>
                    <Ionicons name="wallet-outline" size={20} color="#34C759" />
                    <Text style={styles.paymentLabel}>Naqd</Text>
                    <Text style={styles.paymentValue}>
                      {formatCurrency(stats.today.payments?.cash?.amount || 0)}
                    </Text>
                    <Text style={styles.paymentCount}>
                      {stats.today.payments?.cash?.count || 0} ta
                    </Text>
                  </View>
                  <View style={{width: 1, backgroundColor: '#f0f0f0', marginVertical: 8}} />
                  <View style={{alignItems: 'center', flex: 1}}>
                    <Ionicons name="card-outline" size={20} color="#007AFF" />
                    <Text style={styles.paymentLabel}>Karta</Text>
                    <Text style={styles.paymentValue}>
                      {formatCurrency(stats.today.payments?.card?.amount || 0)}
                    </Text>
                    <Text style={styles.paymentCount}>
                      {stats.today.payments?.card?.count || 0} ta
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Products Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mahsulotlar hisoboti</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.products.total} xil</Text>
                <Text style={styles.statLabel}>Jami mahsulot</Text>
                <Ionicons name="cube-outline" size={24} color="#5856D6" style={styles.statIcon} />
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {formatDecimal(stats.products.quantity)} dona
                </Text>
                <Text style={styles.statLabel}>Jami miqdori</Text>
                <Ionicons name="pricetags-outline" size={24} color="#FF3B30" style={styles.statIcon} />
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {formatCurrency(stats.products.value)}
                </Text>
                <Text style={styles.statLabel}>Jami qiymati</Text>
                <Ionicons name="pricetag-outline" size={24} color="#FF9500" style={styles.statIcon} />
              </View>
              <View style={[styles.statCard, styles.warningCard]}>
                <Text style={[styles.statValue, {color: '#fff'}]}>
                  {stats.products.lowStock} ta
                </Text>
                <Text style={[styles.statLabel, {color: 'rgba(255,255,255,0.8)'}]}>
                  Kam qolgan mahsulot
                </Text>
                <Ionicons name="alert-circle-outline" size={24} color="#fff" style={styles.statIcon} />
              </View>
            </View>
          </View>

          {/* Sellers Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sotuvchilar</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.sellers.total} ta</Text>
                <Text style={styles.statLabel}>Jami sotuvchi</Text>
                <Ionicons name="people-outline" size={24} color="#5856D6" style={styles.statIcon} />
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, {color: '#4CD964'}]}>
                  {stats.sellers.active} ta
                </Text>
                <Text style={styles.statLabel}>Faol sotuvchi</Text>
                <Ionicons name="person-outline" size={24} color="#4CD964" style={styles.statIcon} />
              </View>
            </View>
          </View>
        </ScrollView>
      </ProtectedRoute>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
    fontFamily: 'System',
  },
  headerDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  quickActionIcon: {
    marginRight: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 12,
    marginBottom: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    marginTop: 4,
    fontFamily: 'System',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -5,
  },

  primaryCard: {
    backgroundColor: '#007AFF',
  },
  warningCard: {
    backgroundColor: '#FF9500',
  },

  statLabel: {
    fontSize: 13,
    color: '#636366',
    marginBottom: 4,
    fontFamily: 'System',
    fontWeight: '500',
  },
  statIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    opacity: 0.15,
    transform: [{ scale: 1.8 }],
  },
  // Stat Card Styles
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 5,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    width: '95%',
    marginBottom: 12,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  } as any,
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
    fontFamily: 'System',
  } as any,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  } as any,
  profitSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  } as any,
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#000',
    flex: 1,
  },
  profitPercent: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: 'System',
  },
  profitDetails: {
    marginTop: 8,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 15,
    color: '#636366',
    fontFamily: 'System',
    fontWeight: '500',
  },
  profitValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: 'System',
  },
  paymentMethods: {
    marginTop: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
  },
  paymentDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: -8,
  },
  paymentLabel: {
    fontSize: 13,
    color: '#636366',
    marginTop: 8,
    fontWeight: '500',
    fontFamily: 'System',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
    marginBottom: 2,
    fontFamily: 'System',
  } as any,
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  paymentCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    fontFamily: 'System',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfCard: {
    width: '48%',
  },
  compactCard: {
    padding: 12,
  },
  compactContent: {
    marginLeft: 12,
  },
  compactValue: {
    fontSize: 18,
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 12,
  },
  compactSubtitle: {
    fontSize: 11,
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  profitDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  profitDetailLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  profitDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },

  statsContainer: {
    padding: 16,
  },

  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },

  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    paddingBottom: 24,
  },
  quickActionCard: {
    width: '44%',
    aspectRatio: 1,
    margin: '3%',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
