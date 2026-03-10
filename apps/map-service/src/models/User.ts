import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  organizationIds: [{ type: String }]
}, { timestamps: true });

export const UserModel = mongoose.model("User", UserSchema);
