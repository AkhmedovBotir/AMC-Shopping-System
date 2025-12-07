const express = require('express');
const StoreOwner = require('../models/storeOwner.model');
const { verifyToken, adminAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Admin token va huquqini tekshiruvchi middleware
router.use(verifyToken, adminAuth);

// GET /api/notifications - Get all notifications
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        
        // Find store owners with expired subscriptions or trial periods
        const notifications = await StoreOwner.find({
            $or: [
                { 'subscription.endDate': { $lt: now } }, // Expired subscriptions
                { 
                    'subscription.type': 'trial',
                    'subscription.endDate': { 
                        $lt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Ending in 3 days
                        $gte: now
                    }
                }
            ]
        }).select('name shopName phone subscription.status subscription.type subscription.endDate');

        // Categorize notifications
        const expired = [];
        const endingSoon = [];
        
        notifications.forEach(owner => {
            const daysLeft = Math.ceil((new Date(owner.subscription.endDate) - now) / (1000 * 60 * 60 * 24));
            const notification = {
                id: owner._id,
                name: owner.name,
                shopName: owner.shopName,
                phone: owner.phone,
                type: owner.subscription.type,
                endDate: owner.subscription.endDate,
                daysLeft: daysLeft,
                status: owner.subscription.status
            };
            
            if (owner.subscription.endDate < now) {
                expired.push(notification);
            } else {
                endingSoon.push(notification);
            }
        });
        
        res.json({
            success: true,
            data: {
                expired,
                endingSoon
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Xatolik yuz berdi',
            error: error.message 
        });
    }
});

module.exports = router;
