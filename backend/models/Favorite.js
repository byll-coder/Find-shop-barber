"use strict";
const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/* Un seul favori par utilisateur par salon */
favoriteSchema.index({ utilisateur: 1, salon: 1 }, { unique: true });
favoriteSchema.index({ utilisateur: 1, createdAt: -1 });

module.exports = mongoose.model("Favorite", favoriteSchema);
