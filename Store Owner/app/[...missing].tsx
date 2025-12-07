import { Ionicons } from '@expo/vector-icons';
import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Sahifa topilmadi',
          headerShown: false
        }}
      />
      <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
      <Text style={styles.title}>Sahifa topilmadi</Text>
      <Text style={styles.message}>Kechirasiz, siz qidirayotgan sahifa mavjud emas.</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Bosh sahifaga qaytish</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  link: {
    marginTop: 8,
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
}); 