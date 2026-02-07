import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  avatarCharacterId: { type: String },
  organizationIds: [{ type: String }],
  role: { type: String, default: "member" },
  designation: { type: String },
  status: { type: String, default: "available" }
}, { timestamps: true });

export const UserModel = mongoose.model("User", UserSchema);
