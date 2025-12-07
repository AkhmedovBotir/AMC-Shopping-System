const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
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
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['completed', 'cancelled'],
        default: 'completed'
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

// Indekslar
saleSchema.index({ seller: 1, createdAt: -1 });
saleSchema.index({ storeOwner: 1, createdAt: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ cancelledAt: 1 }, { sparse: true });

module.exports = mongoose.model('Sale', saleSchema);
