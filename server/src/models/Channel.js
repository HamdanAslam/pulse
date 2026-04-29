import mongoose from "mongoose";

const PermissionOverwriteSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ["role", "member"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    allow: { type: Number, default: 0 },
    deny: { type: Number, default: 0 },
  },
  { _id: false },
);

const ChannelSchema = new mongoose.Schema(
  {
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Server", required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["text", "announcement"], default: "text" },
    topic: { type: String, default: "" },
    position: { type: Number, default: 0 },
    permissionOverwrites: { type: [PermissionOverwriteSchema], default: [] },
  },
  { timestamps: true },
);

ChannelSchema.index({ serverId: 1, categoryId: 1, position: 1 });

export const Channel = mongoose.model("Channel", ChannelSchema);
