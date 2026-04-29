import mongoose from "mongoose";

const ServerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    acronym: { type: String, required: true, trim: true },
    color: { type: String, default: "250 90% 66%" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    icon: { type: String, default: "" },
    iconPublicId: { type: String, default: "" },
    banner: { type: String, default: "" },
    bannerPublicId: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Server = mongoose.model("Server", ServerSchema);
