const router = require('express').Router();
const OrderHistory = require('../models/orderHistory.model');
const Counter = require('../models/counter.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth.middleware');
const sellerAuth = require('../middleware/sellerAuth.middleware');

// Counter orqali yangi orderId olish
async function getNextOrderId() {
    return await Counter.getNextOrderNumber();
}

// Barcha buyurtmalar tarixini olish
router.get('/', verifyToken, async (req, res) => {
    try {
        console.log('User from token:', req.user); // Debug uchun
        
        const {
            page = 1,
            limit = 10,
            startDate,
            endDate,
            search = ''
        } = req.query;

        // Filter yaratish
        let filter = {};
        
        // Agar admin bo'lmasa, faqat o'z buyurtmalarini ko'rsatish
        if (!req.user.isAdmin) {
            // Sotuvchi yoki do'kon egasi uchun
            filter.$or = [
                { seller: req.user._id },
                { storeOwner: req.user._id }
            ];
            
            // Agar sotuvchi bo'lsa, do'kon egasining buyurtmalarini ham ko'rsatish
            if (req.user.storeOwner) {
                filter.$or.push({ storeOwner: req.user.storeOwner });
            }
            
            console.log('Filter for non-admin:', JSON.stringify(filter, null, 2));
        }

        // Sana filtri
        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);

            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime
            };
            console.log('Date filter:', JSON.stringify(filter, null, 2));
        }

        // Filter bilan buyurtmalarni olamiz
        const orders = await OrderHistory.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate({
                path: 'products.productId',
                select: 'name price unit unitSize'
            })
            .populate({
                path: 'seller',
                select: 'name username status',
                model: 'Seller'
            })
            .lean();

        const total = await OrderHistory.countDocuments(filter);

        console.log('Final filtered Orders:', orders.length);
        console.log('Total count:', total);

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    perPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Buyurtmalar olishda xatolik yuz berdi',
            error: error.message
        });
    }
});

// To'g'ridan-to'g'ri buyurtma berish
router.post('/direct-order', verifyToken, async (req, res) => {
    try {
        const { products, totalSum, paymentMethod } = req.body;

        // Sotuvchining to'liq ma'lumotlarini olish
        const seller = await mongoose.model('Seller').findById(req.user._id).populate('storeOwner');
        if (!seller || !seller.storeOwner) {
            return res.status(400).json({
                success: false,
                message: 'Sotuvchi ma\'lumotlari topilmadi yoki do\'kon egasi biriktirilmagan'
            });
        }

        // Mahsulotlar inventoryni tekshirish va yangilash
        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Mahsulot topilmadi: ${item.productId}`
                });
            }

            // Inventoryni tekshirish
            if (product.inventory < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} mahsulotidan yetarli miqdor yo'q. Mavjud: ${product.inventory}`
                });
            }

            // Inventoryni yangilash
            const newInventory = product.inventory - item.quantity;
            await Product.findByIdAndUpdate(product._id, { 
                $set: { inventory: newInventory }
            });
        }

        // Counter orqali yangi orderId olish
        const orderId = await getNextOrderId();

        console.log('Creating order with seller:', {
            sellerId: req.user._id,
            sellerName: req.user.name
        });

        // Yangi buyurtma yaratish
        const order = new OrderHistory({
            orderId,
            seller: req.user._id,
            storeOwner: seller.storeOwner._id, // StoreOwner qo'shamiz
            products: products.map(p => ({
                productId: p.productId,
                name: p.name,
                quantity: p.quantity,
                price: p.price,
                unit: p.unit,
                unitSize: p.unitSize
            })),
            totalSum,
            paymentMethod,
            status: 'completed',
            timestamp: new Date()
        });

        const savedOrder = await order.save();
        console.log('Created order:', {
            orderId: savedOrder.orderId,
            sellerId: savedOrder.seller,
            sellerInfo: await OrderHistory.findById(savedOrder._id).populate('seller', 'name username status')
        });

        // Yaratilgan buyurtmani to'liq ma'lumotlar bilan qaytarish
        const populatedOrder = await OrderHistory.findById(order._id)
            .populate({
                path: 'products.productId',
                select: 'name price unit unitSize'
            })
            .lean();

        res.status(201).json({
            success: true,
            data: populatedOrder
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Barcha tasdiqlangan buyurtmalarni olish
router.get('/completed-orders', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        
        // Filter yaratish
        const filter = { status: 'completed' };
        
        // Sana bo'yicha filtrlash
        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);

            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime
            };
        }

        // Buyurtmalar sonini olish
        const total = await OrderHistory.countDocuments(filter);

        // Buyurtmalarni olish
        const orders = await OrderHistory.find(filter)
            .populate('seller', 'name email phone role')
            .populate({
                path: 'products.productId',
                select: 'name price unit unitSize',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Umumiy summa va mahsulotlar sonini hisoblash
        const stats = await OrderHistory.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$totalSum' },
                    totalOrders: { $sum: 1 },
                    totalProducts: { $sum: { $size: '$products' } }
                }
            }
        ]);

        // To'lov usuli bo'yicha statistika
        const paymentStats = await OrderHistory.aggregate([
            { $match: filter },
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
                orders,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    perPage: parseInt(limit)
                },
                stats: stats[0] || {
                    totalAmount: 0,
                    totalOrders: 0,
                    totalProducts: 0
                },
                paymentStats: paymentStats.reduce((acc, curr) => {
                    acc[curr._id] = {
                        totalAmount: curr.totalAmount,
                        count: curr.count
                    };
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Get completed orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Buyurtmalarni olishda xatolik yuz berdi'
        });
    }
});

