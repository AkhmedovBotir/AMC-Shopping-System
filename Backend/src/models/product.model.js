const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subcategory: {
        type: String,  // Subkategoriya ID string sifatida saqlanadi
        default: null
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        required: true,
        enum: ['dona', 'litr', 'kg']
    },
    unitSize: {
        type: Number,
        default: null,
        min: 0
    },
    inventory: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    storeOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreOwner',
        required: true
    },
    type: {
        type: String,
        enum: ['food', 'non-food'],
        default: 'non-food'
    },
    properties: {
        type: Array,
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for subcategory
productSchema.virtual('subcategoryInfo', {
    ref: 'Category',
    localField: 'subcategory',
    foreignField: '_id',
    justOne: true
});

// Inventoryni tekshirish metodi
productSchema.methods.checkInventory = function(requestedQuantity) {
    return this.inventory >= requestedQuantity;
};

// Inventoryni yangilash metodi
productSchema.methods.updateInventory = async function(quantity, isAddition = false) {
    if (isAddition) {
        this.inventory += quantity;
    } else {
        if (!this.checkInventory(quantity)) {
            throw new Error('Mahsulot yetarli emas');
        }
        this.inventory -= quantity;
    }
    return this.save();
};

// Populyatsiya uchun middleware
productSchema.pre('find', async function() {
    this.populate('category', '_id name');
});

productSchema.pre('findOne', async function() {
    this.populate('category', '_id name');
});

// Response transform
productSchema.methods.toJSON = function() {
    const obj = this.toObject();
    if (obj.subcategoryInfo && obj.subcategory) {
        const subcategoryDoc = obj.subcategoryInfo.subcategories.find(
            sub => sub._id.toString() === obj.subcategory
        );
        if (subcategoryDoc) {
            obj.subcategory = {
                _id: subcategoryDoc._id,
                name: subcategoryDoc.name
            };
        }
    }
    delete obj.subcategoryInfo;
    return obj;
};

module.exports = mongoose.model('Product', productSchema);
