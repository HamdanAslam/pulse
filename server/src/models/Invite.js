import mongoose from "mongoose";

const InviteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Server", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    maxUses: { type: Number, default: 0 },
    uses: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Invite = mongoose.model("Invite", InviteSchema);
