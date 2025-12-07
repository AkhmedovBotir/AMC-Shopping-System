const mongoose = require('mongoose');
const StoreOwner = require('../models/storeOwner.model');
const Seller = require('../models/seller.model');

// Do'kon egasini tekshirish
const storeOwnerAuth = async (req, res, next) => {
    try {
        console.log('StoreOwnerAuth - User:', req.user); // Debug uchun
        
        // Admin bo'lsa ruxsat beramiz
        if (req.user && req.user.isAdmin) {
            console.log('Admin access granted');
            return next();
        }

        // Token ichida storeOwner ID si borligini tekshirish
        if (req.user.storeOwner) {
            console.log('User has storeOwner in token:', req.user.storeOwner);
            // Agar sotuvchi bo'lsa, uning storeOwner ID sini olamiz
            const storeOwner = await StoreOwner.findById(req.user.storeOwner);
            if (!storeOwner) {
                console.log('Store not found for ID:', req.user.storeOwner);
                return res.status(403).json({
                    success: false,
                    message: 'Do\'kon topilmadi',
                    isStoreOwner: false
                });
            }
            req.storeOwner = storeOwner;
            req.user._id = req.user.storeOwner; // StoreOwner ID sini asosiy ID sifatida o'rnatamiz
            console.log('Seller access granted for store:', storeOwner.shopName);
        } else {
            // Do'kon egasi o'zi bo'lsa
            console.log('Checking if user is store owner with ID:', req.user?._id);
            const owner = await StoreOwner.findById(req.user?._id);
            if (!owner) {
                console.log('User is not a store owner');
                return res.status(403).json({
                    success: false,
                    message: 'Ruxsat etilmagan. Siz do\'kon egasi yoki sotuvchi emassiz.',
                    isStoreOwner: false
                });
            }
            req.storeOwner = owner;
            console.log('Store owner access granted for:', owner.shopName);
        }

        next();
    } catch (error) {
        console.error('Store owner auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
};

module.exports = storeOwnerAuth;
