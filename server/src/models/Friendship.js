import mongoose from "mongoose";

const FriendshipSchema = new mongoose.Schema(
  {
    pairKey: { type: String, required: true, unique: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "blocked"],
      default: "pending",
    },
  },
  { timestamps: true },
);

FriendshipSchema.index({ users: 1 });

export const Friendship = mongoose.model("Friendship", FriendshipSchema);
