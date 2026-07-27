import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

// Creates a notification for an activity on someone's post/comment.
// Never notifies a user about their own activity.
// For "like" types, re-liking after an unlike just refreshes the existing
// notification (bumps it back to unread + top of the list) instead of
// spamming a new row every time someone toggles a like.
export async function createNotification({
  recipientId,
  senderId,
  type,
  postId,
  commentId = "",
  commentText = "",
}) {
  if (!recipientId || !senderId) return null;
  if (recipientId.toString() === senderId.toString()) return null;

  await connectDB();

  if (type === "comment_post") {
    return Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      commentId,
      commentText: (commentText || "").slice(0, 500),
    });
  }

  // like_post / like_comment: upsert so repeated like/unlike cycles don't
  // pile up duplicate notifications.
  return Notification.findOneAndUpdate(
    {
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      commentId: commentId || "",
    },
    {
      $set: { read: false },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Removes the "like" notification when a like is undone, so an unliked post
// doesn't keep showing a stale notification.
export async function removeLikeNotification({ recipientId, senderId, type, postId, commentId = "" }) {
  if (!recipientId || !senderId) return;
  await connectDB();
  await Notification.deleteOne({
    recipient: recipientId,
    sender: senderId,
    type,
    post: postId,
    commentId: commentId || "",
  });
}
