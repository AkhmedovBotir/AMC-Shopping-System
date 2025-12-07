const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        enum: [
            'login',
            'logout',
            'sale_created',
            'sale_cancelled',
            'product_added',
            'product_updated',
            'product_deleted',
            'inventory_check',
            'inventory_adjustment',
            'report_generated',
            'price_changed',
            'system_error'
        ],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    ip: String,
    deviceInfo: {
        type: String
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'warning', 'error'],
        default: 'success'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indekslar
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema); 