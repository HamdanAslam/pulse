import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Server", required: true, index: true },
    name: { type: String, required: true, trim: true },
    position: { type: Number, default: 0 },
  },
  { timestamps: true },
);

CategorySchema.index({ serverId: 1, position: 1 });

export const Category = mongoose.model("Category", CategorySchema);
