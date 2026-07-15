const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorFirebaseUid: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["post", "reel"],
      default: "post",
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    caption: {
      type: String,
      default: "",
      maxlength: 500,
    },
    category: {
      type: String,
      default: "",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String], // array of firebaseUid
      default: [],
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);