import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './context/AuthContext';

interface Category {
  _id: string;
  name: string;
  description: string;
}

interface CategoryFormData {
  name: string;
  description: string;
}

interface PaginationData {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const { token, admin, isLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: 10,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  
  const API_URL = 'http://164.68.110.82:5000/api';

  // Handle initial load and token changes
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      console.log('Initializing categories, token exists:', !!token);
      
      if (!token) {
        console.log('No token, redirecting to login');
        router.replace('/login');
        return;
      }
      
      try {
        // Reset all states first
        if (isMounted) {
          setCategories([]);
          setPagination({
            total: 0,
            pages: 0,
            currentPage: 1,
            perPage: 10,
          });
          setSearchQuery('');
          setLoading(true);
        }
        
        // Fetch fresh data
        await fetchCategories(1);
      } catch (error) {
        console.error('Error initializing categories:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    if (!isLoading) {
      initializeData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isLoading, token]);

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      if (!token) {
        router.replace('/login');
        return;
      }
      
      const refreshData = async () => {
        try {
          console.log('Categories screen focused, refreshing data...');
          setRefreshing(true);
          // Reset pagination and fetch fresh data
          setPagination(prev => ({
            ...prev,
            currentPage: 1,
            pages: 0,
            total: 0
          }));
          await fetchCategories(1);
        } catch (error) {
          console.error('Error refreshing categories:', error);
        } finally {
          setRefreshing(false);
        }
      };
      
      refreshData();
      
