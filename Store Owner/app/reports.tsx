import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Header } from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <ProtectedRoute>
        <Header title="Hisobotlar" />
        <View style={styles.content}>
          {/* Reports content will go here */}
        </View>
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
    padding: 16,
  },
}); 