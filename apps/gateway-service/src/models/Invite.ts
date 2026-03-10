import mongoose, { Schema } from "mongoose";

const InviteSchema = new Schema({
  organizationId: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  role: {
    type: String,
    enum: ["owner", "admin", "member", "viewer"],
    default: "member"
  },
  tokenHash: { type: String, required: true, unique: true },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
  acceptedAt: { type: Date, default: null }
}, { timestamps: true });

InviteSchema.index({ organizationId: 1, email: 1, acceptedAt: 1 });

export const InviteModel = mongoose.model("Invite", InviteSchema);
