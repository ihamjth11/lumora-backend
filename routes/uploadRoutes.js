const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const verifyToken = require("../middleware/authMiddleware");
const moderateContent = require("../utils/moderateImage");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ---------- UPLOAD PROFILE PHOTO (Protected) ----------
router.post("/profile-photo", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "lumora/profile_photos",
      public_id: req.user.uid,
      overwrite: true,
      transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
    });

    // Moderation check
    const modResult = await moderateContent(result.secure_url, false);
    if (!modResult.safe) {
      await cloudinary.uploader.destroy(result.public_id);
      return res.status(400).json({ message: modResult.reason });
    }

    res.json({ url: result.secure_url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- UPLOAD POST MEDIA (Photo or Video, Protected) ----------
router.post("/post-media", verifyToken, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "lumora/posts",
      resource_type: isVideo ? "video" : "image",
    });

    // Moderation check (images only for now)
    const modResult = await moderateContent(result.secure_url, isVideo);
    if (!modResult.safe) {
      await cloudinary.uploader.destroy(result.public_id, {
        resource_type: isVideo ? "video" : "image",
      });
      return res.status(400).json({ message: modResult.reason });
    }

    res.json({
      url: result.secure_url,
      mediaType: isVideo ? "video" : "image",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- UPLOAD STORY MEDIA (Photo or Video, Protected) ----------
router.post("/story-media", verifyToken, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "lumora/stories",
      resource_type: isVideo ? "video" : "image",
    });

    // Moderation check
    const modResult = await moderateContent(result.secure_url, isVideo);
    if (!modResult.safe) {
      await cloudinary.uploader.destroy(result.public_id, {
        resource_type: isVideo ? "video" : "image",
      });
      return res.status(400).json({ message: modResult.reason });
    }

    res.json({
      url: result.secure_url,
      mediaType: isVideo ? "video" : "image",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ---------- UPLOAD CHAT MEDIA (Photo/Video/Audio, Protected) ----------
router.post("/chat-media", verifyToken, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const isAudio = req.file.mimetype.startsWith("audio/");
    const isVideo = req.file.mimetype.startsWith("video/");
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "lumora/chat",
      resource_type: isAudio || isVideo ? "video" : "image",
    });

    let mediaType = "image";
    if (isAudio) mediaType = "audio";
    else if (isVideo) mediaType = "video";

    if (mediaType === "image") {
      const modResult = await moderateContent(result.secure_url, false);
      if (!modResult.safe) {
        await cloudinary.uploader.destroy(result.public_id);
        return res.status(400).json({ message: modResult.reason });
      }
    }

    res.json({ url: result.secure_url, mediaType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;