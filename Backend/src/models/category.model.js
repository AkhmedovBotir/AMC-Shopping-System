const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    storeOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreOwner',
        required: true
    },
    subcategories: [subcategorySchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
