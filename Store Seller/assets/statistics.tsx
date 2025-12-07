import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatsPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

interface HourlyStats {
  hour: number;
  salesCount: number;
  totalAmount: number;
}

interface DailyStats {
  date: string;
  salesCount: number;
  totalAmount: number;
}

interface WeeklyStats {
  week: number;
  salesCount: number;
  totalAmount: number;
}

interface ProductStats {
  _id: string;
  name: string;
  hourlyStats?: { hour: number; quantity: number; amount: number; }[];
  dailyStats?: { date: string; quantity: number; amount: number; }[];
  weeklyStats?: { week: number; quantity: number; amount: number; }[];
  totalQuantity: number;
  totalAmount: number;
}

interface PaymentMethods {
  cash: number;
  card: number;
}

interface Statistics {
  totalSales: number;
  totalAmount: number;
  hourlyStats?: HourlyStats[];
  dailyStats?: DailyStats[];
  weeklyStats?: WeeklyStats[];
  paymentMethods: PaymentMethods;
  productSalesHistory: ProductStats[];
}

export default function StatisticsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod, startDate, endDate]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      let url = `http://192.168.7.21:5000/api/statistics/${selectedPeriod}`;
      
      if (selectedPeriod === 'custom') {
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        url = `http://192.168.7.21:5000/api/statistics/sales?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setStats(data.data);
      } else {
        Alert.alert("Xato", "Statistika ma'lumotlarini yuklashda xatolik");
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      Alert.alert("Xato", "Serverga ulanishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setSelectedPeriod('custom');
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setSelectedPeriod('custom');
    }
  };

  const formatDate = (date: string | Date) => {
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('uz-UZ');
    }
    return date.toLocaleDateString('uz-UZ');
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount == null) return "0 so'm";
    return amount.toLocaleString('uz-UZ') + " so'm";
  };

  const renderPeriodTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedPeriod === 'daily' && styles.selectedTab]}
        onPress={() => setSelectedPeriod('daily')}
      >
        <Text style={[styles.tabText, selectedPeriod === 'daily' && styles.selectedTabText]}>
          Kunlik
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedPeriod === 'weekly' && styles.selectedTab]}
        onPress={() => setSelectedPeriod('weekly')}
      >
        <Text style={[styles.tabText, selectedPeriod === 'weekly' && styles.selectedTabText]}>
          Haftalik
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedPeriod === 'monthly' && styles.selectedTab]}
        onPress={() => setSelectedPeriod('monthly')}
      >
        <Text style={[styles.tabText, selectedPeriod === 'monthly' && styles.selectedTabText]}>
          Oylik
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedPeriod === 'custom' && styles.selectedTab]}
        onPress={() => setSelectedPeriod('custom')}
      >
        <Text style={[styles.tabText, selectedPeriod === 'custom' && styles.selectedTabText]}>
          Sana
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDatePicker = () => (
    selectedPeriod === 'custom' && (
      <View style={styles.datePickerContainer}>
        <View style={styles.dateRow}>
          <View style={styles.datePickerWrapper}>
            <Text style={styles.dateLabel}>Boshlanish sanasi:</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerWrapper}>
            <Text style={styles.dateLabel}>Tugash sanasi:</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={onStartDateChange}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={onEndDateChange}
          />
        )}
      </View>
    )
  );

  const renderOverview = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Jami sotuvlar</Text>
          <Text style={styles.statNumber}>{stats.totalSales || 0}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Jami summa</Text>
          <Text style={styles.statNumber}>{formatCurrency(stats.totalAmount)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Naqd pul</Text>
          <Text style={styles.statNumber}>{formatCurrency(stats.paymentMethods?.cash)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Plastik</Text>
          <Text style={styles.statNumber}>{formatCurrency(stats.paymentMethods?.card)}</Text>
        </View>
      </View>
    );
  };

  const renderTimeStats = () => {
    if (!stats) return null;

    const renderHourlyStats = (stats: HourlyStats[]) => (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soatlar bo'yicha</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.timeStatCard}>
              <Text style={styles.timeLabel}>{`${stat.hour}:00`}</Text>
              <Text style={styles.timeStatNumber}>{stat.salesCount || 0}</Text>
              <Text style={styles.timeStatAmount}>{formatCurrency(stat.totalAmount)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );

    const renderDailyStats = (stats: DailyStats[]) => (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kunlar bo'yicha</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.timeStatCard}>
              <Text style={styles.timeLabel}>
                {new Date(stat.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.timeStatNumber}>{stat.salesCount || 0}</Text>
              <Text style={styles.timeStatAmount}>{formatCurrency(stat.totalAmount)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );

    const renderWeeklyStats = (stats: WeeklyStats[]) => (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Haftalar bo'yicha</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.timeStatCard}>
              <Text style={styles.timeLabel}>{`${stat.week}-hafta`}</Text>
              <Text style={styles.timeStatNumber}>{stat.salesCount || 0}</Text>
              <Text style={styles.timeStatAmount}>{formatCurrency(stat.totalAmount)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );

    if (selectedPeriod === 'daily' && stats.hourlyStats) {
      return renderHourlyStats(stats.hourlyStats);
    } else if (selectedPeriod === 'weekly' && stats.dailyStats) {
      return renderDailyStats(stats.dailyStats);
    } else if (selectedPeriod === 'monthly' && stats.weeklyStats) {
      return renderWeeklyStats(stats.weeklyStats);
    }

    return null;
  };

  const renderProductStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mahsulotlar bo'yicha</Text>
        {(stats.productSalesHistory || []).map((product) => (
          <View key={product._id} style={styles.productCard}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.productDetails}>
              <Text style={styles.detailText}>Soni: {product.totalQuantity || 0}</Text>
              <Text style={styles.detailText}>{formatCurrency(product.totalAmount)}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadStatistics().finally(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistika</Text>
      </View>

      {renderPeriodTabs()}
      {renderDatePicker()}

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} size="large" color="#007AFF" />
        ) : (
          <>
            {renderOverview()}
            {selectedPeriod !== 'custom' ? (
              <>
                {stats?.hourlyStats && selectedPeriod === 'daily' && renderTimeStats()}
                {stats?.dailyStats && selectedPeriod === 'weekly' && renderTimeStats()}
                {stats?.weeklyStats && selectedPeriod === 'monthly' && renderTimeStats()}
                {renderProductStats()}
              </>
            ) : (
              renderProductStats()
            )}
          </>
        )}
      </ScrollView>
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  selectedTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateRow: {
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
    marginBottom: 8,
  },
  dateButton: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 15,
    gap: 15,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "white",
    padding: 15,
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
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  timeStatCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  timeStatAmount: {
    fontSize: 12,
    color: '#666',
  },
  productCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  productDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailText: {
    fontSize: 14,
    color: "#666",
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 