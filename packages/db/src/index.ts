import mongoose from "mongoose";

let conn: typeof mongoose | null = null;

export async function connectDb(mongoUrl: string) {
  if (conn) return conn;
  conn = await mongoose.connect(mongoUrl);
  return conn;
}
