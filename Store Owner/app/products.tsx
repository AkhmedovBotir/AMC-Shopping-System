import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

interface InventoryValue {
  $numberDecimal: string;
}

interface Product {
  _id: string;
  name: string;
  category: {
    _id: string;
    name: string;
  };
  subcategory: string;
  price: number;
  originalPrice: number;
  unit: string;
  unitSize: number;
  inventory: number | InventoryValue;
  storeOwner?: {
    _id: string;
    name: string;
    shopName: string;
    phone: string;
  };
  type?: string;
  properties?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface FilterParams {
  category?: string;
  subcategory?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface PaginationData {
  total: number;
  pages: number;
  page: number;
}

interface Category {
  _id: string;
  name: string;
  subcategories: {
    _id: string;
    name: string;
  }[];
}

interface ProductFormData {
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  originalPrice?: string | number;
  unit: string;
  unitSize: number;
  inventory: number;
}

interface CategoryResponse {
  success: boolean;
  data: {
    categories: Array<{
      _id: string;
      name: string;
      subcategories: Array<{
        _id: string;
        name: string;
      }>;
    }>;
    pagination?: {
      total: number;
      pages: number;
      page: number;
    };
  };
}

interface FormState extends Omit<ProductFormData, 'unitSize'> {
  unitSize: string;
  originalPrice?: string | number;
}

const INITIAL_FILTER: FilterParams = {
  page: 1,
  limit: 10,
  sort: 'name',
  order: 'asc'
};

// Helper function to safely convert any numeric value to number
const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const UNITS = ['dona', 'kg', 'litr'];

// Add new ViewScreen component at the top level
const ViewScreen = ({ product: initialProduct, categories, onClose }: {
  product: Product & { subcategoryName?: string },
  categories: Category[],
  onClose: () => void
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product & { subcategoryName?: string }>(initialProduct);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://164.68.110.82:5000/api/products/${initialProduct._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          // Find category to get subcategory name
          const category = categories.find((cat: Category) => cat._id === data.data.category._id);
          const subcategoryName = category?.subcategories.find((sub: { _id: string, name: string }) => sub._id === data.data.subcategory)?.name;

          setProduct({
            ...data.data,
            subcategoryName
          });
        } else {
          Alert.alert('Xato', 'Mahsulot ma\'lumotlarini yuklashda xatolik yuz berdi');
        }
      } catch (error) {
        Alert.alert('Xato', 'Mahsulot ma\'lumotlarini yuklashda xatolik yuz berdi');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [initialProduct._id, token, categories]);

  return (
    <View style={styles.fullScreenModal}>
      <View style={styles.viewScreenHeader}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.viewScreenTitle}>Mahsulot ma'lumotlari</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView style={styles.viewScreenContent}>
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Nomi</Text>
            <Text style={styles.detailValue}>{product.name}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Kategoriya</Text>
            <Text style={styles.detailValue}>{product.category.name}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Subkategoriya</Text>
            <Text style={styles.detailValue}>{product.subcategoryName}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Narx</Text>
            {product.originalPrice && product.originalPrice !== product.price ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.detailLabel, { width: 120 }]}>Asl narxi:</Text>
                  <Text style={[styles.detailValue, { color: '#999' }]}>
                    {product.originalPrice.toLocaleString()} so'm / {product.unit}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.detailLabel, { width: 120 }]}>Sotuvdagi narxi:</Text>
                  <Text style={[styles.detailValue, { color: '#e74c3c', fontWeight: 'bold' }]}>
                    {product.price.toLocaleString()} so'm / {product.unit}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.detailLabel, { width: 120 }]}>Narxi:</Text>
                <Text style={styles.detailValue}>
                  {product.price.toLocaleString()} so'm / {product.unit}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Birlik o'lchami</Text>
            <Text style={styles.detailValue}>{product.unitSize} {product.unit}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Ombordagi miqdori</Text>
            <Text style={styles.detailValue}>
              {typeof product.inventory === 'object' && product.inventory !== null && '$numberDecimal' in product.inventory
                ? parseFloat(product.inventory.$numberDecimal).toLocaleString('uz-UZ')
                : (product.inventory || 0).toLocaleString('uz-UZ')} {product.unit}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// Add new EditScreen component at the top level
const EditScreen = ({
  product,
  categories,
  onSave,
  onClose
}: {
  product: Product,
  categories: Category[],
  onSave: (form: ProductFormData) => void,
  onClose: () => void
}) => {
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: product?.name || '',
    category: product?.category?._id || '',
    subcategory: product?.subcategory || '',
    price: product?.price ? product.price.toString() : '0',
    originalPrice: product?.originalPrice ? product.originalPrice.toString() : '',
    unit: product?.unit || 'dona',
    unitSize: (product?.unitSize || 1).toString(),
    inventory: (typeof product?.inventory === 'object' && product.inventory !== null && '$numberDecimal' in product.inventory
      ? parseFloat(product.inventory.$numberDecimal)
      : (product?.inventory || 0)
    ).toString()
  });

  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'category'

  const handleSave = () => {
    // Convert string values to numbers before saving
    const price = parseFloat(form.price) || 0;
    const unitSize = parseFloat(form.unitSize) || 1;
    const inventory = parseFloat(form.inventory) || 0;
    const originalPrice = form.originalPrice ? parseFloat(form.originalPrice) : undefined;
    
    // Validate inputs
    if (isNaN(price) || price <= 0) {
      Alert.alert('Xato', 'Noto\'g\'ri narx kiritilgan');
      return;
    }
    
    if (isNaN(unitSize) || unitSize <= 0) {
      Alert.alert('Xato', 'Noto\'g\'ri birlik o\'lchami kiritilgan');
      return;
    }
    
    if (isNaN(inventory) || inventory < 0) {
      Alert.alert('Xato', 'Noto\'g\'ri miqdor kiritilgan');
      return;
    }
    
    onSave({
      ...form,
      price,
      unitSize,
      inventory,
      originalPrice
    });
  };

  return (
    <View style={styles.fullScreenModal}>
      <View style={styles.editScreenHeader}>
        <View style={styles.editHeaderLeft}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.editScreenTitle}>Mahsulotni tahrirlash</Text>
        </View>
        <TouchableOpacity
          style={styles.editSaveButton}
          onPress={handleSave}
        >
          <Text style={styles.editSaveButtonText}>Saqlash</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editTabsContainer}>
        <TouchableOpacity
          style={[styles.editTab, activeTab === 'basic' && styles.editTabActive]}
          onPress={() => setActiveTab('basic')}
        >
          <Text style={[styles.editTabText, activeTab === 'basic' && styles.editTabTextActive]}>
            Asosiy ma'lumotlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editTab, activeTab === 'category' && styles.editTabActive]}
          onPress={() => setActiveTab('category')}
        >
          <Text style={[styles.editTabText, activeTab === 'category' && styles.editTabTextActive]}>
            Kategoriya
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'basic' ? (
        <ScrollView style={styles.editScreenContent}>
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Mahsulot nomi</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Mahsulot nomini kiriting"
              value={form.name}
              onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Narx va miqdor</Text>
            <View style={styles.editRow}>
              <View style={styles.editHalfInput}>
                <Text style={styles.editInputLabel}>Narxi</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0"
                  value={form.price.toString()}
                  onChangeText={(text) => setForm(prev => ({
                    ...prev,
                    price: parseInt(text) || 0
                  }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.editHalfInput}>
                <Text style={styles.editInputLabel}>Asl narxi (ixtiyoriy)</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0"
                  value={form.originalPrice}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    if (text === '' || /^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({
                        ...prev,
                        originalPrice: text
                      }));
                    }
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.editHalfInput}>
                <Text style={styles.editInputLabel}>Miqdori</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0"
                  value={form.inventory}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    if (text === '' || /^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({
                        ...prev,
                        inventory: text
                      }));
                    }
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>O'lchov birligi</Text>
            <View style={styles.unitsContainer}>
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitButton,
                    form.unit === unit && styles.unitButtonActive
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, unit }))}
                >
                  <Text style={[
                    styles.unitButtonText,
                    form.unit === unit && styles.unitButtonTextActive
                  ]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editRow}>
              <View style={styles.editFullInput}>
                <Text style={styles.editInputLabel}>Birlik o'lchami</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="1"
                  value={form.unitSize}
                  onChangeText={(text) => {
                    // Replace comma with dot
                    text = text.replace(',', '.');
                    // Allow only numbers and one decimal point
                    if (/^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({ ...prev, unitSize: text }));
                    }
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.editScreenContent}>
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Kategoriyani tanlang</Text>
            {categories.map((category) => (
              <View key={category._id} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    form.category === category._id && styles.categoryButtonActive
                  ]}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      category: category._id,
                      subcategory: undefined
                    }));
                  }}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    form.category === category._id && styles.categoryButtonTextActive
                  ]}>
                    {category.name}
                  </Text>
                  {form.category === category._id && (
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  )}
                </TouchableOpacity>

                {form.category === category._id && category.subcategories.length > 0 && (
                  <View style={styles.subcategoriesContainer}>
                    {category.subcategories.map((sub) => (
                      <TouchableOpacity
                        key={sub._id}
                        style={[
                          styles.subcategoryButton,
                          form.subcategory === sub._id && styles.subcategoryButtonActive
                        ]}
                        onPress={() => setForm(prev => ({
                          ...prev,
                          subcategory: sub._id
                        }))}
                      >
                        <Text style={[
                          styles.subcategoryButtonText,
                          form.subcategory === sub._id && styles.subcategoryButtonTextActive
                        ]}>
                          {sub.name}
                        </Text>
                        {form.subcategory === sub._id && (
                          <Ionicons name="checkmark" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// Add new CreateScreen component at the top level
const CreateScreen = ({
  categories,
  onSave,
  onClose
}: {
  categories: Category[],
  onSave: (form: ProductFormData) => void,
  onClose: () => void
}) => {
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    originalPrice: '',
    unit: 'dona',
    unitSize: '1',
    inventory: '0'
  });

  const [activeTab, setActiveTab] = useState('basic');

  const handleSave = () => {
    // Convert string values to numbers before saving
    const price = parseFloat(form.price) || 0;
    const unitSize = parseFloat(form.unitSize) || 1;
    const inventory = parseFloat(form.inventory) || 0;
    const originalPrice = form.originalPrice ? parseFloat(form.originalPrice) : undefined;

    // Validate inputs
    if (isNaN(price) || price <= 0) {
      Alert.alert('Xato', 'Noto\'g\'ri narx kiritilgan');
      return;
    }

    if (isNaN(unitSize) || unitSize <= 0) {
      Alert.alert('Xato', 'Noto\'g\'ri birlik o\'lchami kiritilgan');
      return;
    }

    if (isNaN(inventory) || inventory < 0) {
      Alert.alert('Xato', 'Noto\'g\'ri miqdor kiritilgan');
      return;
    }

    onSave({
      ...form,
      price,
      unitSize,
      inventory,
      originalPrice
    });
  };

  return (
    <View style={styles.fullScreenModal}>
      <View style={styles.editScreenHeader}>
        <View style={styles.editHeaderLeft}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.editScreenTitle}>Yangi mahsulot</Text>
        </View>
        <TouchableOpacity
          style={styles.editSaveButton}
          onPress={handleSave}
        >
          <Text style={styles.editSaveButtonText}>Saqlash</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editTabsContainer}>
        <TouchableOpacity
          style={[styles.editTab, activeTab === 'basic' && styles.editTabActive]}
          onPress={() => setActiveTab('basic')}
        >
          <Text style={[styles.editTabText, activeTab === 'basic' && styles.editTabTextActive]}>
            Asosiy ma'lumotlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editTab, activeTab === 'category' && styles.editTabActive]}
          onPress={() => setActiveTab('category')}
        >
          <Text style={[styles.editTabText, activeTab === 'category' && styles.editTabTextActive]}>
            Kategoriya
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'basic' ? (
        <ScrollView style={styles.editScreenContent}>
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Mahsulot nomi</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Mahsulot nomini kiriting"
              value={form.name}
              onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            />
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Narx va miqdor</Text>
            <View style={styles.editRow}>
              <View style={styles.editHalfInput}>
                <Text style={styles.editInputLabel}>Narxi</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0"
                  value={form.price}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    if (text === '' || /^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({
                        ...prev,
                        price: text
                      }));
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.editHalfInput}>
                <Text style={styles.editInputLabel}>Asl narxi (ixtiyoriy)</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0"
                  value={form.originalPrice}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    if (text === '' || /^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({
                        ...prev,
                        originalPrice: text
                      }));
                    }
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.editHalfInput}>
                <Text style={styles.editInputLabel}>Miqdori</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="0"
                  value={form.inventory}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    if (text === '' || /^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({
                        ...prev,
                        inventory: text
                      }));
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>O'lchov birligi</Text>
            <View style={styles.unitsContainer}>
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitButton,
                    form.unit === unit && styles.unitButtonActive
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, unit }))}
                >
                  <Text style={[
                    styles.unitButtonText,
                    form.unit === unit && styles.unitButtonTextActive
                  ]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.editRow}>
              <View style={styles.editFullInput}>
                <Text style={styles.editInputLabel}>Birlik o'lchami</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="1"
                  value={form.unitSize}
                  onChangeText={(text) => {
                    // Replace comma with dot
                    text = text.replace(',', '.');
                    // Allow only numbers and one decimal point
                    if (/^\d*\.?\d*$/.test(text)) {
                      setForm(prev => ({ ...prev, unitSize: text }));
                    }
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.editScreenContent}>
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle}>Kategoriyani tanlang</Text>
            {categories.map((category) => (
              <View key={category._id} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    form.category === category._id && styles.categoryButtonActive
                  ]}
                  onPress={() => {
                    setForm(prev => ({
                      ...prev,
                      category: category._id,
                      subcategory: undefined
                    }));
                  }}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    form.category === category._id && styles.categoryButtonTextActive
                  ]}>
                    {category.name}
                  </Text>
                  {form.category === category._id && (
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  )}
                </TouchableOpacity>

                {form.category === category._id && category.subcategories.length > 0 && (
                  <View style={styles.subcategoriesContainer}>
                    {category.subcategories.map((sub) => (
                      <TouchableOpacity
                        key={sub._id}
                        style={[
                          styles.subcategoryButton,
                          form.subcategory === sub._id && styles.subcategoryButtonActive
                        ]}
                        onPress={() => setForm(prev => ({
                          ...prev,
                          subcategory: sub._id
                        }))}
                      >
                        <Text style={[
                          styles.subcategoryButtonText,
                          form.subcategory === sub._id && styles.subcategoryButtonTextActive
                        ]}>
                          {sub.name}
                        </Text>
                        {form.subcategory === sub._id && (
                          <Ionicons name="checkmark" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default function ProductsScreen() {
  const router = useRouter();
  const { token, admin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state for initial load

  // Filter states
  const [filterParams, setFilterParams] = useState<FilterParams>(INITIAL_FILTER);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Product form states
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: '',
    category: '',
    price: 0,
    originalPrice: 0,
    unit: 'dona',
    unitSize: 1,
    inventory: 0
  });

  // Pagination
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    pages: 0,
    page: 1
  });

  const [viewingProduct, setViewingProduct] = useState<(Product & { subcategoryName?: string }) | null>(null);
  const [editingFullScreen, setEditingFullScreen] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load categories for filter
  const fetchCategories = async () => {
    console.log('Fetching categories, token exists:', !!token);

    if (!token) {
      console.log('No token, clearing categories');
      setCategories([]);
      return;
    }
    try {
      const response = await fetch('http://164.68.110.82:5000/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data: CategoryResponse = await response.json();

      if (data.success) {
        // Kategoriyalarni to'g'ri formatda saqlash
        const formattedCategories = data.data.categories.map(category => ({
          _id: category._id,
          name: category.name,
          subcategories: Array.isArray(category.subcategories)
            ? category.subcategories.map(sub => ({
              _id: sub._id,
              name: sub.name
            }))
            : []
        }));
        setCategories(formattedCategories);
      } else {
        console.error('Failed to fetch categories:', data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch products with filters
  const fetchProducts = async (page = 1, refresh = false) => {
    console.log('Fetching products, page:', page, 'refresh:', refresh, 'token exists:', !!token);

    if (!token) {
      console.log('No token, clearing products');
      setProducts([]);
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      return;
    }

    // Don't show loading indicator when loading more (pagination)
    if (page === 1 || refresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const queryParams = new URLSearchParams({
        ...(filterParams.category && { category: filterParams.category }),
        ...(filterParams.subcategory && { subcategory: filterParams.subcategory }),
        ...(filterParams.search && { search: filterParams.search }),
        sort: filterParams.sort || 'name',
        order: filterParams.order || 'asc',
        page: page.toString(),
        limit: filterParams.limit.toString()
      });

      const response = await fetch(`http://164.68.110.82:5000/api/products?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        // Kategoriyalar ichidan subcategory nomini topish
        const productsWithSubcategories = data.data.items.map((product: Product) => {
          const category = categories.find(cat => cat._id === product.category._id);
          const subcategoryName = category?.subcategories.find(sub => sub._id === product.subcategory)?.name;
          return {
            ...product,
            subcategoryName // Qo'shimcha maydon sifatida saqlash
          };
        });

        if (refresh || page === 1) {
          setProducts(productsWithSubcategories);
        } else {
          setProducts(prev => [...prev, ...productsWithSubcategories]);
        }
        setPagination({
          total: data.data.total,
          pages: data.data.pages,
          page: data.data.page
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Xato', 'Mahsulotlarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Handle initial load and token changes
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      console.log('Initializing data, token exists:', !!token);

      if (!token) {
        console.log('No token, redirecting to login');
        router.replace('/login');
        return;
      }

      try {
        // Reset all states first
        if (isMounted) {
          setProducts([]);
          setCategories([]);
          setPagination({
            total: 0,
            pages: 0,
            page: 1,
          });
          setSelectedCategory('');
          setSelectedSubcategory('');
          setSearchQuery('');
          setFilterParams(INITIAL_FILTER);
          setLoading(true);
        }

        // Fetch data
        await fetchCategories();
        await fetchProducts(1, true);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      if (!token) {
        router.replace('/login');
        return;
      }

      const refreshData = async () => {
        try {
          console.log('Screen focused, refreshing data...');
          setRefreshing(true);
          await fetchCategories();
          await fetchProducts(1, true);
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setRefreshing(false);
        }
      };

      refreshData();
    }, [token])
  );

  // Handle filter changes
  useEffect(() => {
    if (token) {
      const timer = setTimeout(() => {
        fetchProducts(1, true);
      }, 300); // Add debounce to prevent rapid requests

      return () => clearTimeout(timer);
    }
  }, [filterParams, token]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    console.log('Pull to refresh triggered, token exists:', !!token);

    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      setRefreshing(true);
      // Reset pagination and fetch fresh data
      setPagination(prev => ({
        ...prev,
        page: 1,
        pages: 0,
        total: 0
      }));

      // Reset filters
      setSelectedCategory('');
      setSelectedSubcategory('');
      setSearchQuery('');
      setFilterParams(INITIAL_FILTER);

      // Fetch fresh data
      await Promise.all([
        fetchCategories(),
        fetchProducts(1, true)
      ]);
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loadingMore && pagination.page < pagination.pages && token) {
      setLoadingMore(true);
      fetchProducts(pagination.page + 1);
    }
  }, [loadingMore, pagination, token]);

  // Apply filters
  const applyFilters = () => {
    setFilterParams(prev => ({
      ...prev,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      search: searchQuery,
      page: 1
    }));
    setFilterModalVisible(false);
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSearchQuery('');
    setFilterParams(INITIAL_FILTER);
    setFilterModalVisible(false);
  };

  // Render product item in the list
  const renderProduct = ({ item }: { item: Product & { subcategoryName?: string } }) => (
    <ProductCard
      item={item}
      onView={(id) => {
        // Find the product to view
        const productToView = products.find(p => p._id === id);
        if (productToView) {
          setViewingProduct({
            ...productToView,
            subcategoryName: categories
              .flatMap(cat => cat.subcategories)
              .find(sub => sub._id === productToView.subcategory)?.name
          });
        }
      }}
      onEdit={setEditingFullScreen}
      onDelete={handleDeleteProduct}
      token={token}
      categories={categories}
    />
  );

  // Product management functions
  const handleAddProduct = async () => {
    try {
      const response = await fetch('http://164.68.110.82:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productForm),
      });

      const data = await response.json();
      if (response.status === 201) {
        setProductModalVisible(false);
        setProductForm({
          name: '',
          category: '',
          price: 0,
          unit: 'dona',
          unitSize: 1,
          inventory: 0
        });
        fetchProducts(1, true);
        Alert.alert('Muvaffaqiyatli', 'Mahsulot qo\'shildi');
      } else {
        Alert.alert('Xato', data.message || 'Mahsulot qo\'shishda xatolik yuz berdi');
      }
    } catch (error) {
      Alert.alert('Xato', 'Mahsulot qo\'shishda xatolik yuz berdi');
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    try {
      // Prepare the update data with both price and originalPrice
      const updateData = {
        ...productForm,
        price: productForm.price,
        originalPrice: productForm.originalPrice || productForm.price // Use originalPrice if exists, otherwise use price
      };

      console.log('Updating product with data:', updateData);

      const response = await fetch(`http://164.68.110.82:5000/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (response.status === 200) {
        setProductModalVisible(false);
        setEditingProduct(null);
        setProductForm({
          name: '',
          category: '',
          price: 0,
          originalPrice: 0,
          unit: 'dona',
          unitSize: 1,
          inventory: 0
        });
        fetchProducts(1, true);
        Alert.alert('Muvaffaqiyatli', 'Mahsulot yangilandi');
      } else {
        console.error('Update failed:', data);
        Alert.alert('Xato', data.message || 'Mahsulotni yangilashda xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Xato', 'Mahsulotni yangilashda xatolik yuz berdi');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Tasdiqlash',
      'Mahsulotni o\'chirishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O\'chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://164.68.110.82:5000/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (response.status === 200) {
                fetchProducts(1, true);
                Alert.alert('Muvaffaqiyatli', 'Mahsulot o\'chirildi');
              } else {
                Alert.alert('Xato', 'Mahsulotni o\'chirishda xatolik yuz berdi');
              }
            } catch (error) {
              Alert.alert('Xato', 'Mahsulotni o\'chirishda xatolik yuz berdi');
            }
          },
        },
      ]
    );
  };

  const handleUpdateInventory = async (productId: string, quantity: number, isAddition: boolean) => {
    try {
      const response = await fetch(`http://164.68.110.82:5000/api/products/${productId}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity, isAddition }),
      });

      const data = await response.json();
      if (response.status === 200) {
        fetchProducts(1, true);
        Alert.alert('Muvaffaqiyatli', 'Inventar yangilandi');
      } else {
        Alert.alert('Xato', data.message || 'Inventarni yangilashda xatolik yuz berdi');
      }
    } catch (error) {
      Alert.alert('Xato', 'Inventarni yangilashda xatolik yuz berdi');
    }
  };

  // Helper function to safely convert MongoDB Decimal128 to number
  const safeToNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && '$numberDecimal' in value) {
      return parseFloat(value.$numberDecimal);
    }
    return Number(value) || 0;
  };

  // Helper function to format currency
  const formatCurrency = (amount: any): string => {
    let num: number;

    // Handle different possible formats of amount
    if (amount === null || amount === undefined) {
      num = 0;
    } else if (typeof amount === 'object' && '$numberDecimal' in amount) {
      num = parseFloat(amount.$numberDecimal);
    } else if (typeof amount === 'number') {
      num = amount;
    } else if (typeof amount === 'string') {
      num = parseFloat(amount) || 0;
    } else {
      num = 0;
    }

    // Format the number with Uzbek locale and currency
    return num.toLocaleString('uz-UZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' so\'m';
  };

  // Helper function to safely convert any numeric value to number
  const toNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && '$numberDecimal' in value) {
      return parseFloat(value.$numberDecimal);
    }
    return parseFloat(value) || 0;
  };

  // Product Card Component
  const ProductCard = ({ item, onView, onEdit, onDelete, token, categories }: {
    item: Product & { subcategoryName?: string },
    onView: (id: string) => void,
    onEdit: (product: Product) => void,
    onDelete: (id: string) => void,
    token: string | null,
    categories: Category[]
  }) => {
    const getPriceValue = (price: any): number => {
      if (price === null || price === undefined) return 0;
      if (typeof price === 'number') return price;
      if (typeof price === 'object' && '$numberDecimal' in price) {
        return parseFloat(price.$numberDecimal);
      }
      return Number(price) || 0;
    };

    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && '$numberDecimal' in value) {
        return parseFloat(value.$numberDecimal);
      }
      return parseFloat(value) || 0;
    };

    const priceValue = getPriceValue(item.price);
    const originalPriceValue = item.originalPrice ? getPriceValue(item.originalPrice) : null;
    const hasDiscount = originalPriceValue !== null;

    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.categoryText}>
              {item.category.name}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={async () => {
                try {
                  // Refresh data
                  const response = await fetch(`http://164.68.110.82:5000/api/products/${item._id}`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });

                  const data = await response.json();
                  if (data.success) {
                    // Find category to get subcategory name
                    const category = categories.find(cat => cat._id === data.data.category._id);
                    const subcategoryName = category?.subcategories.find(sub => sub._id === data.data.subcategory)?.name;

                    // Set viewing product with fresh data
                    setViewingProduct({
                      ...data.data,
                      subcategoryName
                    });
                  } else {
                    Alert.alert('Xato', 'Mahsulot ma\'lumotlarini yuklashda xatolik yuz berdi');
                  }
                } catch (error) {
                  Alert.alert('Xato', 'Mahsulot ma\'lumotlarini yuklashda xatolik yuz berdi');
                }
              }}
            >
              <Ionicons name="eye" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setEditingFullScreen(item)}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteProduct(item._id)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.productDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={16} color="#666" />
            {hasDiscount ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.detailText, { color: '#999', marginRight: 4 }]}>
                  {formatCurrency(priceValue)} / {item.unit}
                </Text>

              </View>
            ) : (
              <Text style={styles.detailText}>
                {formatCurrency(priceValue)} / {item.unit}
              </Text>
            )}
          </View>

          <View style={styles.detailItem}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {typeof item.inventory === 'object' && item.inventory !== null && '$numberDecimal' in item.inventory
                ? parseFloat(item.inventory.$numberDecimal).toLocaleString('uz-UZ')
                : (item.inventory || 0).toLocaleString('uz-UZ')} {item.unit}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ProtectedRoute>
        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Qidirish..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => applyFilters()}
              />
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    applyFilters();
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setFilterModalVisible(true)}
              >
                <Ionicons name="filter" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setIsCreating(true)}
              >
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={products}
              renderItem={renderProduct}
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
                  <Ionicons name="cube-outline" size={48} color="#666" />
                  <Text style={styles.emptyText}>Mahsulotlar topilmadi</Text>
                </View>
              }
            />
          )}

          {/* Filter Modal */}
          <Modal
            visible={filterModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setFilterModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Filtrlash</Text>

                <Text style={styles.inputLabel}>Kategoriya</Text>
                <ScrollView style={styles.categoryList}>
                  {categories.map((category) => (
                    <View key={category._id}>
                      <TouchableOpacity
                        style={[
                          styles.categoryItem,
                          selectedCategory === category._id && styles.selectedItem
                        ]}
                        onPress={() => {
                          setSelectedCategory(category._id);
                          setSelectedSubcategory('');
                        }}
                      >
                        <Text style={[
                          styles.categoryItemText,
                          selectedCategory === category._id && styles.selectedItemText
                        ]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>

                      {selectedCategory === category._id && category.subcategories.length > 0 && (
                        <View style={styles.subcategoryList}>
                          {category.subcategories.map((sub) => (
                            <TouchableOpacity
                              key={sub._id}
                              style={[
                                styles.subcategoryItem,
                                selectedSubcategory === sub._id && styles.selectedItem
                              ]}
                              onPress={() => setSelectedSubcategory(sub._id)}
                            >
                              <Text style={[
                                styles.subcategoryItemText,
                                selectedSubcategory === sub._id && styles.selectedItemText
                              ]}>
                                {sub.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.resetButton]}
                    onPress={resetFilters}
                  >
                    <Text style={styles.resetButtonText}>Tozalash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.applyButton]}
                    onPress={applyFilters}
                  >
                    <Text style={styles.applyButtonText}>Qo'llash</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Create Product Screen */}
          {isCreating && (
            <Modal
              visible={true}
              animationType="slide"
              presentationStyle="fullScreen"
            >
              <CreateScreen
                categories={categories}
                onSave={async (form) => {
                  try {
                    // Validate form data
                    if (!form.name) {
                      Alert.alert('Xato', 'Mahsulot nomini kiriting');
                      return;
                    }
                    if (!form.category) {
                      Alert.alert('Xato', 'Iltimos, to\'g\'ri kategoriyani tanlang');
                      return;
                    }
                    if (!form.price || form.price <= 0) {
                      Alert.alert('Xato', 'To\'g\'ri narx kiriting');
                      return;
                    }
                    if (!form.unitSize || parseFloat(form.unitSize.toString()) <= 0) {
                      Alert.alert('Xato', 'To\'g\'ri birlik o\'lchamini kiriting');
                      return;
                    }

                    // Find the selected category
                    const selectedCategory = categories.find(cat => cat._id === form.category);
                    if (!selectedCategory) {
                      Alert.alert('Xato', 'Iltimos, to\'g\'ri kategoriyani tanlang');
                      return;
                    }

                    // Validate subcategory if provided
                    let selectedSubcategory;
                    if (form.subcategory) {
                      selectedSubcategory = selectedCategory.subcategories.find(
                        sub => sub._id === form.subcategory
                      );
                      if (!selectedSubcategory) {
                        Alert.alert('Xato', 'Iltimos, to\'g\'ri subkategoriyani tanlang');
                        return;
                      }
                    }

                    // Prepare the request body according to API documentation
                    const requestBody = {
                      name: form.name,
                      category: selectedCategory._id,
                      subcategory: form.subcategory || undefined,
                      price: parseFloat(form.price.toString()),
                      originalPrice: form.originalPrice ? parseFloat(form.originalPrice.toString()) : undefined,
                      unit: form.unit,
                      unitSize: parseFloat(form.unitSize.toString()) || 1,
                      inventory: form.inventory || 0
                    };

                    console.log('Creating product with data:', JSON.stringify(requestBody, null, 2));

                    const response = await fetch('http://164.68.110.82:5000/api/products', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(requestBody),
                    });

                    const data = await response.json();
                    if (response.status === 201) {
                      setIsCreating(false);
                      fetchProducts(1, true);
                      Alert.alert('Muvaffaqiyatli', 'Mahsulot qo\'shildi');
                    } else {
                      Alert.alert('Xato', data.message || 'Mahsulot qo\'shishda xatolik yuz berdi');
                    }
                  } catch (error) {
                    Alert.alert('Xato', 'Mahsulot qo\'shishda xatolik yuz berdi');
                  }
                }}
                onClose={() => setIsCreating(false)}
              />
            </Modal>
          )}

          {/* View Product Screen */}
          {viewingProduct && (
            <Modal
              visible={true}
              animationType="slide"
              presentationStyle="fullScreen"
            >
              <ViewScreen
                product={viewingProduct}
                categories={categories}
                onClose={() => setViewingProduct(null)}
              />
            </Modal>
          )}

          {/* Edit Product Full Screen */}
          {editingFullScreen && (
            <Modal
              visible={true}
              animationType="slide"
              presentationStyle="fullScreen"
            >
              <EditScreen
                product={editingFullScreen}
                categories={categories}
                onSave={async (form) => {
                  try {
                    // Validate form data
                    if (!form.name) {
                      Alert.alert('Xato', 'Mahsulot nomini kiriting');
                      return;
                    }
                    if (!form.category) {
                      Alert.alert('Xato', 'Iltimos, to\'g\'ri kategoriyani tanlang');
                      return;
                    }

                    // Find the selected category
                    const selectedCategory = categories.find(cat => cat._id === form.category);
                    if (!selectedCategory) {
                      Alert.alert('Xato', 'Iltimos, to\'g\'ri kategoriyani tanlang');
                      return;
                    }

                    // Validate subcategory if provided
                    let selectedSubcategory;
                    if (form.subcategory) {
                      selectedSubcategory = selectedCategory.subcategories.find(
                        sub => sub._id === form.subcategory
                      );
                      if (!selectedSubcategory) {
                        Alert.alert('Xato', 'Iltimos, to\'g\'ri subkategoriyani tanlang');
                        return;
                      }
                    }

                    // Prepare the request body with all required fields
                    const requestBody = {
                      name: form.name,
                      category: selectedCategory._id,
                      subcategory: form.subcategory || null,
                      price: parseFloat(form.price.toString()),
                      originalPrice: form.originalPrice ? parseFloat(form.originalPrice.toString()) : null,
                      unit: form.unit,
                      unitSize: parseFloat(form.unitSize.toString()) || 1,
                      inventory: form.inventory || 0,
                      type: 'non-food'  // Default type as per API response
                    };

                    console.log('Updating product with data:', JSON.stringify(requestBody, null, 2));

                    const response = await fetch(`http://164.68.110.82:5000/api/products/${editingFullScreen._id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(requestBody),
                    });

                    const data = await response.json();
                    if (response.status === 200) {
                      setEditingFullScreen(null);
                      fetchProducts(1, true);
                      Alert.alert('Muvaffaqiyatli', 'Mahsulot yangilandi');
                    } else {
                      console.error('Update failed:', data);
                      Alert.alert('Xato', data.message || 'Mahsulotni yangilashda xatolik yuz berdi');
                    }
                  } catch (error) {
                    console.error('Update error:', error);
                    Alert.alert('Xato', 'Mahsulotni yangilashda xatolik yuz berdi');
                  }
                }}
                onClose={() => setEditingFullScreen(null)}
              />
            </Modal>
          )}
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
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 30,
    paddingTop: 10,
  },
  listContent: {
    flexGrow: 1,
  },
  loadingMore: {
    padding: 10,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  productCard: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  inventoryControls: {
    flexDirection: 'row',
  },
  inventoryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  decreaseButton: {
    backgroundColor: '#FF3B30',
  },
  increaseButton: {
    backgroundColor: '#4CD964',
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
    maxHeight: '80%',
    height: '80%',
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  categoryList: {
    marginBottom: 16,
    height: '100%',
    maxHeight: '100%',
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  selectedItem: {
    backgroundColor: '#007AFF',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedItemText: {
    color: '#fff',
  },
  subcategoryList: {
    marginLeft: 16,
  },
  subcategoryItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  subcategoryItemText: {
    fontSize: 14,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
    marginHorizontal: 4,
  },
  unitList: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  unitItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  unitItemText: {
    fontSize: 14,
    color: '#333',
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
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  applyButton: {
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
    padding: 10,
    borderRadius: 10,
    fontWeight: '500',
  },
  resetButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButtonText: {
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
  viewButton: {
    backgroundColor: '#5856D6',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  viewScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  viewScreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewScreenContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editScreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  editTabText: {
    fontSize: 16,
    color: '#666',
  },
  editTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  editScreenContent: {
    flex: 1,
    padding: 16,
  },
  editSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  editRow: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  editHalfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  editFullInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  editInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  unitsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  unitButtonActive: {
    backgroundColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 16,
    color: '#666',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  subcategoriesContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  subcategoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  subcategoryButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F5F8FF',
  },
  subcategoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  subcategoryButtonTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  editSaveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});