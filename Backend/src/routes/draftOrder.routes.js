const router = require('express').Router();
const DraftOrder = require('../models/draftOrder.model');
const OrderHistory = require('../models/orderHistory.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth.middleware');
const sellerAuth = require('../middleware/sellerAuth.middleware');

// Vaqtinchalik buyurtmani saqlash
router.post('/draft', verifyToken, sellerAuth, async (req, res) => {
    try {
        const { products, totalSum, timestamp } = req.body;

        // Mahsulotlarni tekshirish
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mahsulotlar ro\'yxati bo\'sh bo\'lishi mumkin emas'
            });
        }

        // Sotuvchining to'liq ma'lumotlarini olish
        const seller = await mongoose.model('Seller').findById(req.user._id).populate('storeOwner');
        if (!seller || !seller.storeOwner) {
            return res.status(400).json({
                success: false,
                message: 'Sotuvchi ma\'lumotlari topilmadi yoki do\'kon egasi biriktirilmagan'
            });
        }

        // Yangi draft order yaratish
        const draftOrder = new DraftOrder({
            seller: new mongoose.Types.ObjectId(req.user._id),
            storeOwner: seller.storeOwner._id, // Sotuvchining do'kon egasi
            products,
            totalSum,
            timestamp: timestamp || new Date()
        });

        await draftOrder.save();

        // Yaratilgan orderni seller ma'lumotlari bilan qaytarish
        const populatedOrder = await DraftOrder.findById(draftOrder._id)
            .populate({
                path: 'seller',
                select: 'name username status',
                model: 'Seller'
            });

        res.status(201).json({
            success: true,
            data: populatedOrder
        });
    } catch (error) {
        console.error('Error creating draft order:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Vaqtinchalik buyurtmalarni olish
router.get('/drafts', verifyToken, sellerAuth, async (req, res) => {
    try {
        // Filter yaratish
        const filter = {};
        
        // Agar foydalanuvchi seller bo'lsa, faqat o'zining draft orderlarini ko'rsatish
        if (!req.user.isAdmin) {
            filter.seller = new mongoose.Types.ObjectId(req.user._id);
        }

        const draftOrders = await DraftOrder.find(filter)
            .populate({
                path: 'seller',
                select: 'name username status',
                model: 'Seller'
            })
            .sort({ timestamp: -1 }); // Eng yangi orderlar tepada
        
        res.json({
            success: true,
            data: draftOrders
        });
    } catch (error) {
        console.error('Error getting draft orders:', error);
        res.status(500).json({
            success: false,
            message: 'Draft orderlarni olishda xatolik yuz berdi',
            error: error.message
        });
    }
});

// Stol bo'yicha draft orderlarni olish
router.get('/drafts/table/:table', verifyToken, async (req, res) => {
    try {
        const { table } = req.params;
        
        const filter = { table };
        if (!req.user.isAdmin) {
            filter.seller = new mongoose.Types.ObjectId(req.user._id);
        }

        const draftOrders = await DraftOrder.find(filter)
            .populate({
                path: 'seller',
                select: 'name username status',
                model: 'Seller'
            })
            .sort({ timestamp: -1 });
        
        res.json({
            success: true,
            data: draftOrders
        });
    } catch (error) {
        console.error('Error getting table draft orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Bitta vaqtinchalik buyurtmani olish
router.get('/draft/:id', verifyToken, sellerAuth, async (req, res) => {
    try {
        const draftOrder = await DraftOrder.findById(req.params.id)
            .populate({
                path: 'seller',
                select: 'name username status',
                model: 'Seller'
            });

        if (!draftOrder) {
            return res.status(404).json({
                success: false,
                message: 'Vaqtinchalik buyurtma topilmadi'
            });
        }

        // Faqat o'z draft orderlarini ko'rish mumkin
        if (!req.user.isAdmin && draftOrder.seller._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bu draft orderni ko\'rish huquqi yo\'q'
            });
        }

        res.json({
            success: true,
            data: draftOrder
        });
    } catch (error) {
        console.error('Error getting draft order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Vaqtinchalik buyurtmani yangilash
router.put('/draft/:id', verifyToken, sellerAuth, async (req, res) => {
    try {
        const { products, totalSum, timestamp } = req.body;

        // Mahsulotlarni tekshirish
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mahsulotlar ro\'yxati bo\'sh bo\'lishi mumkin emas'
            });
        }

        // Sotuvchining to'liq ma'lumotlarini olish
        const seller = await mongoose.model('Seller').findById(req.user._id).populate('storeOwner');
        if (!seller || !seller.storeOwner) {
            return res.status(400).json({
                success: false,
                message: 'Sotuvchi ma\'lumotlari topilmadi yoki do\'kon egasi biriktirilmagan'
            });
        }

        // Draft orderni topish va yangilash
        const updatedOrder = await DraftOrder.findOneAndUpdate(
            { 
                _id: req.params.id, 
                seller: req.user._id,
                storeOwner: seller.storeOwner._id 
            },
            { 
                products,
                totalSum,
                timestamp: timestamp || new Date(),
                storeOwner: seller.storeOwner._id 
            },
            { new: true, runValidators: true }
        ).populate({
            path: 'seller',
            select: 'name username status',
            model: 'Seller'
        });

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: 'Buyurtma topilmadi yoki sizga ruxsat yo\'q'
            });
        }

        res.json({
            success: true,
            data: updatedOrder
        });
    } catch (error) {
        console.error('Error updating draft order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Vaqtinchalik buyurtmani o'chirish
router.delete('/draft/:id', verifyToken, sellerAuth, async (req, res) => {
    try {
        const draftOrder = await DraftOrder.findById(req.params.id);
        
        if (!draftOrder) {
            return res.status(404).json({
                success: false,
                message: 'Draft order topilmadi'
            });
        }

        // Faqat o'z draft orderlarini o'chirish mumkin
        if (!req.user.isAdmin && draftOrder.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bu draft orderni o\'chirish huquqi yo\'q'
            });
        }

        await DraftOrder.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'Draft order o\'chirildi'
        });
    } catch (error) {
        console.error('Error deleting draft order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Vaqtinchalik buyurtmani tasdiqlash
router.post('/draft/:id/confirm', verifyToken, sellerAuth, async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        
        // Sotuvchining to'liq ma'lumotlarini olish
        const seller = await mongoose.model('Seller').findById(req.user._id).populate('storeOwner');
        if (!seller || !seller.storeOwner) {
            return res.status(400).json({
                success: false,
                message: 'Sotuvchi ma\'lumotlari topilmadi yoki do\'kon egasi biriktirilmagan'
            });
        }

        // Draft orderni topish va tekshirish
        const draftOrder = await DraftOrder.findOne({
            _id: req.params.id,
            storeOwner: seller.storeOwner._id // StoreOwner bo'yicha filter qo'shamiz
        })
        .populate({
            path: 'seller',
            select: 'name username status',
            model: 'Seller'
        })
        .populate({
            path: 'products.productId',
            select: 'name price unit unitSize inventory type'
        });

        if (!draftOrder) {
            return res.status(404).json({
                success: false,
                message: 'Draft order topilmadi'
            });
        }

        // Faqat o'z draft orderlarini tasdiqlash mumkin
        if (!req.user.isAdmin && draftOrder.seller._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bu draft orderni tasdiqlash huquqi yo\'q'
            });
        }

        // Mahsulotlar inventoryni tekshirish va yangilash
        const updatedProducts = [];
        for (const item of draftOrder.products) {
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

            // Product ma'lumotlarini to'ldirish
            updatedProducts.push({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                unit: product.unit || 'dona',
                unitSize: product.unitSize || 1
            });
        }

        // Yangi order yaratish
        const order = new OrderHistory({
            orderId: draftOrder.orderId,
            seller: draftOrder.seller._id,
            storeOwner: seller.storeOwner._id, // StoreOwner qo'shamiz
            products: updatedProducts,
            totalSum: draftOrder.totalSum,
            status: 'completed',
            paymentMethod: paymentMethod || 'cash',
            completedAt: new Date()
        });

        const savedOrder = await order.save();
        console.log('Created order:', {
            orderId: savedOrder.orderId,
            sellerId: savedOrder.seller,
            products: savedOrder.products
        });

        // Draft orderni o'chirish
        await DraftOrder.findByIdAndDelete(draftOrder._id);

        // Yaratilgan orderni to'liq ma'lumotlar bilan qaytarish
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
        console.error('Error confirming draft order:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
