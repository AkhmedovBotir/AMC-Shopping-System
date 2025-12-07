const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const OrderHistory = require('../models/orderHistory.model');
const User = require('../models/user.model');
const { verifyToken } = require('../middleware/auth.middleware');
const storeOwnerAuth = require('../middleware/storeOwnerAuth.middleware');
const Seller = require('../models/seller.model');

const router = express.Router();

// 1. Ombordagi barcha statistikani olish (admin va do'kon egalari uchun)
router.get('/warehouse', verifyToken, storeOwnerAuth, async (req, res) => {
    // Agar admin bo'lsa, barcha do'konlar uchun, aks holda faqat o'z do'koni uchun
    const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
    try {
        // Barcha mahsulotlar bo'yicha statistika
        const productsMatch = {};
        if (storeOwnerId) {
            productsMatch.storeOwner = new mongoose.Types.ObjectId(storeOwnerId);
        }

        const productsStats = await Product.aggregate([
            {
                $match: productsMatch
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalQuantity: { $sum: '$inventory' },
                    totalValue: { 
                        $sum: { $multiply: ['$inventory', '$price'] }
                    }
                }
            }
        ]);

        // Kategoriyalar bo'yicha statistika
        const categoryMatch = {};
        if (storeOwnerId) {
            categoryMatch.storeOwner = new mongoose.Types.ObjectId(storeOwnerId);
        }

        const categoryStats = await Product.aggregate([
            {
                $match: categoryMatch
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $match: storeOwnerId 
                    ? { 'category.storeOwner': new mongoose.Types.ObjectId(storeOwnerId) }
                    : {}
            },
            {
                $group: {
                    _id: {
                        categoryId: '$category._id',
                        categoryName: '$category.name'
                    },
                    productsCount: { $sum: 1 },
                    totalQuantity: { $sum: '$inventory' },
                    totalValue: { 
                        $sum: { $multiply: ['$inventory', '$price'] }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id.categoryId',
                    categoryName: '$_id.categoryName',
                    productsCount: 1,
                    totalQuantity: 1,
                    totalValue: 1
                }
            }
        ]);

        // Eng ko'p qolgan mahsulotlar (top 10)
        const topProductsMatch = {};
        if (storeOwnerId) {
            topProductsMatch.storeOwner = new mongoose.Types.ObjectId(storeOwnerId);
        }

        const topProducts = await Product.aggregate([
            {
                $match: topProductsMatch
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $match: storeOwnerId 
                    ? { 'category.storeOwner': new mongoose.Types.ObjectId(storeOwnerId) }
                    : {}
            },
            {
                $sort: { inventory: -1 }
            },
            {
                $limit: 10
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    inventory: 1,
                    price: 1,
                    totalValue: { $multiply: ['$inventory', '$price'] },
                    category: '$category.name',
                    unit: 1,
                    unitSize: 1
                }
            }
        ]);

        // Kam qolgan mahsulotlar (10 ta)
        const lowStockMatch = {
            inventory: { $lt: 10 },
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };

        const lowStockProducts = await Product.aggregate([
            {
                $match: lowStockMatch
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $match: storeOwnerId 
                    ? { 'category.storeOwner': new mongoose.Types.ObjectId(storeOwnerId) }
                    : {}
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    inventory: 1,
                    price: 1,
                    totalValue: { $multiply: ['$inventory', '$price'] },
                    category: '$category.name',
                    unit: 1,
                    unitSize: 1
                }
            },
            {
                $sort: { inventory: 1 }
            },
            {
                $limit: 10
            }
        ]);

        // Mahsulotlar bo'yicha sotuvlar tarixi (oxirgi 30 kun)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesMatch = {
            createdAt: { $gte: thirtyDaysAgo }
        };
        
        if (storeOwnerId) {
            salesMatch.storeOwner = new mongoose.Types.ObjectId(storeOwnerId);
        }

        const productSalesHistory = await OrderHistory.aggregate([
            {
                $match: salesMatch
            },
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: {
                        productId: '$products.productId',
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    quantity: { $sum: '$products.quantity' },
                    amount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            {
                $group: {
                    _id: '$_id.productId',
                    dailyStats: {
                        $push: {
                            date: '$_id.date',
                            quantity: '$quantity',
                            amount: '$amount'
                        }
                    },
                    totalQuantitySold: { $sum: '$quantity' },
                    totalAmountSold: { $sum: '$amount' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $project: {
                    name: '$product.name',
                    inventory: '$product.inventory',
                    price: '$product.price',
                    category: '$category.name',
                    unit: '$product.unit',
                    unitSize: '$product.unitSize',
                    dailyStats: 1,
                    totalQuantitySold: 1,
                    totalAmountSold: 1,
                    averageDailySales: { $divide: ['$totalQuantitySold', 30] }
                }
            },
            {
                $sort: { totalQuantitySold: -1 }
            }
        ]);

        res.json({
            success: true,
            data: {
                overview: productsStats[0] || {
                    totalProducts: 0,
                    totalQuantity: 0,
                    totalValue: 0
                },
                categoryStats,
                topProducts,
                lowStockProducts,
                productSalesHistory
            }
        });

    } catch (error) {
        console.error('Warehouse statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Statistikani olishda xatolik yuz berdi'
        });
    }
});

