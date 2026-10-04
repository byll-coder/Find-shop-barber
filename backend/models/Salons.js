"use strict";
const mongoose = require("mongoose");

const joursSchema = new mongoose.Schema(
  {
    ouvert: { type: Boolean, default: false },
    debut: { type: String, default: "08:00" },
    fin: { type: String, default: "18:00" },
  },
  { _id: false },
);

const salonSchema = new mongoose.Schema(
  {
    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Le propriétaire est obligatoire."],
    },
    nom: {
      type: String,
      required: [true, "Le nom du salon est obligatoire."],
      trim: true,
      maxlength: [100, "Le nom ne peut pas dépasser 100 caractères."],
    },
    slogan: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },
    categorie: {
      type: String,
      enum: ["mixte", "femme", "homme", "barbier", "enfant"],
      default: "mixte",
    },

    /* ── Localisation ─────────────────────────────────────────── */
    commune: {
      type: String,
      trim: true,
      required: [true, "La commune est obligatoire."],
    },
    quartier: { type: String, trim: true, default: null },
    adresse: { type: String, trim: true, default: null },

    /* ── Contact ──────────────────────────────────────────────── */
    telephone: { type: String, trim: true, default: null },
    whatsapp: { type: String, trim: true, default: null },
    email: { type: String, trim: true, default: null },
    instagram: { type: String, trim: true, default: null },
    facebook: { type: String, trim: true, default: null },

    /* ── Médias ───────────────────────────────────────────────── */
    photoCouverture: { type: String, default: null }, // URL Cloudinary
    coverPublicId: { type: String, default: null }, // pour suppression Cloudinary
    logo: { type: String, default: null },
    logoPublicId: { type: String, default: null },

    /* ── Médias ───────────────────────────────────────────────── */
    photoCouverture: { type: String, default: null }, // URL Cloudinary
    coverPublicId: { type: String, default: null }, // pour suppression Cloudinary
    logo: { type: String, default: null },
    logoPublicId: { type: String, default: null },

    // ➕ AJOUTE LA GALERIE ICI :
    galerie: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    /* ── Horaires ─────────────────────────────────────────────── */
    horaires: {
      lundi: { type: joursSchema, default: {} },
      mardi: { type: joursSchema, default: {} },
      mercredi: { type: joursSchema, default: {} },
      jeudi: { type: joursSchema, default: {} },
      vendredi: { type: joursSchema, default: {} },
      samedi: { type: joursSchema, default: {} },
      dimanche: { type: joursSchema, default: {} },
    },

    /* ── Tags & Services (refs) ───────────────────────────────── */
    tags: [{ type: String, trim: true }],

    /* ── Stats ────────────────────────────────────────────────── */
    noteGlobale: { type: Number, default: 0, min: 0, max: 5 },
    nbAvis: { type: Number, default: 0 },
    vues: { type: Number, default: 0 },
    nbFavoris: { type: Number, default: 0 },

    /* ── Flags admin ──────────────────────────────────────────── */
    isPremium: { type: Boolean, default: false },
    isVerifie: { type: Boolean, default: false },
    isActif: { type: Boolean, default: true },
    isPublie: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

/* ── Index pour la recherche et le filtrage ───────────────────── */
salonSchema.index({ commune: 1 });
salonSchema.index({ categorie: 1 });
salonSchema.index({ isPublie: 1, isActif: 1 });
salonSchema.index({ noteGlobale: -1 });
salonSchema.index({ isPremium: -1, noteGlobale: -1 });
salonSchema.index({ nom: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Salon", salonSchema);
