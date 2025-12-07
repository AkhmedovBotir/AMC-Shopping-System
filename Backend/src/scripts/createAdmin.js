const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.model');
require('dotenv').config();

async function createAdmin() {
    try {
        // MongoDB ga ulanish
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB ga ulandi');

        // Avval admin bor-yo'qligini tekshirish
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        
        // Admin parolini yaratish
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        if (existingAdmin) {
            console.log('Admin mavjud. Parolni yangilash...');
            
            // Parolni yangilash
            existingAdmin.password = hashedPassword;
            await existingAdmin.save();
            
            console.log('Admin paroli muvaffaqiyatli yangilandi');
            console.log('Admin ma\'lumotlari:', {
                username: existingAdmin.username,
                name: existingAdmin.name,
                _id: existingAdmin._id
            });
        } else {
            // Yangi admin yaratish
            const admin = new Admin({
                username: 'admin',
                password: 'admin123',  // Model o'zi hashlaydi
                name: 'Admin'
            });

            await admin.save();
            console.log('Yangi admin muvaffaqiyatli yaratildi');
            console.log('Admin ma\'lumotlari:', {
                username: admin.username,
                name: admin.name,
                _id: admin._id
            });
        }

    } catch (error) {
        console.error('Xatolik yuz berdi:', error);
    } finally {
        // MongoDB ulanishini yopish
        await mongoose.connection.close();
        console.log('MongoDB ulanishi yopildi');
        process.exit(0);
    }
}

createAdmin();
