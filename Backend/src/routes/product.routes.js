const express = require('express');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();

// Barcha mahsulotlarni olish (pagination va filter bilan)
router.get('/', verifyToken, async (req, res) => {
    try {
        console.log('User from token:', req.user); // Debug uchun
        
        const { 
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 10,
            search = '',
            category,
            subcategory
        } = req.query;

        // Sort
        const sortOptions = {};
        sortOptions[sort] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;

        // Filter
        const query = {};
        
        // Agar admin bo'lmasa, faqat o'zining mahsulotlarini ko'rsatish
        if (!req.user.isAdmin) {
            // Sotuvchi yoki do'kon egasi uchun
            // Agar sotuvchi bo'lsa, uning storeOwner ID sini olamiz
            // Agar storeOwner bo'lsa, o'z ID sini ishlatamiz
            query.storeOwner = req.user.storeOwner || req.user._id;
            console.log('Query for non-admin:', query);
        }
        
        // Kategoriya bo'yicha filter
        if (category) {
            query.category = category;
        }
        
        // Subkategoriya bo'yicha filter
        if (subcategory) {
            query.subcategory = subcategory;
        }
        
        // Qidiruv bo'lsa
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('Final query:', query); // Debug uchun

        // Get products with total count
        const [products, total] = await Promise.all([
            Product.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('category', '_id name')
                .populate('subcategory', '_id name')
                .populate('storeOwner', 'name shopName phone'),
            Product.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: {
                items: products,
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Yangi mahsulot yaratish
router.post('/', verifyToken, async (req, res) => {
    try {
        const { category: categoryId, subcategory, name, price, unit, unitSize, inventory } = req.body;

        // Kategoriyani topish va egasini tekshirish
        const category = await Category.findOne({ 
            _id: categoryId,
            storeOwner: req.user._id 
        });
        
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                message: 'Kategoriya topilmadi' 
            });
        }

        // Subkategoriya kiritilgan bo'lsa tekshirish
        if (subcategory) {
            const subcategoryExists = category.subcategories.some(
                sub => sub._id.toString() === subcategory
            );
            if (!subcategoryExists) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Subkategoriya topilmadi' 
                });
            }
        }

        // Mahsulot yaratish
        const product = new Product({
            name,
            category: categoryId,
            subcategory,
            price,
            unit,
            unitSize,
            inventory,
            storeOwner: req.user._id // Do'kon egasini qo'shamiz
        });

        await product.save();
        
        // To'liq ma'lumotlarni olish uchun populate
        await product.populate([
            { path: 'category', select: '_id name' },
            { path: 'subcategoryInfo', select: 'subcategories' }
        ]);

        // WebSocket orqali xabar yuborish
        if (req.app.get('wsHandler')) {
            req.app.get('wsHandler').notifyProductCreated(product);
        }

        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Eski endpoint olib tashlandi, yangisi yuqorida

// Mahsulotni yangilash
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;
        const allowedUpdates = ['name', 'category', 'subcategory', 'price', 'unit', 'unitSize', 'inventory'];
        
        // Avval mahsulot egasini tekshirish
        const existingProduct = await Product.findOne({
            _id: productId,
            storeOwner: req.user._id
        });
        
        if (!existingProduct) {
            return res.status(404).json({ 
                success: false, 
                message: 'Mahsulot topilmadi' 
            });
        }
        // Faqat ruxsat etilgan maydonlarni ajratib olish
        const updateData = Object.keys(updates)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = updates[key];
                return obj;
            }, {});

        // Agar kategoriya yangilanayotgan bo'lsa
        if (updateData.category) {
            // Yangi kategoriyani tekshirish
            const newCategory = await Category.findOne({
                _id: updateData.category,
                storeOwner: req.user._id
            });
            
            if (!newCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategoriya topilmadi'
                });
            }

            // Agar subkategoriya ham yangilanayotgan bo'lsa
            if (updateData.subcategory) {
                const subcategoryExists = categoryDoc.subcategories.some(
                    sub => sub._id.toString() === updateData.subcategory
                );
                if (!subcategoryExists) {
                    return res.status(404).json({
                        success: false,
                        message: 'Subkategoriya topilmadi'
                    });
                }
            }
        } 
        // Agar faqat subkategoriya yangilanayotgan bo'lsa
        else if (updateData.subcategory) {
            // Kategoriyani olish (avval tekshirilgan)
            const categoryDoc = await Category.findOne({
                _id: existingProduct.category,
                storeOwner: req.user._id
            });
            
            if (!categoryDoc) {
                return res.status(404).json({
                    success: false,
                    message: 'Kategoriya topilmadi'
                });
            }
            
            // Subkategoriyani tekshirish
            const subcategoryExists = categoryDoc.subcategories.some(
                sub => sub._id.toString() === updateData.subcategory
            );
            
            if (!subcategoryExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Subkategoriya topilmadi'
                });
            }
        }

        // Mahsulotni yangilash
        const product = await Product.findOneAndUpdate(
            { _id: productId, storeOwner: req.user._id },
            updateData,
            { 
                new: true,  // Yangilangan mahsulotni qaytarish
                runValidators: true  // Validatsiyalarni tekshirish
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Mahsulot topilmadi yoki sizda unga huquq yo\'q'
            });
        }

        // To'liq ma'lumotlarni olish uchun populate
        await product.populate([
            { path: 'category', select: '_id name' },
            { path: 'subcategoryInfo', select: 'subcategories' }
        ]);

        // WebSocket orqali xabar yuborish
        if (req.app.get('wsHandler')) {
            req.app.get('wsHandler').notifyProductUpdated(product);
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Mahsulotni o'chirish
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            storeOwner: req.user._id
        });
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Mahsulot topilmadi'
            });
        }

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifyProductDeleted(product._id);
        }

        res.json({
            success: true,
            message: 'Mahsulot muvaffaqiyatli o\'chirildi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Kategoriya bo'yicha mahsulotlarni olish
router.get('/category/:categoryId', verifyToken, async (req, res) => {
    try {
        const { 
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 10
        } = req.query;

        // Sort
        const sortOptions = {};
        sortOptions[sort] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;

        // Get products with total count
        const [products, total] = await Promise.all([
            Product.find({ category: req.params.categoryId })
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('category', '_id name')
                .populate('subcategory', '_id name'),
            Product.countDocuments({ category: req.params.categoryId })
        ]);

        res.json({
            success: true,
            data: {
                items: products,
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

// Subkategoriya bo'yicha mahsulotlarni olish
router.get('/subcategory/:subcategoryId', verifyToken, async (req, res) => {
    try {
        const { 
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 10
        } = req.query;

        // Sort
        const sortOptions = {};
        sortOptions[sort] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;

        // Get products with total count
        const [products, total] = await Promise.all([
            Product.find({ subcategory: req.params.subcategoryId })
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('category', '_id name')
                .populate('subcategory', '_id name'),
            Product.countDocuments({ subcategory: req.params.subcategoryId })
        ]);

        res.json({
            success: true,
            data: {
                items: products,
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

// Kam qolgan mahsulotlarni olish
router.get('/low-inventory', verifyToken, async (req, res) => {
    try {
        const { 
            min = 10,
            sort = 'inventory',
            order = 'asc',
            page = 1,
            limit = 10
        } = req.query;

        // Sort
        const sortOptions = {};
        sortOptions[sort] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;

        // Get products with total count
        const [products, total] = await Promise.all([
            Product.find({ inventory: { $lte: parseInt(min) } })
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('category', '_id name')
                .populate('subcategory', '_id name'),
            Product.countDocuments({ inventory: { $lte: parseInt(min) } })
        ]);

        res.json({
            success: true,
            data: {
                items: products,
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

// Inventoryni yangilash
router.post('/:id/inventory', verifyToken, async (req, res) => {
    try {
        const { quantity, isAddition = true } = req.body;
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Noto\'g\'ri miqdor' 
            });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Mahsulot topilmadi'
            });
        }

        await product.updateInventory(quantity, isAddition);
        await product.populate('category', '_id name');
        await product.populate('subcategory', '_id name');

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifyProductUpdated(product);
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Mahsulotni ID bo'yicha olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', '_id name')
            .populate('subcategory', '_id name');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Mahsulot topilmadi'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
