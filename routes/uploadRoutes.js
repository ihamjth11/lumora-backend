const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const verifyToken = require("../middleware/authMiddleware");

// Store file in memory temporarily before uploading to Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ---------- UPLOAD PROFILE PHOTO (Protected) ----------
router.post("/profile-photo", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert buffer to base64 for Cloudinary upload
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "lumora/profile_photos",
      public_id: req.user.uid,
      overwrite: true,
      transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;