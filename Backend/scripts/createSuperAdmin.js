require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/admin.model');

const createSuperAdmin = async () => {
    try {
        // MongoDB ga ulanish
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB ga ulandi');

        // Avval admin mavjudligini tekshirish
        // CLI arg bilan username va parol olish
        const username = process.argv[2] || 'super';
        const password = process.argv[3] || 'super123';
        const nameArg = process.argv[4] || 'Super Admin';

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            console.log('Super admin allaqachon mavjud!');
            process.exit(0);
        }

        // Yangi admin yaratish
        const superAdmin = new Admin({ username, password, name: nameArg });

        await superAdmin.save();
        console.log('Admin muvaffaqiyatli yaratildi!');
        console.log('Username:', superAdmin.username);
        console.log('Name:', superAdmin.name);

    } catch (error) {
        console.error('Xatolik yuz berdi:', error.message);
    } finally {
        // MongoDB dan uzilish
        await mongoose.disconnect();
        process.exit(0);
    }
};

createSuperAdmin();
