const mongoose = require('mongoose');
const Counter = require('./counter.model');

const orderHistorySchema = new mongoose.Schema({
    orderId: {
        type: Number,
        required: true,
        index: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true,
        index: true
    },
    storeOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreOwner',
        required: true,
        index: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        unit: {
            type: String,
            required: true
        },
        unitSize: {
            type: Number,
            required: true
        }
    }],
    totalSum: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['completed', 'cancelled'],
        default: 'completed'
    },
    completedAt: {
        type: Date
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card'],
        default: 'cash'
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller'
    },
    cancelReason: {
        type: String
    }
}, {
    timestamps: true
});

// Avtomatik raqamlash
orderHistorySchema.pre('save', async function(next) {
    if (this.isNew && !this.orderId) {
        try {
            this.orderId = await Counter.getNextOrderNumber();
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Indekslar
orderHistorySchema.index({ createdAt: -1 });
orderHistorySchema.index({ seller: 1, createdAt: -1 });
orderHistorySchema.index({ storeOwner: 1, createdAt: -1 });
orderHistorySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('OrderHistory', orderHistorySchema);