// Admin uchun bitta buyurtmani ko'rish
router.get('/admin/orders/:id', verifyToken, async (req, res) => {
    try {
        const order = await OrderHistory.findById(req.params.id)
            .populate({
                path: 'products.productId',
                select: 'name price unit unitSize'
            })
            .populate({
                path: 'seller',
                select: 'name username status'
            })
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Buyurtma topilmadi'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Bitta buyurtma tarixini olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const order = await OrderHistory.findOne({
            _id: req.params.id,
            seller: new mongoose.Types.ObjectId(req.user._id)
        })
        .populate({
            path: 'products.productId',
            select: 'name price unit unitSize'
        })
        .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Buyurtma topilmadi'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Buyurtmani bekor qilish
router.patch('/:id/cancel', verifyToken, async (req, res) => {
    try {
        const order = await OrderHistory.findById(req.params.id)
            .populate('products.productId');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Buyurtma topilmadi'
            });
        }

        // Faqat o'zining buyurtmasini yoki admin bo'lsa bekor qilish mumkin
        if (!req.user.isAdmin && order.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bu buyurtmani bekor qilish huquqi yo\'q'
            });
        }

        // Agar buyurtma allaqachon bekor qilingan bo'lsa
        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Bu buyurtma allaqachon bekor qilingan'
            });
        }

        // Har bir mahsulot uchun inventarizatsiyani qayta tiklash
        const restoredProducts = [];
        for (const item of order.products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Mahsulot topilmadi: ${item.name}`
                });
            }

            // Inventarizatsiyani yangilash
            await Product.findByIdAndUpdate(product._id, {
                $inc: { inventory: item.quantity }
            });

            restoredProducts.push({
                id: product._id,
                name: product.name,
                restoredQuantity: item.quantity,
                newInventory: product.inventory + item.quantity
            });
        }

        // Buyurtmani bekor qilish
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelledBy = req.user._id;
        order.cancelReason = req.body.reason || 'Sotuvchi tomonidan bekor qilindi';

        await order.save();

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifyOrderCancelled(order);
        }

        // Activity logga yozish
        const ActivityLog = require('../models/activityLog.model');
        await ActivityLog.create({
            user: req.user._id,
            action: 'sale_cancelled',
            details: {
                orderId: order._id,
                reason: order.cancelReason,
                restoredProducts
            },
            status: 'success'
        });

        res.json({
            success: true,
            data: {
                order,
                restoredProducts
            }
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
