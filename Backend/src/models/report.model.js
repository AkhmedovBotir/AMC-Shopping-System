const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalSales: {
        count: Number,
        amount: Number
    },
    productsSold: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        quantity: Number,
        totalAmount: Number,
        category: String
    }],
    sellerStats: [{
        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Seller'
        },
        name: String,
        salesCount: Number,
        totalAmount: Number,
        products: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            name: String,
            quantity: Number,
            amount: Number
        }]
    }],
    paymentMethods: {
        cash: {
            count: Number,
            amount: Number
        },
        card: {
            count: Number,
            amount: Number
        }
    },
    inventory: {
        added: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            name: String,
            quantity: Number,
            date: Date
        }],
        removed: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            name: String,
            quantity: Number,
            date: Date
        }],
        current: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            name: String,
            quantity: Number,
            value: Number
        }]
    },
    lowStock: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        currentQuantity: Number,
        minimumQuantity: Number
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema); 