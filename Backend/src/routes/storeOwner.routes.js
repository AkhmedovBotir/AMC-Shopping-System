const express = require("express");
const StoreOwner = require("../models/storeOwner.model");
const { verifyToken, adminAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Admin token va huquqini tekshiruvchi middleware
router.use(verifyToken, adminAuth);

// GET /api/store-owners  – ro'yxat
router.get("/", async (req, res) => {
    try {
        const owners = await StoreOwner.find().sort({ createdAt: -1 });
        res.json({ success: true, data: owners });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server xatosi", error });
    }
});

// GET /api/store-owners/:id – bitta egani olish
router.get("/:id", async (req, res) => {
    try {
        const owner = await StoreOwner.findById(req.params.id);
        if (!owner) return res.status(404).json({ success: false, message: "Ega topilmadi" });
        res.json({ success: true, data: owner });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server xatosi", error });
    }
});

// POST /api/store-owners – yangi do'kon egasi qo'shish
router.post("/", async (req, res) => {
    try {
        const { name, shopName, phone, username, password } = req.body;
        const newOwner = new StoreOwner({ name, shopName, phone, username, password });
        await newOwner.save();
        res.status(201).json({ success: true, data: newOwner });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Ushbu username allaqachon mavjud" });
        }
        res.status(500).json({ success: false, message: "Server xatosi", error });
    }
});

// PUT /api/store-owners/:id – ma'lumotni yangilash
router.put("/:id", async (req, res) => {
    try {
        const { name, shopName, phone, username, password, status } = req.body;
        const owner = await StoreOwner.findById(req.params.id);
        if (!owner) return res.status(404).json({ success: false, message: "Ega topilmadi" });

        if (name) owner.name = name;
        if (shopName) owner.shopName = shopName;
        if (phone) owner.phone = phone;
        if (username) owner.username = username;
        if (password && password.trim() !== '') owner.password = password; // bo'sh bo'lmasa
        if (status) owner.status = status;
        await owner.save();
        res.json({ success: true, data: owner });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server xatosi", error });
    }
});

// PATCH /api/store-owners/:id/status – statusni yangilash
router.patch("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: "Status kiritilmagan" });
        }
        
        const owner = await StoreOwner.findById(req.params.id);
        if (!owner) {
            return res.status(404).json({ success: false, message: "Do'kon egasi topilmadi" });
        }
        
        owner.status = status;
        await owner.save();
        
        res.json({ 
            success: true, 
            data: { 
                _id: owner._id, 
                status: owner.status 
            } 
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ 
            success: false, 
            message: "Statusni yangilashda xatolik yuz berdi", 
            error: error.message 
        });
    }
});

// DELETE /api/store-owners/:id – o'chirish
router.delete("/:id", async (req, res) => {
    try {
        const owner = await StoreOwner.findByIdAndDelete(req.params.id);
        if (!owner) return res.status(404).json({ success: false, message: "Ega topilmadi" });
        res.json({ success: true, message: "O'chirildi" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server xatosi", error });
    }
});

module.exports = router;
