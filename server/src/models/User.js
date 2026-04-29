import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    banner: { type: String, default: "" },
    bannerPublicId: { type: String, default: "" },
    status: { type: String, enum: ["online", "idle", "dnd", "offline"], default: "offline" },
    bio: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
