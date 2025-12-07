const express = require('express');
const router = express.Router();
const { 
    checkSubscription, 
    requireActiveSubscription, 
    processPayment, 
    getSubscriptionStatus 
} = require('../middleware/subscription.middleware');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply subscription check to all routes
router.use(verifyToken);

// Get subscription status
router.get('/status', getSubscriptionStatus);

// Process payment and activate subscription
router.post('/process-payment', processPayment);

module.exports = router;
