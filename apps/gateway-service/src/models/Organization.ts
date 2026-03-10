import mongoose, { Schema } from "mongoose";

const MemberSchema = new Schema({
  userId: { type: String, required: true },
  role: { type: String, enum: ["owner", "admin", "member", "viewer"], default: "member" },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  members: { type: [MemberSchema], default: [] }
}, { timestamps: true });

export const OrganizationModel = mongoose.model("Organization", OrganizationSchema);
