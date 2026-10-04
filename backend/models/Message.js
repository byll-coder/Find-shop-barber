"use strict";
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    expediteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contenu: {
      type: String,
      required: [true, "Le message ne peut pas être vide."],
      trim: true,
      maxlength: [2000, "Message trop long (max 2000 caractères)."],
    },
    type: {
      type: String,
      enum: ["texte", "image"],
      default: "texte",
    },
    lu: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
