const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// Avtomatik raqamlash uchun statik metod
counterSchema.statics.getNextSequence = async function(name) {
    const result = await this.findByIdAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return result.seq;
};

// Buyurtmalar uchun yangi raqam olish
counterSchema.statics.getNextOrderNumber = async function() {
    return await this.getNextSequence('orderCounter');
};

// Mahsulotlar uchun yangi raqam olish
counterSchema.statics.getNextProductNumber = async function() {
    return await this.getNextSequence('productCounter');
};

// Kategoriyalar uchun yangi raqam olish
counterSchema.statics.getNextCategoryNumber = async function() {
    return await this.getNextSequence('categoryCounter');
};

// Boshqa counter'lar uchun umumiy metod
counterSchema.statics.increment = async function(name, by = 1) {
    const result = await this.findByIdAndUpdate(
        { _id: name },
        { $inc: { seq: by } },
        { new: true, upsert: true }
    );
    return result.seq;
};

// Counter'ning joriy qiymatini olish
counterSchema.statics.getCurrentValue = async function(name) {
    const counter = await this.findById(name);
    return counter ? counter.seq : 0;
};

module.exports = mongoose.model('Counter', counterSchema);
