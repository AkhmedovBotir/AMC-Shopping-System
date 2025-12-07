const express = require('express');
const Report = require('../models/report.model');
const { verifyToken } = require('../middleware/auth.middleware');
const moment = require('moment');

const router = express.Router();

// Yangi hisobot yaratish
router.post('/', verifyToken, async (req, res) => {
    try {
        const report = new Report(req.body);
        await report.save();
        
        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Hisobotlar ro'yxatini olish
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type, startDate, endDate, page = 1, limit = 10 } = req.query;
        
        // Filter yaratish
        const filter = {};
        if (type) filter.type = type;
        if (startDate) filter.startDate = { $gte: new Date(startDate) };
        if (endDate) filter.endDate = { $lte: new Date(endDate) };
        
        // Pagination
        const skip = (page - 1) * limit;
        
        const reports = await Report.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Report.countDocuments(filter);
        
        res.json({
            success: true,
            data: reports,
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

// Hisobotni ID bo'yicha olish
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Hisobot topilmadi'
            });
        }
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Kunlik hisobot yaratish
router.post('/daily', verifyToken, async (req, res) => {
    try {
        const today = moment().startOf('day');
        const tomorrow = moment(today).add(1, 'days');
        
        // Bugungi hisobot borligini tekshirish
        const existingReport = await Report.findOne({
            type: 'daily',
            startDate: today.toDate(),
            endDate: tomorrow.toDate()
        });
        
        if (existingReport) {
            return res.status(400).json({
                success: false,
                message: 'Bugungi hisobot allaqachon yaratilgan'
            });
        }
        
        // Yangi hisobot yaratish
        const report = new Report({
            type: 'daily',
            startDate: today.toDate(),
            endDate: tomorrow.toDate(),
            ...req.body
        });
        
        await report.save();
        
        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Haftalik hisobot yaratish
router.post('/weekly', verifyToken, async (req, res) => {
    try {
        const startOfWeek = moment().startOf('week');
        const endOfWeek = moment().endOf('week');
        
        // Shu haftalik hisobot borligini tekshirish
        const existingReport = await Report.findOne({
            type: 'weekly',
            startDate: startOfWeek.toDate(),
            endDate: endOfWeek.toDate()
        });
        
        if (existingReport) {
            return res.status(400).json({
                success: false,
                message: 'Bu haftalik hisobot allaqachon yaratilgan'
            });
        }
        
        // Yangi hisobot yaratish
        const report = new Report({
            type: 'weekly',
            startDate: startOfWeek.toDate(),
            endDate: endOfWeek.toDate(),
            ...req.body
        });
        
        await report.save();
        
        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Oylik hisobot yaratish
router.post('/monthly', verifyToken, async (req, res) => {
    try {
        const startOfMonth = moment().startOf('month');
        const endOfMonth = moment().endOf('month');
        
        // Shu oylik hisobot borligini tekshirish
        const existingReport = await Report.findOne({
            type: 'monthly',
            startDate: startOfMonth.toDate(),
            endDate: endOfMonth.toDate()
        });
        
        if (existingReport) {
            return res.status(400).json({
                success: false,
                message: 'Bu oylik hisobot allaqachon yaratilgan'
            });
        }
        
        // Yangi hisobot yaratish
        const report = new Report({
            type: 'monthly',
            startDate: startOfMonth.toDate(),
            endDate: endOfMonth.toDate(),
            ...req.body
        });
        
        await report.save();
        
        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 
