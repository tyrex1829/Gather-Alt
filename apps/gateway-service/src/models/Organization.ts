import mongoose, { Schema } from "mongoose";

const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true }
}, { timestamps: true });

export const OrganizationModel = mongoose.model("Organization", OrganizationSchema);
