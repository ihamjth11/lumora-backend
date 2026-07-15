const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    birthday: {
      type: String,
      default: "",
    },
    photoURL: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "🧑‍💻",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 150,
    },
    website: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    interests: {
      type: [String],
      default: [],
    },
    followers: {
      type: [String], // array of firebaseUid who follow this user
      default: [],
    },
    following: {
      type: [String], // array of firebaseUid this user follows
      default: [],
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);