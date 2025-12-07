const mongoose = require('mongoose');
const Counter = require('./counter.model');

const draftOrderSchema = new mongoose.Schema({
    orderId: {
        type: Number,
        unique: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    storeOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreOwner',
        required: true
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
            type: String
        },
        unitSize: {
            type: Number
        }
    }],
    status: {
        type: String,
        enum: ['draft', 'completed'],
        default: 'draft'
    },
    totalSum: {
        type: Number,
        required: true,
        min: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Avtomatik raqamlash
draftOrderSchema.pre('save', async function(next) {
    if (this.isNew) {
        if (!this.orderId) {
            try {
                this.orderId = await Counter.getNextOrderNumber();
            } catch (error) {
                return next(error);
            }
        }
    }
    this.updatedAt = new Date();
    next();
});

// Indekslar
draftOrderSchema.index({ seller: 1, updatedAt: -1 });
draftOrderSchema.index({ storeOwner: 1, updatedAt: -1 });
draftOrderSchema.index({ status: 1 });

module.exports = mongoose.model('DraftOrder', draftOrderSchema);
