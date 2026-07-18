const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// ---------- GET MY CONVERSATIONS (Protected) ----------
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const myUid = req.user.uid;
    const conversations = await Conversation.find({ participants: myUid })
      .sort({ lastMessageAt: -1 });

    // Attach the "other participant" user info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const otherUid = conv.participants.find((p) => p !== myUid);
        const otherUser = await User.findOne({ firebaseUid: otherUid })
          .select("name username avatar photoURL");

        return {
          _id: conv._id,
          otherUser,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          lastMessageSender: conv.lastMessageSender,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET OR CREATE CONVERSATION WITH A USER (Protected) ----------
router.post("/conversations/with/:targetUid", verifyToken, async (req, res) => {
  try {
    const myUid = req.user.uid;
    const targetUid = req.params.targetUid;

    if (myUid === targetUid) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const participants = [myUid, targetUid].sort();

    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }

    res.json({ conversationId: conversation._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- GET MESSAGES IN A CONVERSATION (Protected) ----------
router.get("/:conversationId", verifyToken, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user.uid)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const messages = await Message.find({ conversation: req.params.conversationId })
      .sort({ createdAt: 1 });

    // Mark messages from the other person as read
    await Message.updateMany(
      { conversation: req.params.conversationId, senderFirebaseUid: { $ne: req.user.uid } },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------- SEND MESSAGE (Protected) ----------
router.post("/:conversationId", verifyToken, async (req, res) => {
  try {
    const { text, mediaUrl, mediaType } = req.body;
    const hasText = text && text.trim();
    const hasMedia = mediaUrl && mediaType;

    if (!hasText && !hasMedia) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user.uid)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const message = new Message({
      conversation: conversation._id,
      senderFirebaseUid: req.user.uid,
      text: hasText ? text.trim() : "",
      mediaUrl: hasMedia ? mediaUrl : "",
      mediaType: hasMedia ? mediaType : "none",
    });
    await message.save();

    conversation.lastMessage = hasText ? text.trim() : (mediaType === "audio" ? "🎤 Voice message" : mediaType === "video" ? "🎬 Video" : "📷 Photo");
    conversation.lastMessageAt = new Date();
    conversation.lastMessageSender = req.user.uid;
    await conversation.save();

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;