// 2. Sotuvlar statistikasi (admin va do'kon egalari uchun)
router.get('/sales', verifyToken, storeOwnerAuth, async (req, res) => {
    // Agar admin bo'lsa, barcha do'konlar uchun, aks holda faqat o'z do'koni uchun
    const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
    try {
        const { startDate, endDate } = req.query;
        const dateFilter = {
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };
        
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Umumiy sotuvlar statistikasi
        const salesStats = await OrderHistory.aggregate([
            { 
                $match: dateFilter 
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            }
        ]);

        // Kunlik sotuvlar
        const dailySales = await OrderHistory.aggregate([
            { 
                $match: dateFilter 
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    salesCount: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
        ]);

        // Eng ko'p sotilgan mahsulotlar
        const topSellingProducts = await OrderHistory.aggregate([
            { 
                $match: dateFilter 
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.productId',
                    productName: { $first: '$products.name' },
                    totalQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: { $multiply: ['$products.price', '$products.quantity'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            data: {
                overview: salesStats[0] || {
                    totalSales: 0,
                    totalAmount: 0
                },
                dailySales,
                topSellingProducts
            }
        });

    } catch (error) {
        console.error('Sales statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Sotuvlar statistikasini olishda xatolik yuz berdi'
        });
    }
});

// 3. Kunlik statistika (admin va do'kon egalari uchun)
router.get('/daily', verifyToken, storeOwnerAuth, async (req, res) => {
    // Agar admin bo'lsa, barcha do'konlar uchun, aks holda faqat o'z do'koni uchun
    const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Asosiy statistika
        const dailyMatch = {
            createdAt: { $gte: today, $lt: tomorrow },
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };
        
        const dailyStats = await OrderHistory.aggregate([
            {
                $match: dailyMatch
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            }
        ]);

        // Soatlik statistika
        const hourlyStats = await OrderHistory.aggregate([
            {
                $match: dailyMatch
            },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    salesCount: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // To'lov usuli bo'yicha statistika
        const paymentStats = await OrderHistory.aggregate([
            {
                $match: dailyMatch
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$totalSum' }
                }
            }
        ]);

        // Eng ko'p sotilgan mahsulotlar
        const topProducts = await OrderHistory.aggregate([
            {
                $match: dailyMatch
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.productId',
                    name: { $first: '$products.name' },
                    totalQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        // Kam qolgan mahsulotlar
        const lowStockProducts = await Product.aggregate([
            {
                $match: {
                    inventory: { $lt: 10 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $project: {
                    name: 1,
                    inventory: 1,
                    price: 1,
                    category: '$category.name'
                }
            },
            { $sort: { inventory: 1 } },
            { $limit: 10 }
        ]);

        // Mahsulotlar bo'yicha sotuvlar tarixi
        const productSalesHistory = await OrderHistory.aggregate([
            {
                $match: {
                    ...dailyMatch,
                    createdAt: { $gte: today, $lt: tomorrow }
                }
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: {
                        productId: '$products.productId',
                        hour: { $hour: '$createdAt' }
                    },
                    name: { $first: '$products.name' },
                    quantity: { $sum: '$products.quantity' },
                    amount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            {
                $group: {
                    _id: '$_id.productId',
                    name: { $first: '$name' },
                    hourlyStats: {
                        $push: {
                            hour: '$_id.hour',
                            quantity: '$quantity',
                            amount: '$amount'
                        }
                    },
                    totalQuantity: { $sum: '$quantity' },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalSales: dailyStats[0]?.totalSales || 0,
                totalAmount: dailyStats[0]?.totalAmount || 0,
                hourlyStats: hourlyStats.map(stat => ({
                    hour: stat._id,
                    salesCount: stat.salesCount,
                    totalAmount: stat.totalAmount
                })),
                paymentMethods: Object.fromEntries(
                    paymentStats.map(stat => [stat._id, stat.totalAmount])
                ),
                topProducts,
                lowStockProducts,
                productSalesHistory
            }
        });

    } catch (error) {
        console.error('Daily statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Kunlik statistikani olishda xatolik yuz berdi'
        });
    }
});

// 4. Haftalik statistika (admin va do'kon egalari uchun)
router.get('/weekly', verifyToken, storeOwnerAuth, async (req, res) => {
    // Agar admin bo'lsa, barcha do'konlar uchun, aks holda faqat o'z do'koni uchun
    const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Asosiy statistika
        const weeklyMatch = {
            createdAt: { $gte: weekStart, $lt: weekEnd },
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };

        const weeklyStats = await OrderHistory.aggregate([
            {
                $match: weeklyMatch
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            }
        ]);

        // Kunlik statistika
        const dailyStats = await OrderHistory.aggregate([
            {
                $match: weeklyMatch
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    salesCount: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // To'lov usuli bo'yicha statistika
        const paymentStats = await OrderHistory.aggregate([
            {
                $match: weeklyMatch
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$totalSum' }
                }
            }
        ]);

        // Eng ko'p sotilgan mahsulotlar
        const topProducts = await OrderHistory.aggregate([
            {
                $match: weeklyMatch
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.productId',
                    name: { $first: '$products.name' },
                    totalQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        // Do'kon filterini yaratish
        const storeFilter = storeOwnerId ? { storeOwner: new mongoose.Types.ObjectId(storeOwnerId) } : {};
        
        // Kam qolgan mahsulotlar
        const lowStockMatch = {
            inventory: { $lt: 10 },
            ...storeFilter
        };
        
        const lowStockProducts = await Product.aggregate([
            {
                $match: lowStockMatch
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $project: {
                    name: 1,
                    inventory: 1,
                    price: 1,
                    category: '$category.name'
                }
            },
            { $sort: { inventory: 1 } },
            { $limit: 10 }
        ]);

        // Mahsulotlar bo'yicha sotuvlar tarixi
        const productSalesHistory = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: weekStart, $lt: weekEnd }
                }
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: {
                        productId: '$products.productId',
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    name: { $first: '$products.name' },
                    quantity: { $sum: '$products.quantity' },
                    amount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            {
                $group: {
                    _id: '$_id.productId',
                    name: { $first: '$name' },
                    dailyStats: {
                        $push: {
                            date: '$_id.date',
                            quantity: '$quantity',
                            amount: '$amount'
                        }
                    },
                    totalQuantity: { $sum: '$quantity' },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                totalSales: weeklyStats[0]?.totalSales || 0,
                totalAmount: weeklyStats[0]?.totalAmount || 0,
                dailyStats: dailyStats.map(stat => ({
                    date: stat._id,
                    salesCount: stat.salesCount,
                    totalAmount: stat.totalAmount
                })),
                paymentMethods: Object.fromEntries(
                    paymentStats.map(stat => [stat._id, stat.totalAmount])
                ),
                topProducts,
                lowStockProducts,
                productSalesHistory
            }
        });

    } catch (error) {
        console.error('Weekly statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Haftalik statistikani olishda xatolik yuz berdi'
        });
    }
});

// 5. Oylik statistika (admin va do'kon egalari uchun)
router.get('/monthly', verifyToken, storeOwnerAuth, async (req, res) => {
    // Agar admin bo'lsa, barcha do'konlar uchun, aks holda faqat o'z do'koni uchun
    const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
    try {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        // Do'kon filterini yaratish
        const storeFilter = storeOwnerId ? { storeOwner: new mongoose.Types.ObjectId(storeOwnerId) } : {};

        // Umumiy statistika
        const monthlyStats = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lte: monthEnd },
                    ...storeFilter
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'storeOwner',
                    foreignField: '_id',
                    as: 'storeOwnerInfo'
                }
            },
            {
                $unwind: {
                    path: '$storeOwnerInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' },
                    storeInfo: {
                        $first: {
                            storeName: '$storeOwnerInfo.name',
                            storeUsername: '$storeOwnerInfo.username'
                        }
                    }
                }
            }
        ]);

        // Haftalik statistika
        const weeklyStats = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lte: monthEnd },
                    ...storeFilter
                }
            },
            {
                $group: {
                    _id: { $week: '$createdAt' },
                    salesCount: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // To'lov usullari bo'yicha statistika
        const paymentStats = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lte: monthEnd },
                    ...storeFilter
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$totalSum' }
                }
            }
        ]);

        // Eng ko'p sotilgan mahsulotlar (top 5)
        const topProducts = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lte: monthEnd },
                    ...storeFilter
                }
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.productId',
                    name: { $first: '$products.name' },
                    totalQuantity: { $sum: '$products.quantity' },
                    totalAmount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        // Kam qolgan mahsulotlar
        const lowStockProducts = await Product.aggregate([
            {
                $match: {
                    inventory: { $lt: 10 }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $project: {
                    name: 1,
                    inventory: 1,
                    price: 1,
                    category: '$category.name'
                }
            },
            { $sort: { inventory: 1 } },
            { $limit: 10 }
        ]);

        // Mahsulotlar bo'yicha sotuvlar tarixi
        const productSalesHistory = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lte: monthEnd },
                    ...storeFilter
                }
            },
            { $unwind: '$products' },
            {
                $group: {
                    _id: {
                        productId: '$products.productId',
                        week: { $week: '$createdAt' }
                    },
                    name: { $first: '$products.name' },
                    quantity: { $sum: '$products.quantity' },
                    amount: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            {
                $group: {
                    _id: '$_id.productId',
                    name: { $first: '$name' },
                    weeklyStats: {
                        $push: {
                            week: '$_id.week',
                            quantity: '$quantity',
                            amount: '$amount'
                        }
                    },
                    totalQuantity: { $sum: '$quantity' },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                storeInfo: monthlyStats[0]?.storeInfo || null,
                totalSales: monthlyStats[0]?.totalSales || 0,
                totalAmount: monthlyStats[0]?.totalAmount || 0,
                weeklyStats: weeklyStats.map(stat => ({
                    week: stat._id,
                    salesCount: stat.salesCount,
                    totalAmount: stat.totalAmount
                })),
                paymentMethods: Object.fromEntries(
                    paymentStats.map(stat => [stat._id, stat.totalAmount])
                ),
                topProducts,
                lowStockProducts,
                productSalesHistory
            }
        });

    } catch (error) {
        console.error('Monthly statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Oylik statistikani olishda xatolik yuz berdi'
        });
    }
});

