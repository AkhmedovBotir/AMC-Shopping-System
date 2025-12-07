const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['addition', 'removal', 'adjustment', 'check'],
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        previousQuantity: Number,
        newQuantity: Number,
        difference: Number,
        reason: String
    }],
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    totalValue: {
        previous: Number,
        new: Number,
        difference: Number
    },
    attachments: [{
        name: String,
        url: String,
        type: String
    }]
}, {
    timestamps: true
});

// Indekslar
inventorySchema.index({ date: -1 });
inventorySchema.index({ type: 1, date: -1 });
inventorySchema.index({ performedBy: 1, date: -1 });
inventorySchema.index({ status: 1, date: -1 });

module.exports = mongoose.model('Inventory', inventorySchema); 