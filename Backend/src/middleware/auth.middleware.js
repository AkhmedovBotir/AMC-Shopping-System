const jwt = require('jsonwebtoken');

// Token tekshirish
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token topilmadi'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Endi decoded ichida _id, isAdmin, name, username bo'ladi
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Noto\'g\'ri token'
        });
    }
};

// Admin huquqini tekshirish
const adminAuth = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Faqat admin uchun'
        });
    }
    next();
};

module.exports = {
    verifyToken,
    adminAuth
};