      return () => {};
    }, [token])
  );
  
  const onRefresh = useCallback(async () => {
    console.log('Pull to refresh triggered, token exists:', !!token);
    
    if (!token) {
      router.replace('/login');
      return;
    }
    
    try {
      setRefreshing(true);
      // Reset pagination and search query
      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        pages: 0,
        total: 0
      }));
      
      // Reset search
      setSearchQuery('');
      
      // Log before fetching
      console.log('Fetching fresh categories data...');
      
      // Make the API request manually to log the response
      const response = await fetch(`${API_URL}/categories?page=1&limit=${pagination.perPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      const responseData = await response.json();
      
      // Log the raw API response
      console.log('=== RAW API RESPONSE ===');
      console.log(JSON.stringify(responseData, null, 2));
      console.log('=== END OF RAW RESPONSE ===');
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to fetch categories');
      }
      
      // Process the response
      let categoriesData = [];
      if (responseData.data && Array.isArray(responseData.data.categories)) {
        categoriesData = responseData.data.categories;
      } else if (Array.isArray(responseData.data)) {
        categoriesData = responseData.data;
      } else if (responseData.data && typeof responseData.data === 'object') {
        categoriesData = [responseData.data];
      }
      
      // Log the processed data
      console.log('=== PROCESSED CATEGORIES ===');
      console.log(categoriesData);
      console.log('=== END OF PROCESSED DATA ===');
      
      // Update the state
      setCategories(categoriesData);
      
      // Update pagination if available
      if (responseData.data?.pagination) {
        setPagination(prev => ({
          ...prev,
          ...responseData.data.pagination,
          currentPage: 1
        }));
      }
      
      return responseData; // Return the response data for further inspection
      
    } catch (error) {
      console.error('Error during refresh:', error);
      throw error; // Re-throw to be handled by the caller if needed
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  const fetchCategories = async (page = 1) => {
    console.log('Fetching categories, page:', page, 'token exists:', !!token);
    
    if (!token) {
      console.log('No token, clearing categories');
      setCategories([]);
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }
    
    // Don't show loading indicator when loading more (pagination)
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let url = `${API_URL}/categories?page=${page}&limit=${pagination.perPage}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache', // Prevent caching
          'Pragma': 'no-cache'
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kategoriyalarni yuklashda xatolik yuz berdi');
      }
      
      const responseData = await response.json();
      console.log('API Response:', JSON.stringify(responseData, null, 2));
      
      // Extract categories and pagination data from the response
      let categoriesData = [];
      let paginationInfo = {
        total: 0,
        pages: 0,
        currentPage: page,
        perPage: pagination.perPage
      };
      
      // Handle different response formats
      if (responseData.data && Array.isArray(responseData.data.categories)) {
        // Format: { data: { categories: [...], pagination: {...} } }
        categoriesData = responseData.data.categories || [];
        if (responseData.data.pagination) {
          paginationInfo = {
            ...responseData.data.pagination,
            currentPage: page
          };
        }
      } else if (Array.isArray(responseData.data)) {
        // Format: { data: [...] }
        categoriesData = responseData.data;
        if (responseData.pagination) {
          paginationInfo = {
            ...responseData.pagination,
            currentPage: page
          };
        }
      } else if (responseData.data && typeof responseData.data === 'object') {
        // Single category object
        categoriesData = [responseData.data];
        paginationInfo = {
          total: 1,
          pages: 1,
          currentPage: 1,
          perPage: 1
        };
      }
      
      console.log('Processed categories data:', categoriesData);
      
      // Update state with the new data
      setCategories(prev => page === 1 ? categoriesData : [...prev, ...categoriesData]);
      setPagination(paginationInfo);
      
      // If no categories and it's the first page, ensure we show empty state
      if (page === 1 && categoriesData.length === 0) {
        console.log('No categories found for this account');
      }
    } catch (error) {
      Alert.alert('Xato', error instanceof Error ? error.message : 'Kategoriyalarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleAddCategory = async () => {
    if (!admin?._id) return;
    
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          storeOwner: admin._id
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Kategoriya qo\'shishda xatolik yuz berdi');
      }

      setModalVisible(false);
      setFormData({ name: '', description: '' });
      fetchCategories(1); // Reset to first page after adding
      Alert.alert('Muvaffaqiyatli', 'Kategoriya qo\'shildi');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Xato', error instanceof Error ? error.message : 'Kategoriya qo\'shishda xatolik yuz berdi');
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    try {
      const response = await fetch(`${API_URL}/categories/${editingCategory._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Kategoriyani yangilashda xatolik yuz berdi');
      }

      setModalVisible(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
      fetchCategories(pagination.currentPage); // Stay on the same page after edit
      Alert.alert('Muvaffaqiyatli', 'Kategoriya yangilandi');
    } catch (error) {
      Alert.alert('Xato', error instanceof Error ? error.message : 'Kategoriyani yangilashda xatolik yuz berdi');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    Alert.alert(
      'Tasdiqlash',
      'Kategoriyani o\'chirishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O\'chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
              });

              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.message || 'Kategoriyani o\'chirishda xatolik yuz berdi');
              }

              // Refresh the current page, but if it was the last item on the page, go to previous page
              const currentPage = categories.length <= 1 && pagination.currentPage > 1 
                ? pagination.currentPage - 1 
                : pagination.currentPage;
              
              fetchCategories(currentPage);
              Alert.alert('Muvaffaqiyatli', data.message || 'Kategoriya o\'chirildi');
            } catch (error) {
              Alert.alert('Xato', error instanceof Error ? error.message : 'Kategoriyani o\'chirishda xatolik yuz berdi');
            }
          },
        },
      ]
    );
  };



  const loadMore = () => {
    if (loadingMore || pagination.currentPage >= pagination.pages) return;
    setLoadingMore(true);
    fetchCategories(pagination.currentPage + 1);
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => {
              setEditingCategory(item);
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
            onPress={() => handleDeleteCategory(item._id)}
          >
            <Ionicons name="trash" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => router.push(`/subcategories?categoryId=${item._id}&categoryName=${item.name}`)}
          >
            <Ionicons name="list" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : token ? (
        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Qidirish..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setEditingCategory(null);
                  setFormData({ name: '', description: '' });
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Yangi kategoriya</Text>
              </TouchableOpacity>

              <FlatList
                data={categories}
                renderItem={renderCategory}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#007AFF']}
                    tintColor="#007AFF"
                  />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.1}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMore}>
                      <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={48} color="#666" />
                    <Text style={styles.emptyText}>Kategoriyalar topilmadi</Text>
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
                      {editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
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
                          setEditingCategory(null);
                          setFormData({ name: '', description: '' });
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Bekor qilish</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={editingCategory ? handleEditCategory : handleAddCategory}
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
      ) : null}
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
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  viewButton: {
    backgroundColor: '#5856D6',
  },
  description: {
    fontSize: 14,
    color: '#666',
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
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
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
}); 