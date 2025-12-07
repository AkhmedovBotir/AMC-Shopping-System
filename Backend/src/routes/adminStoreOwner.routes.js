const express = require("express");
const StoreOwner = require("../models/storeOwner.model");
const { verifyToken, adminAuth } = require("../middleware/auth.middleware");

const router = express.Router();



// Ro'yxat sahifasi
router.get("/", async (req, res) => {
    const owners = await StoreOwner.find({}, '-password').sort({ createdAt: -1 }).lean();
    res.render("admin/storeOwners/list", {
        layout: "main",
        title: "Do'kon egalarining ro'yxati",
        owners
    });
});

// Yangi forma
router.get("/new", (req, res) => {
    res.render("admin/storeOwners/form", {
        layout: "main",
        title: "Yangi do'kon egasi",
        action: "/api/store-owners"
    });
});

// Tahrirlash forma
router.get("/:id/edit", async (req, res) => {
    const owner = await StoreOwner.findById(req.params.id).lean();
    if (!owner) return res.redirect("/admin/store-owners");
    res.render("admin/storeOwners/form", {
        layout: "main",
        title: "Tahrirlash",
        owner,
        action: `/api/store-owners/${owner._id}`
    });
});

module.exports = router;
