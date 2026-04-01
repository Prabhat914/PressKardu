const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { getAdminOverview } = require("../controllers/adminController");

router.get("/overview", authMiddleware, requireRole("admin"), getAdminOverview);

module.exports = router;
