const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/category.model');
const Product = require('../models/product.model');
const { verifyToken } = require('../middleware/auth.middleware');
const sellerAuth = require('../middleware/sellerAuth.middleware');
const storeOwnerAuth = require('../middleware/storeOwnerAuth.middleware');

const router = express.Router();   

// Yangi kategorya qo'shish
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        // Majburiy maydonlarni tekshirish
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Kategoriya nomi kiritilishi shart'
            });
        }

        // Kategoriya nomi unikal bo'lishi kerak
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            storeOwner: req.user._id
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Bu nomli kategoriya allaqachon mavjud'
            });
        }

        // Yangi kategorya yaratish
        const category = new Category({
            name,
            description: description || '',
            storeOwner: req.user._id,
            subcategories: []
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Kategoriya muvaffaqiyatli qo\'shildi',
            data: category
        });

    } catch (error) {
        console.error('Kategoriya qo\'shishda xatolik:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi: ' + error.message
        });
    }
});

// Barcha kategoriyalarni olish (pagination va filter bilan)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { page = 1, limit = 100, search } = req.query;
        const skip = (page - 1) * limit;

        // Filter uchun query
        const query = {};
        
        // Agar admin bo'lsa barcha kategoriyalarni, aks holda faqat o'zining kategoriyalarini ko'rsatish
        if (!req.user.isAdmin) {
            // Token'da storeOwner mavjud bo'lsa, uni ishlatamiz
            // Agar storeOwner mavjud bo'lmasa, foydalanuvchi ID sini ishlatamiz
            // Bu yerda req.user._id ni ishlatamiz, chunki storeOwner login qilganda uning _id si storeOwner sifatida qo'shiladi
            query.storeOwner = req.user.storeOwner || req.user._id;
            
            // Agar storeOwner bo'lsa, uning o'z ID sini storeOwner sifatida qo'shamiz
            if (req.user.storeOwner === req.user._id) {
                query.storeOwner = req.user._id;
            }
        }
        
        // Qidiruv bo'lsa, uni qo'shamiz
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Kategoriyalarni olish
        const categories = await Category.find(query)
            .sort({ name: 1 }) // Alfabet tartibda saralash
            .populate('storeOwner', 'name shopName phone') // Do'kon egasi ma'lumotlari
            .lean(); // JSON obyektga o'tkazish

        // Subkategoriyalarni ham populate qilish
        const populatedCategories = await Promise.all(categories.map(async category => {
            // Agar subkategoriyalar bo'lsa, ularni ham qo'shamiz
            if (category.subcategories && category.subcategories.length > 0) {
                category.subcategories = category.subcategories.map(sub => ({
                    _id: sub._id,
                    name: sub.name,
                    description: sub.description || '',
                    createdAt: sub.createdAt,
                    updatedAt: sub.updatedAt
                }));
            } else {
                category.subcategories = [];
            }
            return category;
        }));

        // Paginatsiya
        const total = populatedCategories.length;
        const paginatedCategories = populatedCategories.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            data: {
                categories: paginatedCategories,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    perPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Kategoriyalarni olishda xatolik:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server xatosi: ' + error.message 
        });
    }
});

