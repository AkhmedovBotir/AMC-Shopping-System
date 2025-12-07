const express = require('express');
const Sale = require('../models/sale.model');
const Product = require('../models/product.model');
const { verifyToken } = require('../middleware/auth.middleware');
const sellerAuth = require('../middleware/sellerAuth.middleware');

const router = express.Router();

// Yangi sotuv yaratish
router.post('/', verifyToken, sellerAuth, async (req, res) => {
    try {
        const sale = new Sale({
            ...req.body,
            seller: req.seller._id // Avtorizatsiya qilingan sotuvchini qo'shish
        });
        await sale.save();
        await sale.populate('product seller');

        // WebSocket orqali xabar yuborish
        req.wsHandlers.broadcastNewSale(sale);
        
        res.status(201).json(sale);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Barcha sotuvlarni olish (faqat admin)
router.get('/', verifyToken, sellerAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        
        // Filter yaratish
        const filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        
        // Pagination
        const skip = (page - 1) * limit;
        
        const [sales, total] = await Promise.all([
            Sale.find(filter)
            .populate('product', 'name type properties')
                .populate('seller', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Sale.countDocuments(filter)
        ]);
        
        res.json({
            success: true,
            data: sales,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvni ID bo'yicha olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const sale = await Sale.findOne({
            _id: req.params.id,
            $or: [
                { seller: req.seller._id }, // O'zining sotuvi
                { isAdmin: true } // Admin uchun barcha sotuvlar
            ]
        })
        .populate('product', 'name type properties')
        .populate('seller', 'name');

        if (!sale) {
            return res.status(404).json({ message: 'Sotuv topilmadi' });
        }
        res.json({
            success: true,
            data: sale
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvchi bo'yicha sotuvlarni olish
router.get('/seller/:sellerId', verifyToken, async (req, res) => {
    try {
        // Faqat o'zining sotuvlarini yoki admin bo'lsa barcha sotuvlarni ko'rish
        if (!req.seller.isAdmin && req.params.sellerId !== req.seller._id.toString()) {
            return res.status(403).json({ message: 'Sizda bu ma\'lumotlarni ko\'rish huquqi yo\'q' });
        }

        const { page = 1, limit = 10, startDate, endDate } = req.query;
        
        // Filter yaratish
        const filter = { seller: req.params.sellerId };
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        
        // Pagination
        const skip = (page - 1) * limit;
        
        const [sales, total] = await Promise.all([
            Sale.find(filter)
            .populate('product', 'name type properties')
                .populate('seller', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Sale.countDocuments(filter)
        ]);
        
        res.json({
            success: true,
            data: sales,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Statistika (faqat admin)
router.get('/statistics/summary', verifyToken, sellerAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Filter yaratish
        const filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }
        
        const stats = await Sale.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $group: {
                    _id: {
                        product: '$product._id',
                        productName: '$product.name',
                        productType: '$product.type'
                    },
                    totalQuantity: { $sum: '$quantity' },
                    totalSales: { $sum: 1 },
                    totalAmount: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvni bekor qilish
router.patch('/:id/cancel', verifyToken, sellerAuth, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('product');
        
        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sotuv topilmadi'
            });
        }

        // Faqat o'zining sotuvini yoki admin bo'lsa bekor qilish mumkin
        if (!req.seller.isAdmin && sale.seller.toString() !== req.seller._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bu sotuvni bekor qilish huquqi yo\'q'
            });
        }

        // Agar sotuv allaqachon bekor qilingan bo'lsa
        if (sale.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Bu sotuv allaqachon bekor qilingan'
            });
        }

        // Mahsulot inventarizatsiyasini qayta tiklash
        const product = await Product.findById(sale.product._id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Mahsulot topilmadi'
            });
        }

        // Inventarizatsiyani yangilash
        product.inventory += sale.quantity;
        await product.save();

        // Sotuvni bekor qilish
        sale.status = 'cancelled';
        sale.cancelledAt = new Date();
        sale.cancelledBy = req.seller._id;
        sale.cancelReason = req.body.reason || 'Sotuvchi tomonidan bekor qilindi';

        await sale.save();

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifySaleCancelled(sale);
            // Mahsulot inventarizatsiyasi o'zgarganini ham xabar qilish
            req.wsHandlers.notifyProductInventoryUpdated(product);
        }

        // Activity logga yozish
        const ActivityLog = require('../models/activityLog.model');
        await ActivityLog.create({
            user: req.seller._id,
            action: 'sale_cancelled',
            details: {
                saleId: sale._id,
                reason: sale.cancelReason,
                products: {
                    id: sale.product._id,
                    name: sale.product.name,
                    quantity: sale.quantity,
                    restoredInventory: product.inventory
                }
            },
            status: 'success'
        });

        res.json({
            success: true,
            data: {
                sale,
                restoredProduct: {
                    id: product._id,
                    name: product.name,
                    newInventory: product.inventory
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
