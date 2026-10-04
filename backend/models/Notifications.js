"use strict";
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    destinataire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["message", "reservation", "avis", "salon", "systeme"],
      default: "systeme",
    },
    titre: { type: String, required: true, trim: true },
    corps: { type: String, trim: true, default: null },
    lien: { type: String, default: null }, // URL de redirection
    lu: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed, default: null }, // payload libre
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ destinataire: 1, lu: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
