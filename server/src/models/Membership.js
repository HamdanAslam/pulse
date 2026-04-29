import mongoose from "mongoose";

const MembershipSchema = new mongoose.Schema(
  {
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Server", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    nickname: { type: String, default: "" },
  },
  { timestamps: true },
);

MembershipSchema.index({ serverId: 1, userId: 1 }, { unique: true });

export const Membership = mongoose.model("Membership", MembershipSchema);
