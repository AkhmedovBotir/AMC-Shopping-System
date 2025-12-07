const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * StoreOwner (do'kon egasi) modeli.
 * seller modelidan farqli o'laroq, bu egalar butun do'kon uchun mas'ul bo'ladi.
 */
const storeOwnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    shopName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["active", "inactive", "trial"],
        default: "trial"
    },
    subscription: {
        type: {
            type: String,
            enum: ["trial", "paid"],
            default: "trial"
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date,
            default: () => {
                const date = new Date();
                date.setDate(date.getDate() + 3); // 3 kunlik sinov muddati
                return date;
            }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        lastPaymentDate: Date,
        nextPaymentDate: Date
    }
}, {
    timestamps: true
});

// Parolni avtomatik xeshlash
storeOwnerSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    next();
});

// Login paytida parolni tekshirish uchun metod
storeOwnerSchema.methods.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("StoreOwner", storeOwnerSchema);
