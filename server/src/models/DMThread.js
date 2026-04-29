import mongoose from "mongoose";

const DMThreadSchema = new mongoose.Schema(
  {
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

DMThreadSchema.index({ participantIds: 1 });
DMThreadSchema.index({ lastMessageAt: -1 });

export const DMThread = mongoose.model("DMThread", DMThreadSchema);
