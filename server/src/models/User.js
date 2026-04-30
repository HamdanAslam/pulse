import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, default: null },
    discordId: { type: String, unique: true, sparse: true, trim: true },
    discordUsername: { type: String, default: "", trim: true },
    discordAvatar: { type: String, default: "", trim: true },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    banner: { type: String, default: "" },
    bannerPublicId: { type: String, default: "" },
    preferredStatus: { type: String, enum: ["online", "idle", "dnd", "offline"], default: "online" },
    status: { type: String, enum: ["online", "idle", "dnd", "offline"], default: "offline" },
    bio: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
