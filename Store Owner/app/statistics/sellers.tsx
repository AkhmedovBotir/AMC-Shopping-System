import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Seller {
    _id: string;
    name: string;
    username: string;
    status: 'active' | 'inactive';
}

interface Product {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    totalAmount: number;
    lastSold: string;
}

interface OrderProduct {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    unitSize: number;
    _id: string;
}

interface Order {
    orderId: number;
    totalSum: number;
    products: OrderProduct[];
    createdAt: string;
    status: 'completed' | 'cancelled';
    paymentMethod: 'cash' | 'card';
}

interface SellerStats {
    sellerId: string;
    name: string;
    username: string;
    totalOrders: number;
    totalAmount: number;
    totalProducts: number;
    averageOrderAmount: number;
    firstOrderDate: string;
    lastOrderDate: string;
    topProducts: Product[];
    allProducts: Product[];
    orders: Order[];
}

interface OverallStats {
    totalOrders: number;
    totalAmount: number;
    averageOrderAmount: number;
    minOrderAmount: number;
    maxOrderAmount: number;
    firstOrderDate: string;
    lastOrderDate: string;
}

interface DateRange {
    startDate: string;
    endDate: string;
}

interface ApiResponse {
    success: boolean;
    data: {
        sellers: SellerStats[];
        overall: OverallStats;
        dateRange: DateRange | null;
    };
}

