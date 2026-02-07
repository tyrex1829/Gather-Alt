import mongoose, { Schema } from "mongoose";

const MapSchema = new Schema({
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  tiles: { type: Array, required: true },
  collisionGrid: { type: Array },
  spawnPoint: { type: Object, required: true },
  rooms: { type: Array, default: [] }
}, { timestamps: true });

export const MapModel = mongoose.model("Map", MapSchema);
