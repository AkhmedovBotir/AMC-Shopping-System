const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Ma'lumotlarni tekshirish
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username va parol talab qilinadi'
            });
        }

        // Adminni topish
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ message: 'Noto\'g\'ri login yoki parol' });
        }

        // Parolni tekshirish
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Noto\'g\'ri login yoki parol' });
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
            success: true,
            data: {
                token,
                admin: {
                    _id: admin._id,
                    username: admin.username,
                    name: admin.name,
                    isAdmin: true
                }
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Tizimga kirishda xatolik yuz berdi'
        });
    }
});

// Admin ma'lumotlarini olish
router.get('/me', async (req, res) => {
    try {
        // Barcha adminlarni olish
        const admins = await Admin.find().select('-password');
        
        res.json({
            success: true,
            data: admins.map(admin => ({
                _id: admin._id,
                username: admin.username,
                name: admin.name,
                isAdmin: admin.isAdmin,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            }))
        });

    } catch (error) {
        console.error('Get admin info error:', error);
        res.status(500).json({
            success: false,
            message: 'Admin ma\'lumotlarini olishda xatolik yuz berdi'
        });
    }
});

module.exports = router;