export default function SellersStatisticsScreen() {
    const { token } = useAuth();
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [showSellerPicker, setShowSellerPicker] = useState(false);
    const [stats, setStats] = useState<{
        sellers: SellerStats[];
        overall: OverallStats;
        dateRange: DateRange | null;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateType, setDateType] = useState<'start' | 'end'>('start');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(),
    });

    const fetchSellers = async () => {
        try {
            const response = await fetch('http://164.68.110.82:5000/api/statistics/sellers', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success && data.data.sellers) {
                // Transform the sellers data to match the Seller interface
                const formattedSellers = data.data.sellers.map((seller: any) => ({
                    _id: seller.sellerId,
                    name: seller.name,
                    username: seller.username,
                    status: 'active' as const
                }));
                setSellers(formattedSellers);
                
                // If no seller is selected, select the first one
                if (formattedSellers.length > 0 && !selectedSeller) {
                    setSelectedSeller(formattedSellers[0]);
                }
                
                // Set the stats with the full data
                setStats({
                    sellers: data.data.sellers,
                    overall: data.data.overall,
                    dateRange: data.data.dateRange
                });
            }
        } catch (error) {
            console.error('Error fetching sellers:', error);
        }
    };

    const fetchStats = async () => {
        try {
            setLoading(true);
            const startDateStr = dateRange.startDate.toISOString().split('T')[0];
            const endDateStr = dateRange.endDate.toISOString().split('T')[0];
            
            // First fetch the sellers list if not already loaded
            if (sellers.length === 0) {
                await fetchSellers();
            }
            
            const response = await fetch(
                `http://164.68.110.82:5000/api/statistics/sellers`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                setStats({
                    sellers: result.data.sellers || [],
                    overall: result.data.overall,
                    dateRange: result.data.dateRange || null
                });
            } else {
                console.error('API Error:', result.message || 'Unknown error');
                setStats(null);
            }
        } catch (error) {
            console.error('Error fetching seller stats:', error);
            // Set some default data for testing
            setStats({
                sellers: [],
                overall: {
                    totalOrders: 0,
                    totalAmount: 0,
                    averageOrderAmount: 0,
                    minOrderAmount: 0,
                    maxOrderAmount: 0,
                    firstOrderDate: new Date().toISOString(),
                    lastOrderDate: new Date().toISOString()
                },
                dateRange: null
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    // No need for separate fetchStats effect since we get all data in fetchSellers

    const formatNumber = (num: number | undefined | null) => {
        if (num === undefined || num === null) return '0';
        return num.toLocaleString('uz-UZ');
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null) return '0 UZS';
        return amount.toLocaleString('uz-UZ', {
            style: 'currency',
            currency: 'UZS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('uz-UZ');
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDateRange(prev => ({
                ...prev,
                [dateType === 'start' ? 'startDate' : 'endDate']: selectedDate,
            }));
        }
    };

    const getSellerStats = () => {
        if (!stats?.sellers || !selectedSeller) return null;
        // Find the seller by sellerId
        const sellerData = stats.sellers.find(s => s.sellerId === selectedSeller._id);
        if (!sellerData) return null;
        
        // Ensure all required fields have proper defaults
        return {
            ...sellerData,
            topProducts: sellerData.topProducts || [],
            orders: sellerData.orders || [],
            allProducts: sellerData.allProducts || []
        };
    };

    const safeFormatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('uz-UZ');
        } catch (e) {
            return 'N/A';
        }
    };

    const sellerStats = getSellerStats();
    const overallStats = stats?.overall || {
        totalOrders: 0,
        totalAmount: 0,
        averageOrderAmount: 0,
        minOrderAmount: 0,
        maxOrderAmount: 0,
        firstOrderDate: new Date().toISOString(),
        lastOrderDate: new Date().toISOString()
    };

    return (
        <View style={styles.container}>
            {/* Seller Selector */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowSellerPicker(true)}
                >
                    <Text style={styles.selectorButtonText}>
                        {selectedSeller ? selectedSeller.name : "Sotuvchini tanlang"}
                    </Text>
                    <Ionicons name="chevron-down" size={24} color="#2D1B69" />
                </TouchableOpacity>
            </View>

            {/* Seller Picker Modal */}
            <Modal
                visible={showSellerPicker}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sotuvchini tanlang</Text>
                            <TouchableOpacity
                                onPress={() => setShowSellerPicker(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.sellersList}>
                            {sellers.map((seller) => (
                                <TouchableOpacity
                                    key={seller._id}
                                    style={[
                                        styles.sellerOption,
                                        selectedSeller?._id === seller._id && styles.selectedOption
                                    ]}
                                    onPress={() => {
                                        setSelectedSeller(seller);
                                        setShowSellerPicker(false);
                                        setLoading(true);
                                        fetchStats();
                                    }}
                                >
                                    <View>
                                        <Text style={[
                                            styles.sellerOptionName,
                                            selectedSeller?._id === seller._id && styles.selectedOptionText
                                        ]}>
                                            {seller.name}
                                        </Text>
                                        <Text style={[
                                            styles.sellerOptionUsername,
                                            selectedSeller?._id === seller._id && styles.selectedOptionText
                                        ]}>
                                            @{seller.username}
                                        </Text>
                                    </View>
                                    {seller.status === 'active' ? (
                                        <Text style={styles.activeStatus}>Faol</Text>
                                    ) : (
                                        <Text style={styles.inactiveStatus}>Nofaol</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Date Range Selector */}
            <View style={styles.dateRangeContainer}>
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                        setDateType('start');
                        setShowDatePicker(true);
                    }}
                >
                    <Text style={styles.dateButtonText}>
                        Boshlanish: {dateRange.startDate.toLocaleDateString('uz-UZ')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                        setDateType('end');
                        setShowDatePicker(true);
                    }}
                >
                    <Text style={styles.dateButtonText}>
                        Tugash: {dateRange.endDate.toLocaleDateString('uz-UZ')}
                    </Text>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={dateType === 'start' ? dateRange.startDate : dateRange.endDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Stats Content */}
            <ScrollView
                style={styles.statsContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2D1B69']} />
                }
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2D1B69" />
                    </View>
                ) : !selectedSeller ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="person" size={48} color="#666" />
                        <Text style={styles.emptyText}>Sotuvchini tanlang</Text>
                    </View>
                ) : !sellerStats ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
                        <Text style={styles.emptyText}>Ma'lumot topilmadi</Text>
                    </View>
                ) : (
                    <>
                        {/* Overall Stats */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Umumiy statistika</Text>
                            <View style={styles.overviewContainer}>
                                <View style={[styles.card, styles.overviewCard]}>
                                    <Ionicons name="cart-outline" size={32} color="#2D1B69" />
                                    <Text style={styles.cardValue}>{formatNumber(overallStats.totalOrders)}</Text>
                                    <Text style={styles.cardLabel}>Jami buyurtmalar</Text>
                                </View>
                                <View style={[styles.card, styles.overviewCard]}>
                                    <Ionicons name="cash-outline" size={32} color="#2D1B69" />
                                    <Text style={styles.cardValue}>{formatCurrency(overallStats.totalAmount)}</Text>
                                    <Text style={styles.cardLabel}>Jami summa</Text>
                                </View>
                            </View>
                            <View style={styles.overviewContainer}>
                                <View style={[styles.card, styles.overviewCard]}>
                                    <Ionicons name="trending-up-outline" size={32} color="#2D1B69" />
                                    <Text style={styles.cardValue}>{formatCurrency(overallStats.averageOrderAmount)}</Text>
                                    <Text style={styles.cardLabel}>O'rtacha buyurtma</Text>
                                </View>
                                <View style={[styles.card, styles.overviewCard]}>
                                    <Ionicons name="calendar-outline" size={32} color="#2D1B69" />
                                    <Text style={[styles.cardValue, {fontSize: 14}]}>
                                        {safeFormatDate(overallStats.firstOrderDate)}
                                    </Text>
                                    <Text style={[styles.cardValue, {fontSize: 14, marginTop: 4}]}>
                                        {safeFormatDate(overallStats.lastOrderDate)}
                                    </Text>
                                    <Text style={styles.cardLabel}>Birinchi/So'nggi buyurtma</Text>
                                </View>
                            </View>
                        </View>

                        {/* Seller Stats */}
                        {sellerStats && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {sellerStats.name} statistikasi
                                    <Text style={styles.sectionSubtitle}> @{sellerStats.username}</Text>
                                </Text>
                                <View style={styles.overviewContainer}>
                                    <View style={[styles.card, styles.overviewCard]}>
                                        <Ionicons name="cart-outline" size={32} color="#2D1B69" />
                                        <Text style={styles.cardValue}>{formatNumber(sellerStats.totalOrders)}</Text>
                                        <Text style={styles.cardLabel}>Buyurtmalar</Text>
                                    </View>
                                    <View style={[styles.card, styles.overviewCard]}>
                                        <Ionicons name="cash-outline" size={32} color="#2D1B69" />
                                        <Text style={styles.cardValue}>{formatCurrency(sellerStats.totalAmount)}</Text>
                                        <Text style={styles.cardLabel}>Umumiy summa</Text>
                                    </View>
                                </View>
                                <View style={styles.overviewContainer}>
                                    <View style={[styles.card, styles.overviewCard]}>
                                        <Ionicons name="cube-outline" size={32} color="#2D1B69" />
                                        <Text style={styles.cardValue}>{formatNumber(sellerStats.totalProducts)}</Text>
                                        <Text style={styles.cardLabel}>Mahsulotlar</Text>
                                    </View>
                                    <View style={[styles.card, styles.overviewCard]}>
                                        <Ionicons name="trending-up-outline" size={32} color="#2D1B69" />
                                        <Text style={styles.cardValue}>{formatCurrency(sellerStats.averageOrderAmount)}</Text>
                                        <Text style={styles.cardLabel}>O'rtacha buyurtma</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Top Products */}
                        {sellerStats.topProducts && sellerStats.topProducts.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Top mahsulotlar</Text>
                                {sellerStats.topProducts.map((product, index) => (
                                    <View 
                                        key={`product-${product.productId}-${index}`} 
                                        style={styles.productCard}
                                    >
                                        <View style={styles.productHeader}>
                                            <Text style={styles.productName}>{product.name || 'Nomsiz mahsulot'}</Text>
                                            <Text style={styles.productValue}>
                                                {formatCurrency(product.totalAmount)}
                                            </Text>
                                        </View>
                                        <View style={styles.productDetails}>
                                            <Text style={styles.productDetail}>
                                                Sotilgan soni: {formatNumber(product.quantity)} x {formatCurrency(product.price)}
                                            </Text>
                                            <Text style={styles.productDetail}>
                                                Sana: {safeFormatDate(product.lastSold)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Orders */}
                        {sellerStats.orders && sellerStats.orders.length > 0 && (
                            <View style={[styles.section, styles.lastSection]}>
                                <Text style={styles.sectionTitle}>So'nggi buyurtmalar</Text>
                                {sellerStats.orders.slice(0, 5).map((order) => (
                                    <View 
                                        key={`order-${order.orderId}`} 
                                        style={[
                                            styles.orderCard,
                                            order.status === 'cancelled' && styles.cancelledOrder
                                        ]}
                                    >
                                        <View style={styles.orderHeader}>
                                            <View>
                                                <Text style={styles.orderNumber}>#{order.orderId}</Text>
                                                <Text style={styles.orderStatus}>
                                                    {order.status === 'completed' ? 'Yakunlangan' : 'Bekor qilingan'}
                                                </Text>
                                            </View>
                                            <View style={styles.orderAmountContainer}>
                                                <Text style={styles.orderAmount}>{formatCurrency(order.totalSum)}</Text>
                                                <Text style={styles.paymentMethod}>
                                                    {order.paymentMethod === 'cash' ? 'Naqd' : 'Karta'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.orderProducts}>
                                            {order.products.map((product, index) => (
                                                <Text key={product._id} style={styles.orderProduct}>
                                                    {product.name} ({product.quantity} {product.unit})
                                                </Text>
                                            ))}
                                        </View>
                                        <Text style={styles.orderDate}>
                                            {safeFormatDate(order.createdAt)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectorButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9ff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2D1B69',
    },
    selectorButtonText: {
        fontSize: 16,
        color: '#2D1B69',
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    sellersList: {
        padding: 16,
    },
    sellerOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedOption: {
        backgroundColor: '#2D1B69',
    },
    sellerOptionName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    sellerOptionUsername: {
        fontSize: 14,
        color: '#666',
    },
    selectedOptionText: {
        color: '#fff',
    },
    dateRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    dateButton: {
        flex: 1,
        backgroundColor: '#f8f9ff',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#2D1B69',
    },
    dateButtonText: {
        color: '#2D1B69',
        fontSize: 14,
        textAlign: 'center',
    },
    statsContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    overviewContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    overviewCard: {
        width: '48%',
        alignItems: 'center',
    },
    cardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D1B69',
        marginTop: 8,
        marginBottom: 4,
    },
    cardLabel: {
        fontSize: 14,
        color: '#666',
    },
    section: {
        padding: 16,
    },
    lastSection: {
        paddingBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D1B69',
        marginBottom: 12,
        marginTop: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'normal',
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
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
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    productValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D1B69',
    },
    productDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    productDetail: {
        fontSize: 14,
        color: '#666',
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
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
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    orderAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D1B69',
    },
    orderDate: {
        fontSize: 14,
        color: '#666',
    },
    activeStatus: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
    },
    inactiveStatus: {
        fontSize: 14,
        color: '#FF6B6B',
        fontWeight: '500',
    },
    cancelledOrder: {
        opacity: 0.7,
        borderLeftColor: '#FF3B30',
    },
    orderStatus: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    orderAmountContainer: {
        alignItems: 'flex-end',
    },
    paymentMethod: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    orderProducts: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    orderProduct: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
}); 