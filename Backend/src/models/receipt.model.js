const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
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
    properties: [{
        key: String,
        value: String
    }]
});

const receiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: String,
        required: true,
        unique: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    items: [receiptItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card'],
        default: 'cash'
    }
}, {
    timestamps: true
});

// Chek raqamini avtomatik generatsiya qilish
receiptSchema.pre('save', async function(next) {
    if (!this.receiptNumber) {
        // Bugungi sana uchun chek raqamini olish
        const today = new Date();
        const dateStr = today.getFullYear().toString().substr(-2) +
            String(today.getMonth() + 1).padStart(2, '0') +
            String(today.getDate()).padStart(2, '0');
        
        // Bugungi eng oxirgi chek raqamini topish
        const lastReceipt = await this.constructor.findOne({
            receiptNumber: new RegExp('^' + dateStr)
        }).sort({ receiptNumber: -1 });

        let sequence = '001';
        if (lastReceipt) {
            const lastSequence = parseInt(lastReceipt.receiptNumber.substr(-3));
            sequence = String(lastSequence + 1).padStart(3, '0');
        }

        this.receiptNumber = dateStr + sequence;
    }
    next();
});

module.exports = mongoose.model('Receipt', receiptSchema);