// Kategoriyaga subkategoriya qo'shish
router.post('/:categoryId/subcategories', verifyToken, async (req, res) => {
    // Kategoriya egasini tekshirish
    const category = await Category.findOne({ 
        _id: req.params.categoryId,
        storeOwner: req.user._id 
    });
    
    if (!category) {
        return res.status(404).json({ message: 'Kategoriya topilmadi' });
    }
    try {
        const { categoryId } = req.params;

        // CategoryId validatsiyasi
        if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ 
                message: 'Kategoriya ID si noto\'g\'ri formatda' 
            });
        }

        // Kategoriya egasini tekshirish allaqachon yuqorida bajarildi

        // Subkategoriya nomini tekshirish
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ 
                message: 'Subkategoriya nomi kiritilishi shart' 
            });
        }

        // Subkategoriya nomi unique bo'lishi kerak
        const existingSubcategory = category.subcategories.find(
            sub => sub.name.toLowerCase() === name.toLowerCase()
        );
        if (existingSubcategory) {
            return res.status(400).json({ 
                message: 'Bu nomli subkategoriya allaqachon mavjud' 
            });
        }

        // Yangi subkategoriya qo'shish
        const subcategory = {
            _id: new mongoose.Types.ObjectId(),
            name,
            description
        };

        category.subcategories.push(subcategory);
        await category.save();

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifySubcategoryCreated(categoryId, subcategory);
        }

        res.status(201).json({
            message: 'Subkategoriya qo\'shildi',
            subcategory
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bu endpoint o'chirilgan, chunki yuqorida yaxshiroq versiyasi mavjud

// Barcha kategoriyalar, subkategoriyalar va mahsulotlarni olish
router.get('/with-products', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search,
            minPrice,
            maxPrice,
            minInventory,
            maxInventory,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;
        
        const skip = (page - 1) * limit;

        // Kategoriya filter uchun query
        const categoryQuery = {};
        if (search) {
            categoryQuery.name = { $regex: search, $options: 'i' };
        }

        // Mahsulot filter uchun query
        const productQuery = {};
        if (minPrice || maxPrice) {
            productQuery.price = {};
            if (minPrice) productQuery.price.$gte = parseFloat(minPrice);
            if (maxPrice) productQuery.price.$lte = parseFloat(maxPrice);
        }
        if (minInventory || maxInventory) {
            productQuery.inventory = {};
            if (minInventory) productQuery.inventory.$gte = parseInt(minInventory);
            if (maxInventory) productQuery.inventory.$lte = parseInt(maxInventory);
        }

        // Kategoriyalarni olish
        const categories = await Category.find(categoryQuery)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

        const result = [];

        for (const category of categories) {
            const categoryData = {
                _id: category._id,
                name: category.name,
                description: category.description,
                subcategories: []
            };

            // Har bir subkategoriya uchun mahsulotlarni olish
            for (const subcategory of category.subcategories) {
                const products = await Product.find({
                    category: category._id,
                    subcategory: subcategory._id,
                    ...productQuery
                })
                .select('name price unit unitSize inventory')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

                if (products.length > 0) {
                    categoryData.subcategories.push({
                        _id: subcategory._id,
                        name: subcategory.name,
                        description: subcategory.description,
                        products: products
                    });
                }
            }

            // Asosiy kategoriyaga tegishli mahsulotlar (subkategoriyasiz)
            const mainProducts = await Product.find({
                category: category._id,
                subcategory: { $exists: false },
                ...productQuery
            })
            .select('name price unit unitSize inventory')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

            if (mainProducts.length > 0) {
                categoryData.products = mainProducts;
            }

            // Faqat mahsulotlari bor kategoriyalarni qo'shish
            if (categoryData.subcategories.length > 0 || (categoryData.products && categoryData.products.length > 0)) {
                result.push(categoryData);
            }
        }

        // Umumiy kategoriyalar sonini olish
        const total = await Category.countDocuments(categoryQuery);

        res.json({
            success: true,
            data: {
                categories: result,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    perPage: parseInt(limit)
                },
                filters: {
                    search,
                    minPrice,
                    maxPrice,
                    minInventory,
                    maxInventory
                },
                sorting: {
                    sortBy,
                    sortOrder
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

// Kategoriyani ID bo'yicha olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Kategoriyani yangilash (faqat admin)
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }
        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Subkategoriyani yangilash (faqat admin)
router.put('/subcategories/:subcategoryId', verifyToken, async (req, res) => {
    try {
        // SubcategoryId validatsiyasi
        if (!mongoose.Types.ObjectId.isValid(req.params.subcategoryId)) {
            return res.status(400).json({ 
                success: false,
                message: 'Noto\'g\'ri subkategoriya ID formati' 
            });
        }

        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ 
                success: false,
                message: 'Subkategoriya nomi kiritilishi shart' 
            });
        }

        // Kategoriyani topish va subkategoriyani tekshirish
        const category = await Category.findOne({
            'subcategories._id': req.params.subcategoryId
        });

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Subkategoriya topilmadi' 
            });
        }

        // Subkategoriya nomini tekshirish
        const existingSubcategory = category.subcategories.find(
            sub => sub.name.toLowerCase() === name.toLowerCase() && 
                  sub._id.toString() !== req.params.subcategoryId
        );

        if (existingSubcategory) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu nomli subkategoriya allaqachon mavjud' 
            });
        }

        // Subkategoriyani yangilash
        const subcategory = category.subcategories.id(req.params.subcategoryId);
        subcategory.name = name;
        subcategory.description = description || '';

        // Saqlash
        await category.save();

        res.json({
            success: true,
            message: 'Subkategoriya yangilandi',
            data: subcategory
        });

    } catch (error) {
        console.error('Subkategoriya yangilash xatosi:', error);
        res.status(400).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Subkategoriyani qisman yangilash (faqat admin)
router.patch('/subcategories/:subcategoryId', verifyToken, async (req, res) => {
    try {
        // SubcategoryId validatsiyasi
        if (!mongoose.Types.ObjectId.isValid(req.params.subcategoryId)) {
            return res.status(400).json({ 
                success: false,
                message: 'Noto\'g\'ri subkategoriya ID formati' 
            });
        }

        // Kategoriyani topish va subkategoriyani tekshirish
        const category = await Category.findOne({
            'subcategories._id': req.params.subcategoryId
        });

        if (!category) {
            return res.status(404).json({ 
                success: false,
                message: 'Subkategoriya topilmadi' 
            });
        }

        // Subkategoriya nomini tekshirish (agar yangi nom berilgan bo'lsa)
        if (req.body.name) {
            const existingSubcategory = category.subcategories.find(
                sub => sub.name.toLowerCase() === req.body.name.toLowerCase() && 
                      sub._id.toString() !== req.params.subcategoryId
            );

            if (existingSubcategory) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Bu nomli subkategoriya allaqachon mavjud' 
                });
            }
        }

        // Subkategoriyani yangilash
        const subcategory = category.subcategories.id(req.params.subcategoryId);
        Object.assign(subcategory, req.body);

        // Saqlash
        await category.save();

        res.json({
            success: true,
            message: 'Subkategoriya yangilandi',
            data: subcategory
        });

    } catch (error) {
        console.error('Subkategoriya yangilash xatosi:', error);
        res.status(400).json({ 
            success: false,
            message: error.message 
        });
    }
});

// Kategoriyani o'chirish (faqat admin)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }
        res.json({ message: 'Kategoriya o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Subkategoriyani o'chirish (faqat admin)
router.delete('/:categoryId/subcategories/:subcategoryId', verifyToken, async (req, res) => {
    try {
        const category = await Category.findById(req.params.categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Kategoriya topilmadi' });
        }

        category.subcategories = category.subcategories.filter(
            sub => sub._id.toString() !== req.params.subcategoryId
        );
        await category.save();
        
        res.json({ message: 'Subkategoriya o\'chirildi' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
