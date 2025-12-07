const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sellerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    storeOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreOwner',
        required: function() { return !this.isAdmin; }
    }
}, {
    timestamps: true
});

// Parolni hashlash
sellerSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Parolni tekshirish metodi
sellerSchema.methods.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Seller', sellerSchema);
