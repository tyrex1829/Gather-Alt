import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema({
  roomId: { type: String, required: true, index: true }, // mapId
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  recipientId: { type: String, default: null, index: true },
  type: { type: String, enum: ["direct", "room"], default: "room" },
  content: { type: String, required: true },
  mentions: { type: [String], default: [] }
}, { timestamps: true });

MessageSchema.index({ roomId: 1, createdAt: -1 });

export const MessageModel = mongoose.model("Message", MessageSchema);
