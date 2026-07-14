const express = require("express");
const router = express.Router();
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// ---------- CHECK USERNAME AVAILABILITY (Protected — self-exclude) ----------
router.get("/check-username/:username", verifyToken, async (req, res) => {
  try {
    const existing = await User.findOne({ username: req.params.username.toLowerCase() });

    if (!existing) {
      return res.json({ available: true });
    }

    // If the existing username belongs to the current user, treat as available
    if (existing.firebaseUid === req.user.uid) {
      return res.json({ available: true });
    }

    return res.json({ available: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- CREATE USER PROFILE (Protected) ----------
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { name, username, birthday, interests } = req.body;

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const newUser = new User({
      firebaseUid: req.user.uid,
      name,
      username: username.toLowerCase(),
      email: req.user.email || "",
      birthday: birthday || "",
      interests: interests || [],
      photoURL: req.user.picture || "",
    });

    await newUser.save();
    res.status(201).json({ message: "Profile created", user: newUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET MY PROFILE (Protected) ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- UPDATE MY PROFILE (Protected) ----------
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { name, username, bio, website, location, avatar, photoURL } = req.body;

    if (username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername && existingUsername.firebaseUid !== req.user.uid) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username.toLowerCase();
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    const updated = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { $set: updateData },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;