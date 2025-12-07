import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface MenuItemProps {
  title: string;
  href: string;
  color: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ title, href, color }) => (
  <Link href={href} asChild>
    <TouchableOpacity style={[styles.menuItem, { backgroundColor: color }]}>
      <Text style={styles.menuItemText}>{title}</Text>
    </TouchableOpacity>
  </Link>
);

export const HomeScreen = () => {
  const { admin, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>
          Xush kelibsiz, {admin?.name || 'Admin'}!
        </Text>
        <Text style={styles.roleText}>
          Do'kon: {admin?.shopName || 'Noma\'lum'}
        </Text>
      </View>

      <View style={styles.menuGrid}>
        <MenuItem
          title="Kategoriyalar"
          href="/categories"
          color="#007AFF"
        />
        <MenuItem
          title="Mahsulotlar"
          href="/products"
          color="#4CD964"
        />
        <MenuItem
          title="Sotuvlar"
          href="/sales"
          color="#FF9500"
        />
        <MenuItem
          title="Hisobotlar"
          href="/reports"
          color="#5856D6"
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Chiqish</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  welcomeContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  roleText: {
    fontSize: 16,
    color: '#666',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  menuItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 10,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 