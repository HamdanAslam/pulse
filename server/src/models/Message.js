import mongoose from "mongoose";

const ReactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false },
);

const AttachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image"], default: "image" },
    url: { type: String, required: true },
    name: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false },
);

const EmbedSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["link", "gif"], default: "link" },
    sourceUrl: { type: String, required: true },
    url: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    siteName: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false },
);

const MessageSchema = new mongoose.Schema(
  {
    contextType: { type: String, enum: ["server", "dm"], required: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", default: null, index: true },
    dmThreadId: { type: mongoose.Schema.Types.ObjectId, ref: "DMThread", default: null, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, default: "" },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    reactions: { type: [ReactionSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },
    embeds: { type: [EmbedSchema], default: [] },
  },
  { timestamps: true },
);

MessageSchema.index({ channelId: 1, createdAt: 1 });
MessageSchema.index({ dmThreadId: 1, createdAt: 1 });

export const Message = mongoose.model("Message", MessageSchema);
