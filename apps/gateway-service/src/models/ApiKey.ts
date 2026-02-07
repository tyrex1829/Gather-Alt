import mongoose, { Schema } from "mongoose";

const ApiKeySchema = new Schema({
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  permissions: [{ type: String }],
  prefix: { type: String, required: true },
  keyHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ApiKeyModel = mongoose.model("ApiKey", ApiKeySchema);
