// src/middleware/sellerAuth.middleware.js
const Seller = require('../models/seller.model');

// Sotuvchini tekshirish
const sellerAuth = async (req, res, next) => {
    try {
        // Admin bo'lsa ruxsat beramiz
        if (req.user && req.user.isAdmin) {
            return next();
        }

        // Sotuvchini tekshirish
        const seller = await Seller.findOne({ 
            _id: req.user?._id,
            status: 'active'
        }).populate('storeOwner');

        if (!seller) {
            return res.status(403).json({
                success: false,
                message: 'Ruxsat etilmagan',
                isSeller: false
            });
        }

        // Sotuvchini requestga qo'shamiz
        req.seller = seller;
        next();
    } catch (error) {
        console.error('Seller auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

module.exports = sellerAuth;