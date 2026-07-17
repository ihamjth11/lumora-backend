const express = require("express");
const router = express.Router();
const Story = require("../models/Story");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// ---------- CREATE STORY (Protected) ----------
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { mediaUrl, mediaType } = req.body;
    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ message: "Media is required" });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const story = new Story({
      author: user._id,
      authorFirebaseUid: req.user.uid,
      mediaUrl,
      mediaType,
    });

    await story.save();
    res.status(201).json({ message: "Story created", story });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET ACTIVE STORIES (grouped by author) — Public ----------
router.get("/active", async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: 1 })
      .populate("author", "name username avatar photoURL");

    // Group by author
    const grouped = {};
    stories.forEach((s) => {
      const uid = s.authorFirebaseUid;
      if (!grouped[uid]) {
        grouped[uid] = {
          author: s.author,
          authorFirebaseUid: uid,
          stories: [],
        };
      }
      grouped[uid].stories.push({
        _id: s._id,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        createdAt: s.createdAt,
        viewedBy: s.viewedBy,
      });
    });

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET MY OWN ACTIVE STORIES (Protected) ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const stories = await Story.find({
      authorFirebaseUid: req.user.uid,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: 1 });

    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- MARK STORY AS VIEWED (Protected) ----------
router.post("/:id/view", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!story.viewedBy.includes(req.user.uid)) {
      story.viewedBy.push(req.user.uid);
      await story.save();
    }

    res.json({ message: "Marked as viewed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- DELETE STORY (Protected — only own) ----------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    if (story.authorFirebaseUid !== req.user.uid) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: "Story deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;