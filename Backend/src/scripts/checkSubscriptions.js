const mongoose = require('mongoose');
require('dotenv').config();
const StoreOwner = require('../models/storeOwner.model');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bar', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected for subscription check');
    checkExpiredSubscriptions();
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

async function checkExpiredSubscriptions() {
    try {
        console.log('Checking for expired subscriptions...');
        const now = new Date();
        
        // Find all store owners with active subscriptions that have expired
        const expiredSubscriptions = await StoreOwner.find({
            $or: [
                // Trial subscriptions that have ended
                {
                    'subscription.type': 'trial',
                    'subscription.endDate': { $lte: now },
                    'subscription.isActive': true
                },
                // Paid subscriptions that have ended
                {
                    'subscription.type': 'paid',
                    'subscription.nextPaymentDate': { $lte: now },
                    'subscription.isActive': true
                }
            ]
        });

        console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

        // Update status for each expired subscription
        for (const storeOwner of expiredSubscriptions) {
            storeOwner.status = 'inactive';
            storeOwner.subscription.isActive = false;
            await storeOwner.save();
            console.log(`Deactivated store owner: ${storeOwner._id} (${storeOwner.name})`);
        }

        console.log('Subscription check completed');
        process.exit(0);
    } catch (error) {
        console.error('Error checking subscriptions:', error);
        process.exit(1);
    }
}
