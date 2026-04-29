import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Server", required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "" },
    permissions: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    managed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

RoleSchema.index({ serverId: 1, name: 1 });

export const Role = mongoose.model("Role", RoleSchema);
