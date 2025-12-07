const StoreOwner = require('../models/storeOwner.model');

// Check if subscription is active
const checkSubscription = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'storeOwner') {
            const storeOwner = await StoreOwner.findById(req.user._id);
            
            if (storeOwner) {
                // Check if trial has expired
                if (storeOwner.subscription.type === 'trial' && 
                    new Date() > storeOwner.subscription.endDate) {
                    storeOwner.status = 'inactive';
                    storeOwner.subscription.isActive = false;
                    await storeOwner.save();
                    
                    return res.status(403).json({
                        success: false,
                        message: 'Sizning trial muddatingiz tugagan. Iltimos, to\'lov qiling.',
                        subscriptionExpired: true
                    });
                }
                
                // Check if paid subscription has expired
                if (storeOwner.subscription.type === 'paid' && 
                    storeOwner.subscription.nextPaymentDate && 
                    new Date() > storeOwner.subscription.nextPaymentDate) {
                    storeOwner.status = 'inactive';
                    storeOwner.subscription.isActive = false;
                    await storeOwner.save();
                    
                    return res.status(403).json({
                        success: false,
                        message: 'Sizning obunangiz muddati tugagan. Iltimos, to\'lov qiling.',
                        subscriptionExpired: true
                    });
                }
            }
        }
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        next(error);
    }
};

// Middleware to check if user has active subscription
const requireActiveSubscription = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'storeOwner') {
            const storeOwner = await StoreOwner.findById(req.user._id);
            
            if (!storeOwner || storeOwner.status !== 'active' || !storeOwner.subscription.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Sizning obunangiz aktiv emas yoki muddati tugagan. Iltimos, to\'lov qiling.',
                    subscriptionExpired: true
                });
            }
        }
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        next(error);
    }
};

// Process payment and activate subscription
const processPayment = async (req, res, next) => {
    try {
        const { storeOwnerId, paymentAmount, paymentMethod } = req.body;
        
        // Here you would typically integrate with a payment gateway
        // For now, we'll just simulate a successful payment
        
        const storeOwner = await StoreOwner.findById(storeOwnerId);
        if (!storeOwner) {
            return res.status(404).json({
                success: false,
                message: 'Do\'kon egasi topilmadi.'
            });
        }
        
        // Update subscription
        const now = new Date();
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        
        storeOwner.status = 'active';
        storeOwner.subscription = {
            type: 'paid',
            startDate: now,
            endDate: nextPaymentDate,
            isActive: true,
            lastPaymentDate: now,
            nextPaymentDate: nextPaymentDate
        };
        
        await storeOwner.save();
        
        res.json({
            success: true,
            message: 'To\'lov muvaffaqiyatli amalga oshirildi. Obunangiz faollashdi!',
            data: {
                storeOwner: {
                    _id: storeOwner._id,
                    status: storeOwner.status,
                    subscription: storeOwner.subscription
                }
            }
        });
        
    } catch (error) {
        console.error('Payment processing error:', error);
        next(error);
    }
};

// Get subscription status
const getSubscriptionStatus = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'storeOwner') {
            const storeOwner = await StoreOwner.findById(req.user._id)
                .select('status subscription');
                
            if (!storeOwner) {
                return res.status(404).json({
                    success: false,
                    message: 'Do\'kon egasi topilmadi.'
                });
            }
            
            res.json({
                success: true,
                data: {
                    status: storeOwner.status,
                    subscription: storeOwner.subscription
                }
            });
        } else {
            res.status(403).json({
                success: false,
                message: 'Ruxsat etilmagan so\'rov.'
            });
        }
    } catch (error) {
        console.error('Subscription status error:', error);
        next(error);
    }
};

module.exports = {
    checkSubscription,
    requireActiveSubscription,
    processPayment,
    getSubscriptionStatus
};