// 6. Sotuvchilar statistikasi (admin va do'kon egalari uchun)
router.get('/sellers', verifyToken, storeOwnerAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
        
        // Sana filtrini yaratish
        const dateFilter = {};
        let start, end;
        
        if (startDate && endDate) {
            start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt = { $gte: start, $lte: end };
        }

        // Sotuvlar bo'yicha filter
        const salesMatch = { ...dateFilter };
        if (storeOwnerId) {
            salesMatch.storeOwner = new mongoose.Types.ObjectId(storeOwnerId);
        }

        // 1. Sotuvchilar bo'yicha asosiy statistika
        const sellerStats = await OrderHistory.aggregate([
            { $match: salesMatch },
            {
                $lookup: {
                    from: 'sellers',
                    localField: 'seller',
                    foreignField: '_id',
                    as: 'sellerInfo'
                }
            },
            { $unwind: '$sellerInfo' },
            {
                $group: {
                    _id: '$seller',
                    name: { $first: '$sellerInfo.name' },
                    username: { $first: '$sellerInfo.username' },
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' },
                    firstOrderDate: { $min: '$createdAt' },
                    lastOrderDate: { $max: '$createdAt' },
                    orders: {
                        $push: {
                            orderId: '$orderId',
                            totalSum: '$totalSum',
                            products: '$products',
                            createdAt: '$createdAt',
                            status: '$status',
                            paymentMethod: '$paymentMethod'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    sellerId: '$_id',
                    name: 1,
                    username: 1,
                    totalOrders: 1,
                    totalAmount: 1,
                    averageOrderAmount: { $divide: ['$totalAmount', '$totalOrders'] },
                    firstOrderDate: 1,
                    lastOrderDate: 1,
                    orders: {
                        $sortArray: {
                            input: '$orders',
                            sortBy: { createdAt: -1 }
                        }
                    }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // 2. Mahsulotlar bo'yicha statistika
        const productStats = await OrderHistory.aggregate([
            { $match: salesMatch },
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'sellers',
                    localField: 'seller',
                    foreignField: '_id',
                    as: 'sellerInfo'
                }
            },
            { $unwind: '$sellerInfo' },
            {
                $group: {
                    _id: {
                        sellerId: '$seller',
                        productId: '$products.productId',
                        name: '$products.name'
                    },
                    sellerName: { $first: '$sellerInfo.name' },
                    quantity: { $sum: '$products.quantity' },
                    price: { $first: '$products.price' },
                    totalAmount: { 
                        $sum: { $multiply: ['$products.quantity', '$products.price'] } 
                    },
                    lastSold: { $max: '$createdAt' }
                }
            },
            {
                $group: {
                    _id: '$_id.sellerId',
                    sellerName: { $first: '$sellerName' },
                    products: {
                        $push: {
                            productId: '$_id.productId',
                            name: '$_id.name',
                            quantity: '$quantity',
                            price: '$price',
                            totalAmount: '$totalAmount',
                            lastSold: '$lastSold'
                        }
                    },
                    totalProducts: { $sum: '$quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    sellerId: '$_id',
                    sellerName: 1,
                    products: {
                        $sortArray: {
                            input: '$products',
                            sortBy: { totalAmount: -1 }
                        }
                    },
                    totalProducts: 1
                }
            }
        ]);

        // 3. Sotuvchilar va mahsulotlarni birlashtirish
        const sellersWithProducts = sellerStats.map(seller => {
            const productsInfo = productStats.find(p => p.sellerId && seller.sellerId && 
                p.sellerId.toString() === seller.sellerId.toString());
            
            return {
                ...seller,
                totalProducts: productsInfo?.totalProducts || 0,
                topProducts: productsInfo?.products.slice(0, 5) || [],
                allProducts: productsInfo?.products || []
            };
        });

        // 4. Umumiy statistika
        const overallStats = await OrderHistory.aggregate([
            { $match: salesMatch },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' },
                    averageOrderAmount: { $avg: '$totalSum' },
                    minOrderAmount: { $min: '$totalSum' },
                    maxOrderAmount: { $max: '$totalSum' },
                    firstOrderDate: { $min: '$createdAt' },
                    lastOrderDate: { $max: '$createdAt' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOrders: 1,
                    totalAmount: 1,
                    averageOrderAmount: 1,
                    minOrderAmount: 1,
                    maxOrderAmount: 1,
                    firstOrderDate: 1,
                    lastOrderDate: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                sellers: sellersWithProducts,
                overall: overallStats[0] || {
                    totalOrders: 0,
                    totalAmount: 0,
                    averageOrderAmount: 0,
                    minOrderAmount: 0,
                    maxOrderAmount: 0,
                    firstOrderDate: null,
                    lastOrderDate: null
                },
                dateRange: startDate && endDate ? {
                    startDate: start,
                    endDate: end
                } : null
            }
        });
    } catch (error) {
        console.error('Sellers statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Sotuvchilar statistikasini olishda xatolik yuz berdi'
        });
    }
});

// 7. Boshqaruv paneli uchun asosiy statistika (admin va do'kon egalari uchun)
router.get('/dashboard', verifyToken, storeOwnerAuth, async (req, res) => {
    try {
        console.log('Dashboard - User:', req.user); // Debug uchun
        
        // Agar admin bo'lsa, barcha do'konlar uchun, aks holda faqat o'z do'koni uchun
        const storeOwnerId = req.user.isAdmin ? null : (req.user.storeOwner || req.user._id);
        console.log('Dashboard - storeOwnerId:', storeOwnerId);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Bugungi sotuvlar statistikasi
        const todayMatch = {
            createdAt: { $gte: today, $lt: tomorrow },
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };
        
        const todayStats = await OrderHistory.aggregate([
            {
                $match: todayMatch
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' },
                    totalProducts: { $sum: { $size: '$products' } }
                }
            }
        ]);

        // Umumiy mahsulotlar statistikasi
        const productMatch = {
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };
        
        const productsStats = await Product.aggregate([
            {
                $match: productMatch
            },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalQuantity: { $sum: '$inventory' },
                    totalValue: { 
                        $sum: { $multiply: ['$inventory', '$price'] }
                    },
                    lowStock: {
                        $sum: {
                            $cond: [
                                { $lte: ['$inventory', '$minQuantity'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Sotuvchilar statistikasi
        const sellerMatch = {
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true },
            isAdmin: false
        };
        
        const sellersStats = await Seller.aggregate([
            {
                $match: sellerMatch
            },
            {
                $group: {
                    _id: null,
                    totalSellers: { $sum: 1 },
                    activeSellers: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'active'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Oxirgi 7 kunlik sotuvlar
        const lastWeekMatch = {
            createdAt: {
                $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                $lt: tomorrow
            },
            storeOwner: storeOwnerId ? new mongoose.Types.ObjectId(storeOwnerId) : { $exists: true }
        };
        
        const lastWeekStats = await OrderHistory.aggregate([
            {
                $match: lastWeekMatch
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    salesCount: { $sum: 1 },
                    totalAmount: { $sum: '$totalSum' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // To'lov usullari bo'yicha statistika (bugun)
        const paymentStats = await OrderHistory.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$totalSum' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                today: {
                    sales: todayStats[0]?.totalSales || 0,
                    amount: todayStats[0]?.totalAmount || 0,
                    products: todayStats[0]?.totalProducts || 0,
                    payments: paymentStats.reduce((acc, curr) => {
                        acc[curr._id] = {
                            amount: curr.totalAmount,
                            count: curr.count
                        };
                        return acc;
                    }, {})
                },
                products: {
                    total: productsStats[0]?.totalProducts || 0,
                    quantity: productsStats[0]?.totalQuantity || 0,
                    value: productsStats[0]?.totalValue || 0,
                    lowStock: productsStats[0]?.lowStock || 0
                },
                sellers: {
                    total: sellersStats[0]?.totalSellers || 0,
                    active: sellersStats[0]?.activeSellers || 0
                },
                lastWeek: lastWeekStats.map(stat => ({
                    date: stat._id,
                    sales: stat.salesCount,
                    amount: stat.totalAmount
                }))
            }
        });

    } catch (error) {
        console.error('Dashboard statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Dashboard statistikasini olishda xatolik yuz berdi'
        });
    }
});

module.exports = router;
