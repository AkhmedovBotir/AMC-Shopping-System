const express = require('express');
const router = express.Router();

// Login sahifasi
router.get('/login', (req, res) => {
    res.render('admin/auth/login', {
        layout: 'main',
        title: 'Admin Login'
    });
});

module.exports = router;
