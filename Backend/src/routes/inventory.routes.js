const express = require('express');
const Inventory = require('../models/inventory.model');
const Product = require('../models/product.model');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Yangi inventarizatsiya yaratish
router.post('/', verifyToken, async (req, res) => {
    try {
        const inventory = new Inventory({
            ...req.body,
            performedBy: req.user._id
        });
        
        await inventory.save();
        
        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifyInventoryChange(inventory);
        }
        
        res.status(201).json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Inventarizatsiya ro'yxatini olish
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type, startDate, endDate, status, page = 1, limit = 10 } = req.query;
        
        // Filter yaratish
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }
        
        // Pagination
        const skip = (page - 1) * limit;
        
        const inventories = await Inventory.find(filter)
            .populate('performedBy', 'name username')
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Inventory.countDocuments(filter);
        
        res.json({
            success: true,
            data: inventories,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Inventarizatsiyani ID bo'yicha olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id)
            .populate('performedBy', 'name username')
            .populate('products.productId', 'name category price');
            
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventarizatsiya topilmadi'
            });
        }
        
        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Inventarizatsiyani tasdiqlash
router.patch('/:id/complete', verifyToken, async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id);
        
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventarizatsiya topilmadi'
            });
        }
        
        if (inventory.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Bu inventarizatsiya allaqachon yakunlangan yoki bekor qilingan'
            });
        }
        
        // Mahsulotlar qoldig'ini yangilash
        for (const item of inventory.products) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.inventory = item.newQuantity;
                await product.save();
            }
        }
        
        inventory.status = 'completed';
        await inventory.save();
        
        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifyInventoryComplete(inventory);
        }
        
        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Inventarizatsiyani bekor qilish
router.patch('/:id/cancel', verifyToken, async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id);
        
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventarizatsiya topilmadi'
            });
        }
        
        if (inventory.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Bu inventarizatsiya allaqachon yakunlangan yoki bekor qilingan'
            });
        }
        
        inventory.status = 'cancelled';
        await inventory.save();
        
        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifyInventoryCancel(inventory);
        }
        
        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 
