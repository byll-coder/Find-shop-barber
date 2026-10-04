"use strict";
const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    nom: {
      type: String,
      required: [true, "Le nom du service est obligatoire."],
      trim: true,
    },
    description: { type: String, trim: true, default: null },
    prix: {
      type: Number,
      required: [true, "Le prix est obligatoire."],
      min: [0, "Le prix doit être positif."],
    },
    duree: { type: Number, default: 30 }, // minutes
    categorie: { type: String, trim: true, default: null },
    isActif: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

serviceSchema.index({ salon: 1, isActif: 1 });

module.exports = mongoose.model("Service", serviceSchema);
