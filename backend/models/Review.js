"use strict";
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rendezVous: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    note: {
      type: Number,
      required: [true, "La note est obligatoire."],
      min: [1, "La note minimum est 1."],
      max: [5, "La note maximum est 5."],
    },
    commentaire: {
      type: String,
      trim: true,
      maxlength: [1000, "Commentaire trop long (max 1000 caractères)."],
      default: null,
    },
    isVisible: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

/* Un seul avis par client par salon */
reviewSchema.index({ salon: 1, auteur: 1 }, { unique: true });
reviewSchema.index({ salon: 1, isVisible: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
