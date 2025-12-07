const express = require('express');
const jwt = require('jsonwebtoken');
const StoreOwner = require('../models/storeOwner.model');

const router = express.Router();

// Do'kon egasi login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Foydalanuvchini topish
        const owner = await StoreOwner.findOne({ username });
        if (!owner) {
            return res.status(401).json({
                success: false,
                message: 'Login yoki parol noto\'g\'ri'
            });
        }

        // Parolni tekshirish
        const isMatch = await owner.checkPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Login yoki parol noto\'g\'ri'
            });
        }

        // Token generatsiya qilish
        const tokenPayload = {
            _id: owner._id, 
            username: owner.username,
            name: owner.name,
            isAdmin: false,
            // Do'kon egasi o'zining ID sini storeOwner sifatida saqlaymiz
            storeOwner: owner._id
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                _id: owner._id,
                name: owner.name,
                username: owner.username,
                shopName: owner.shopName,
                phone: owner.phone
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Joriy foydalanuvchi ma'lumotlari
router.get('/me', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Avtorizatsiya talab qilinadi'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const owner = await StoreOwner.findById(decoded._id).select('-password');
        
        if (!owner) {
            return res.status(404).json({
                success: false,
                message: 'Foydalanuvchi topilmadi'
            });
        }

        res.json({
            success: true,
            data: owner
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

module.exports = router;
