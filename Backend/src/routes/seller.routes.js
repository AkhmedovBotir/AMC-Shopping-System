const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Seller = require('../models/seller.model');
const StoreOwner = require('../models/storeOwner.model');
const OrderHistory = require('../models/orderHistory.model');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Admin mavjudligini tekshirish
const checkAdminExists = async () => {
    const admin = await Seller.findOne({ isAdmin: true });
    return admin !== null;
};

// Admin login
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Admin mavjudligini tekshirish
        const admin = await Seller.findOne({ username, isAdmin: true });
        if (!admin) {
            return res.status(401).json({ message: 'Admin topilmadi' });
        }

        // Parolni tekshirish
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Noto\'g\'ri parol' });
        }

        // Token yaratish
        const token = jwt.sign(
            { 
                _id: admin._id,
                isAdmin: true,
                name: admin.name,
                username: admin.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.json({
            token,
            seller: {
                _id: admin._id,
                name: admin.name,
                username: admin.username,
                isAdmin: admin.isAdmin
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Birinchi admin yaratish (faqat birinchi marta)
router.post('/admin/setup', async (req, res) => {
    try {
        // Admin mavjudligini tekshirish
        const adminExists = await checkAdminExists();
        if (adminExists) {
            return res.status(400).json({ 
                message: 'Admin allaqachon mavjud. Faqat bitta admin bo\'lishi mumkin' 
            });
        }

        // Yangi admin yaratish
        const admin = new Seller({
            name: req.body.name,
            username: req.body.username,
            password: req.body.password,
            isAdmin: true
        });

        await admin.save();

        // Token yaratish
        const token = jwt.sign(
            { 
                _id: admin._id,
                isAdmin: true,
                name: admin.name,
                username: admin.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        res.status(201).json({
            token,
            seller: {
                _id: admin._id,
                name: admin.name,
                username: admin.username,
                isAdmin: admin.isAdmin
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Yangi sotuvchi yaratish
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, username, password, phone } = req.body;
        
        // Majburiy maydonlarni tekshirish
        if (!name || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Iltimos, barcha maydonlarni to\'ldiring'
            });
        }

        // Username bandligini tekshirish
        const existingSeller = await Seller.findOne({ username });
        if (existingSeller) {
            return res.status(400).json({
                success: false,
                message: 'Bu foydalanuvchi nomi band'
            });
        }

        // Yangi sotuvchi yaratish
        const sellerData = {
            name,
            username,
            password,
            phone: phone || '',
            isAdmin: false,
            status: 'active'
        };

        // Do'kon egasi uchun sotuvchi qo'shish
        if (!req.user.isAdmin) {
            sellerData.storeOwner = req.user._id;
        } else if (req.body.storeOwner) {
            // Admin yangi sotuvchini boshqa do'konga qo'shishi mumkin
            sellerData.storeOwner = req.body.storeOwner;
        }

        const seller = new Seller(sellerData);
        await seller.save();
        
        // Parolni qaytarmaslik uchun olib tashlaymiz
        seller.password = undefined;
        
        res.status(201).json({
            success: true,
            data: seller
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Sotuvchi login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Sotuvchini topish
        const seller = await Seller.findOne({ username, isAdmin: false });
        if (!seller) {
            return res.status(401).json({ message: 'Sotuvchi topilmadi' });
        }

        // Parolni tekshirish
        const isMatch = await bcrypt.compare(password, seller.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Noto\'g\'ri parol' });
        }

        // Token yaratish
        const token = jwt.sign(
            { 
                _id: seller._id,
                isAdmin: false,
                name: seller.name,
                username: seller.username,
                storeOwner: seller.storeOwner // Sotuvchining storeOwner ID sini qo'shamiz
            },
            process.env.JWT_SECRET,
            { expiresIn: '365d' }
        );

        // Sotuvchi ma'lumotlarini tayyorlash
        const sellerData = {
            _id: seller._id,
            name: seller.name,
            username: seller.username,
            phone: seller.phone,
            status: seller.status,
            isAdmin: seller.isAdmin,
            storeOwner: seller.storeOwner // StoreOwner ID sini qo'shamiz
        };

        // Agar admin bo'lmasa, do'kon egasi ma'lumotlarini qo'shamiz
        if (!seller.isAdmin) {
            sellerData.storeOwner = seller.storeOwner;
            
            // Do'kon egasining ma'lumotlarini ham qo'shamiz
            if (seller.storeOwner) {
                const storeOwner = await StoreOwner.findById(seller.storeOwner)
                    .select('name shopName phone');
                if (storeOwner) {
                    sellerData.storeOwnerInfo = storeOwner;
                }
            }
        }

        res.json({
            success: true,
            token,
            data: sellerData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// O'z profilini olish
router.get('/me', verifyToken, async (req, res) => {
    try {
        const seller = await Seller.findById(req.user._id).populate('storeOwner', 'name phone address');
        if (!seller) {
            return res.status(404).json({ 
                success: false,
                message: 'Sotuvchi topilmadi' 
            });
        }
        
        res.json({
            success: true,
            data: {
                id: seller._id,
                name: seller.name,
                username: seller.username,
                status: seller.status,
                isAdmin: seller.isAdmin,
                storeOwner: seller.storeOwner,
                createdAt: seller.createdAt,
                updatedAt: seller.updatedAt
            }
        });
    } catch (error) {
        console.error('Error in /me endpoint:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server xatosi',
            error: error.message 
        });
    }
});

// Sotuvchi ma'lumotlarini olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        // Do'kon egasi faqat o'z sotuvchilarini ko'rishi mumkin
        const query = req.user.isAdmin 
            ? { _id: req.params.id } 
            : { _id: req.params.id, storeOwner: req.user._id };
            
        const seller = await Seller.findOne(query).select('-password -__v');
        if (!seller) {
            return res.status(404).json({ message: 'Sotuvchi topilmadi' });
        }
        res.json(seller);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Barcha sotuvchilarni olish
router.get('/', verifyToken, async (req, res) => {
    try {
        // Admin bo'lsa barcha sotuvchilarni, aks holda faqat o'z do'koni sotuvchilarini ko'rsatish
        const query = req.user.isAdmin ? {} : { storeOwner: req.user._id };
        const sellers = await Seller.find(query)
            .select('-password -__v')
            .sort({ createdAt: -1 });
        res.json(sellers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvchini yangilash
router.put('/:id', verifyToken, async (req, res) => {
    try {
        // Do'kon egasi faqat o'z sotuvchilarini yangilashi mumkin
        if (!req.user.isAdmin) {
            const seller = await Seller.findOne({ _id: req.params.id, storeOwner: req.user._id });
            if (!seller) {
                return res.status(404).json({ message: 'Sotuvchi topilmadi' });
            }
        }
        // Admin statusini o'zgartirishga urinishni tekshirish
        if (req.body.isAdmin !== undefined) {
            return res.status(400).json({ 
                message: 'Admin statusini o\'zgartirish mumkin emas' 
            });
        }

        const seller = await Seller.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).select('-password -__v');
        if (!seller) {
            return res.status(404).json({ message: 'Sotuvchi topilmadi' });
        }
        res.json(seller);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvchi parolini yangilash (admin uchun)
router.patch('/:id/password', verifyToken, async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' 
            });
        }

        const seller = await Seller.findById(req.params.id);
        if (!seller) {
            return res.status(404).json({ message: 'Sotuvchi topilmadi' });
        }

        seller.password = newPassword;
        await seller.save();

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifySellerUpdated(seller._id);
        }

        res.json({ message: 'Sotuvchi paroli muvaffaqiyatli yangilandi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvchini o'chirish (faqat admin uchun)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Do'kon egasi faqat o'z sotuvchilarini o'chirishi mumkin
        if (!req.user.isAdmin) {
            const seller = await Seller.findOne({ _id: req.params.id, storeOwner: req.user._id });
            if (!seller) {
                return res.status(404).json({ message: 'Sotuvchi topilmadi' });
            }
        }
        const seller = await Seller.findByIdAndDelete(req.params.id);
        if (!seller) {
            return res.status(404).json({ message: 'Sotuvchi topilmadi' });
        }
        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifySellerDeleted(seller._id);
        }

        res.json({ message: 'Sotuvchi muvaffaqiyatli o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Sotuvchi statusini o'zgartirish (faqat admin uchun)
router.patch('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;

        // Status validatsiyasi
        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri status. Status faqat "active" yoki "inactive" bo\'lishi mumkin'
            });
        }

        const seller = await Seller.findById(req.params.id);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Sotuvchi topilmadi'
            });
        }

        // Admin statusini o'zgartirishni oldini olish
        if (seller.isAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin statusini o\'zgartirish mumkin emas'
            });
        }

        seller.status = status;
        await seller.save();

        // WebSocket orqali xabar yuborish
        if (req.wsHandlers) {
            req.wsHandlers.notifySellerUpdated(seller._id);
        }

        res.json({
            success: true,
            data: {
                _id: seller._id,
                name: seller.name,
                username: seller.username,
                status: seller.status
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
