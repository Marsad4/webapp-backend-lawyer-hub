// models/Message.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    role: { type: String, enum: ["system", "user", "assistant"], required: true },
    content: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed }, // optional extra info
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
