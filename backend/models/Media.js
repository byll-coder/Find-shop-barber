"use strict";
const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    uploadeur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    url: { type: String, required: true }, // URL Cloudinary
    publicId: { type: String, required: true }, // pour suppression Cloudinary
    type: {
      type: String,
      enum: ["cover", "logo", "gallery"],
      default: "gallery",
    },
    ordre: { type: Number, default: 0 },
    estPrincipale: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

mediaSchema.index({ salon: 1, type: 1 });

module.exports = mongoose.model("Media", mediaSchema);
