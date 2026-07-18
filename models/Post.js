import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const MediaItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    key: String,
    fileName: String,
    size: Number,
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    mediaItems: [MediaItemSchema],
    caption: { type: String, maxlength: 2200, default: "" },
    thumbnail: { type: String, default: "" },
    hashtags: [{ type: String, trim: true }],
    location: { type: String, maxlength: 120, default: "" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    anonymousViews: { type: Number, default: 0 },
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    shares: { type: Number, default: 0 },
    profileVisits: { type: Number, default: 0 },
    watchTimeMs: { type: Number, default: 0 },
    comments: [CommentSchema],
    exif: {
      aperture: String,
      iso: Number,
      shutter: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
