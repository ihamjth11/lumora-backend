const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// ---------- ADD COMMENT (Protected) ----------
router.post("/:postId", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const comment = new Comment({
      post: post._id,
      author: user._id,
      authorFirebaseUid: req.user.uid,
      text: text.trim(),
    });

    await comment.save();
    await Post.findByIdAndUpdate(post._id, { $inc: { commentsCount: 1 } });

    const populatedComment = await comment.populate("author", "name username avatar photoURL");

    res.status(201).json({ comment: populatedComment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET COMMENTS FOR A POST (Public) ----------
router.get("/:postId", async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .populate("author", "name username avatar photoURL");

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- DELETE COMMENT (Protected — only own comment) ----------
router.delete("/:commentId", verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (comment.authorFirebaseUid !== req.user.uid) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;