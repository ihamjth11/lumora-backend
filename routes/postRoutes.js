const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// ---------- CREATE POST (Protected) ----------
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption, category, type } = req.body;

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ message: "Media is required" });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const newPost = new Post({
      author: user._id,
      authorFirebaseUid: req.user.uid,
      type: type || "post",
      mediaUrl,
      mediaType,
      caption: caption || "",
      category: category || "",
    });

    await newPost.save();

    // Increment user's postsCount
    await User.findByIdAndUpdate(user._id, { $inc: { postsCount: 1 } });

    res.status(201).json({ message: "Post created", post: newPost });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET FEED (all posts, newest first) — Public ----------
router.get("/feed", async (req, res) => {
  try {
    const posts = await Post.find({ type: "post" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "name username avatar photoURL");

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET POSTS BY USER (for profile grid) — Public ----------
router.get("/user/:firebaseUid", async (req, res) => {
  try {
    const posts = await Post.find({ authorFirebaseUid: req.params.firebaseUid })
      .sort({ createdAt: -1 })
      .populate("author", "name username avatar photoURL");

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET MY POSTS (Protected — convenience route) ----------
router.get("/me", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ authorFirebaseUid: req.user.uid })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- LIKE / UNLIKE POST (Protected) ----------
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const uid = req.user.uid;
    const alreadyLiked = post.likedBy.includes(uid);

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter((id) => id !== uid);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likedBy.push(uid);
      post.likesCount += 1;
    }

    await post.save();
    res.json({ likesCount: post.likesCount, liked: !alreadyLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- DELETE POST (Protected — only own posts) ----------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.authorFirebaseUid !== req.user.uid) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);
    await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { $inc: { postsCount: -1 } }
    );

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- EDIT POST CAPTION (Protected — only own post) ----------
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { caption } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.authorFirebaseUid !== req.user.uid) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.caption = caption || "";
    await post.save();

    res.json({ message: "Post updated", post });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET SINGLE POST (Public — for modal view) ----------
router.get("/single/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "name username avatar photoURL");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ---------- TOGGLE SAVE / UNSAVE POST (Protected) ----------
router.post("/:id/save", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const uid = req.user.uid;
    const alreadySaved = post.savedBy.includes(uid);

    if (alreadySaved) {
      post.savedBy = post.savedBy.filter((id) => id !== uid);
    } else {
      post.savedBy.push(uid);
    }

    await post.save();
    res.json({ saved: !alreadySaved });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET MY SAVED POSTS (Protected) ----------
router.get("/saved/me", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ savedBy: req.user.uid })
      .sort({ updatedAt: -1 })
      .populate("author", "name username avatar photoURL");

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;