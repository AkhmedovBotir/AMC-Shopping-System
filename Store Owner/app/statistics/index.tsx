import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const statisticsPages = [
  {
    title: 'Ombor statistikasi',
    icon: 'cube-outline',
    route: '/statistics/warehouse',
    description: 'Ombordagi mahsulotlar va ularning qiymati haqida ma\'lumot',
  },
  {
    title: 'Sotuvlar statistikasi',
    icon: 'bar-chart-outline',
    route: '/statistics/sales',
    description: 'Sotuvlar bo\'yicha batafsil ma\'lumotlar',
  },
  {
    title: 'Kunlik statistika',
    icon: 'today-outline',
    route: '/statistics/daily',
    description: 'Bugungi kun uchun sotuvlar statistikasi',
  },
  {
    title: 'Haftalik statistika',
    icon: 'calendar-outline',
    route: '/statistics/weekly',
    description: 'Haftalik sotuvlar va daromadlar tahlili',
  },
  {
    title: 'Oylik statistika',
    icon: 'calendar-number-outline',
    route: '/statistics/monthly',
    description: 'Oylik sotuvlar va daromadlar ko\'rsatkichlari',
  },
  {
    title: 'Sotuvchilar statistikasi',
    icon: 'people-outline',
    route: '/statistics/sellers',
    description: 'Sotuvchilar faoliyati bo\'yicha ma\'lumotlar',
  },
];

export default function StatisticsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        {statisticsPages.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon as any} size={32} color="#007AFF" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </TouchableOpacity>
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
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
}); 