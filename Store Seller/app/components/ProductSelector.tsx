import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  category: Category;
  price: number;
  unit: string;
  unitSize: number | null;
  inventory: number | { $numberDecimal: string };
  type: string;
}

// Helper function to handle Decimal128 values from MongoDB
const parseDecimal = (value: number | { $numberDecimal: string }): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  return 0;
};

interface ProductSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

interface PaginationState {
  page: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

export default function ProductSelector({ visible, onClose, onSelect }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    total: 0,
    pages: 1,
    hasMore: false,
  });
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Reset products and load first page when modal becomes visible
      setProducts([]);
      setPagination(prev => ({ ...prev, page: 1 }));
      loadProducts(1, true);
    }
  }, [visible]);

  useEffect(() => {
    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setProducts([]);
      setPagination(prev => ({ ...prev, page: 1 }));
      loadProducts(1, true);
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [search]);

  const loadProducts = async (page: number, reset: boolean = false) => {
    if (page > pagination.pages && !reset) return;
    
    const loadingState = page > 1 ? setLoadingMore : setLoading;
    loadingState(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const url = new URL('http://164.68.110.82:5000/api/products');
      url.searchParams.append('page', page.toString());
      if (search) {
        url.searchParams.append('search', search);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.success && Array.isArray(data.data?.items)) {
        setProducts(prev => reset ? data.data.items : [...prev, ...data.data.items]);
        setPagination({
          page: data.data.page,
          total: data.data.total,
          pages: data.data.pages,
          hasMore: data.data.page < data.data.pages,
        });
      } else {
        if (reset) {
          setProducts([]);
        }
        Alert.alert("Xato", data.message || "Mahsulotlarni yuklashda xatolik");
      }
    } catch (error) {
      if (reset) {
        setProducts([]);
      }
      Alert.alert("Xato", "Serverga ulanishda xatolik yuz berdi");
    } finally {
      loadingState(false);
    }
  };

  const loadMore = () => {
    if (!loading && !loadingMore && pagination.hasMore) {
      const nextPage = pagination.page + 1;
      setPagination(prev => ({ ...prev, page: nextPage }));
      loadProducts(nextPage);
    }
  };

  // Filtering is now handled by the backend, but we can keep client-side filtering as fallback
  const filteredProducts = products;

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category.name}</Text>
        <Text style={styles.productInventory}>
          Qoldiq: {parseDecimal(item.inventory)} {item.unit}
          {item.unitSize ? ` (${item.unitSize} ${item.unit})` : ''}
        </Text>
      </View>
      <Text style={styles.productPrice}>
        {item.price.toLocaleString()} so'm
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Mahsulot tanlang</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Qidirish..."
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading && filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Mahsulot topilmadi</Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            loading && filteredProducts.length === 0 ? (
              <ActivityIndicator style={styles.loader} color="#007AFF" />
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 15,
    paddingHorizontal: 15,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  list: {
    padding: 15,
  },
  loader: {
    flex: 1,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  productInventory: {
    fontSize: 12,
    color: "#888",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingMore: {
    marginVertical: 20,
    alignItems: 'center',
  },
}); 