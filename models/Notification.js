import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    // Who receives this notification (the post/comment owner).
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Who triggered it (the person who liked/commented).
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like", "comment"], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    // Short snippet stored at creation time so the notification still reads
    // fine even if the comment is later edited or deleted.
    commentText: { type: String, maxlength: 160, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
