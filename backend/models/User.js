"use strict";
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom est obligatoire."],
      trim: true,
      maxlength: [60, "Le nom ne peut pas dépasser 60 caractères."],
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email invalide."],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est obligatoire."],
      minlength: [6, "Le mot de passe doit contenir au moins 6 caractères."],
      select: false,
    },
    role: {
      type: String,
      enum: { values: ["client", "salon", "admin"], message: "Rôle invalide." },
      default: "client",
    },
    avatar: { type: String, default: null },
    telephone: { type: String, trim: true, default: null },
    commune: { type: String, trim: true, default: null },
    quartier: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    isVerifie: { type: Boolean, default: false },
    refreshToken: { type: String, default: null, select: false },
    lastSeen: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

/* ── Index ───────────────────────────────────────────────────── */
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

/* ── Hook pre-save : hash du mot de passe ────────────────────── */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ── Méthode : comparer le mot de passe ──────────────────────── */
userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* ── Ne jamais renvoyer password ni refreshToken ─────────────── */
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
