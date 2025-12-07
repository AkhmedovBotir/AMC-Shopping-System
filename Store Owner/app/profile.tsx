import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './context/AuthContext';

const API_URL = 'http://164.68.110.82:5000/api';

interface StoreOwner {
    _id: string;
    name: string;
    shopName: string;
    phone: string;
    username: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

interface ApiResponse {
    success: boolean;
    data: StoreOwner;
}

export default function ProfileScreen() {
    const { token, logout, admin } = useAuth();
    const [profile, setProfile] = useState<StoreOwner | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchProfile = async () => {
        if (!token) return;
        
        try {
            const response = await fetch(`${API_URL}/store-owner/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Profil ma\'lumotlarini yuklashda xatolik yuz berdi');
            }

            const data: ApiResponse = await response.json();
            if (data.success && data.data) {
                setProfile(data.data);
            } else {
                throw new Error('Profil ma\'lumotlari topilmadi');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Xatolik', 'Profil ma\'lumotlarini yuklashda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleLogout = async () => {
        try {
            await logout();
            // The AuthContext will handle the navigation to login
        } catch (error) {
            Alert.alert('Xatolik', 'Chiqishda xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2D1B69" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
                <Text style={styles.errorText}>Ma'lumotlarni yuklashda xatolik</Text>
                <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={fetchProfile}
                >
                    <Text style={styles.retryButtonText}>Qayta urinish</Text>
                </TouchableOpacity>
            </View>
        );
    }
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.name || 'Foydalanuvchi'}</Text>
          <Text style={styles.username}>@{profile?.username || 'foydalanuvchi'}</Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Do'kon nomi</Text>
            <Text style={styles.infoValue}>{profile.shopName || 'Mavjud emas'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefon raqam</Text>
            <Text style={styles.infoValue}>{profile.phone || 'Mavjud emas'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Foydalanuvchi ID</Text>
            <Text style={[styles.infoValue, styles.smallText]}>{profile._id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Holati</Text>
            <Text style={[
              styles.infoValue,
              profile.status === 'active' ? styles.activeStatus : styles.inactiveStatus
            ]}>
              {profile.status === 'active' ? 'Faol' : 'Nofaol'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ro'yxatdan o'tgan sana</Text>
            <Text style={styles.infoValue}>{formatDate(profile.createdAt)}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Oxirgi yangilanish</Text>
            <Text style={styles.infoValue}>{formatDate(profile.updatedAt)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Chiqish</Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2D1B69',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeStatus: {
    color: '#10B981',
    fontWeight: '600',
  },
  inactiveStatus: {
    color: '#EF4444',
    fontWeight: '600',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  smallText: {
    fontSize: 12,
    color: '#888',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 16,
    margin: 20,
    borderRadius: 10,
    marginTop: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});