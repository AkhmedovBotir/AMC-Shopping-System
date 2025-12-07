import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

interface Subcategory {
  _id: string;
  name: string;
  description: string;
}

interface FormData {
  name: string;
  description: string;
}

export default function SubcategoriesScreen() {
  const { categoryId, categoryName } = useLocalSearchParams();
  const router = useRouter();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });
  const { token, admin } = useAuth();

  useFocusEffect(
    useCallback(() => {
      fetchSubcategories();
      return () => {
        // cleanup if needed
      };
    }, [categoryId])
  );

  const fetchSubcategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://164.68.110.82:5000/api/categories/${categoryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.status === 200) {
        setSubcategories(data.subcategories || []);
      }
    } catch (error) {
      Alert.alert('Xato', 'Subkategoriyalarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcategory = async () => {
    try {
      const response = await fetch(`http://164.68.110.82:5000/api/categories/${categoryId}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.status === 201) {
        setModalVisible(false);
        setFormData({ name: '', description: '' });
        fetchSubcategories();
        Alert.alert('Muvaffaqiyatli', 'Subkategoriya qo\'shildi');
      } else {
        Alert.alert('Xato', data.message || 'Subkategoriya qo\'shishda xatolik yuz berdi');
      }
    } catch (error) {
      Alert.alert('Xato', 'Subkategoriya qo\'shishda xatolik yuz berdi');
    }
  };

  const handleEditSubcategory = async () => {
    if (!editingSubcategory) return;

    try {
      const response = await fetch(`http://164.68.110.82:5000/api/categories/subcategories/${editingSubcategory._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.status === 200) {
        setModalVisible(false);
        setEditingSubcategory(null);
        setFormData({ name: '', description: '' });
        fetchSubcategories();
        Alert.alert('Muvaffaqiyatli', 'Subkategoriya yangilandi');
      } else {
        Alert.alert('Xato', data.message || 'Subkategoriyani yangilashda xatolik yuz berdi');
      }
    } catch (error) {
      Alert.alert('Xato', 'Subkategoriyani yangilashda xatolik yuz berdi');
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    Alert.alert(
      'Tasdiqlash',
      'Subkategoriyani o\'chirishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O\'chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `http://164.68.110.82:5000/api/categories/${categoryId}/subcategories/${subcategoryId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              if (response.status === 200) {
                fetchSubcategories();
                Alert.alert('Muvaffaqiyatli', 'Subkategoriya o\'chirildi');
              } else {
                Alert.alert('Xato', 'Subkategoriyani o\'chirishda xatolik yuz berdi');
              }
            } catch (error) {
              Alert.alert('Xato', 'Subkategoriyani o\'chirishda xatolik yuz berdi');
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.push('/categories');
  };

  const renderSubcategory = ({ item }: { item: Subcategory }) => (
    <View style={styles.subcategoryCard}>
      <View style={styles.subcategoryContent}>
        <Text style={styles.subcategoryName}>{item.name}</Text>
        <Text style={styles.subcategoryDescription}>{item.description}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            setEditingSubcategory(item);
            setFormData({
              name: item.name,
              description: item.description,
            });
            setModalVisible(true);
          }}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSubcategory(item._id)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.container}>
        <ProtectedRoute>
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
              <Text style={styles.backText}>Ortga</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
          </View>

          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setEditingSubcategory(null);
                    setFormData({ name: '', description: '' });
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.addButtonText}>+ Yangi subkategoriya</Text>
                </TouchableOpacity>

                <FlatList
                  data={subcategories}
                  renderItem={renderSubcategory}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.listContainer}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="folder-open-outline" size={48} color="#666" />
                      <Text style={styles.emptyText}>Subkategoriyalar mavjud emas</Text>
                    </View>
                  }
                />

                <Modal
                  visible={modalVisible}
                  animationType="slide"
                  transparent={true}
                  onRequestClose={() => setModalVisible(false)}
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>
                        {editingSubcategory ? 'Subkategoriyani tahrirlash' : 'Yangi subkategoriya'}
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="Nomi"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                      />

                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Tarifi"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        multiline
                        numberOfLines={3}
                      />

                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => {
                            setModalVisible(false);
                            setEditingSubcategory(null);
                            setFormData({ name: '', description: '' });
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Bekor qilish</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.saveButton]}
                          onPress={editingSubcategory ? handleEditSubcategory : handleAddSubcategory}
                        >
                          <Text style={styles.saveButtonText}>Saqlash</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              </>
            )}
          </View>
        </ProtectedRoute>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 25,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#4CD964',
    padding: 16,
    borderRadius: 10,
    margin: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  subcategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
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
  subcategoryContent: {
    flex: 1,
  },
  subcategoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  subcategoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});