"use strict";
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const User = require("../models/User");
const Salon = require("../models/Salons");
const config = require("../config/config");
const { ok, fail, created } = require("../utils/apiResponse");
const {
  genAccessToken,
  genRefreshToken,
  hashToken,
  refreshCookieOptions,
  sanitizeUser,
} = require("../utils/helpers");

/* ── Helper interne : émet access + refresh ──────────────────── */
const emettreTokens = async (user, res) => {
  const accessToken = genAccessToken(user._id, user.role);
  const refreshToken = genRefreshToken(user._id);

  /* Stocke le hash du refresh token en DB */
  await User.findByIdAndUpdate(user._id, {
    refreshToken: hashToken(refreshToken),
    lastSeen: new Date(),
  });

  /* Refresh token en cookie HttpOnly */
  res.cookie("sf_refresh", refreshToken, refreshCookieOptions());

  return accessToken;
};

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/inscription
   Body : { nom, email, password, role?, commune?, telephone? }
───────────────────────────────────────────────────────────── */
exports.inscription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

    const {
      nom,
      email,
      password,
      role = "client",
      commune,
      telephone,
    } = req.body;

    const existe = await User.findOne({ email });
    if (existe) return fail(res, "Un compte existe déjà avec cet email.");

    const user = await User.create({
      nom,
      email,
      password,
      role,
      commune,
      telephone,
    });

    const token = await emettreTokens(user, res);

    return created(
      res,
      { token, user: sanitizeUser(user) },
      "Compte créé avec succès.",
    );
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/connexion
   Body : { email, password }
───────────────────────────────────────────────────────────── */
exports.connexion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg);

    const { email, password } = req.body;

    /* Inclure le password (select: false par défaut) */
    const user = await User.findOne({ email }).select("+password");
    if (!user) return fail(res, "Email ou mot de passe incorrect.");
    if (!user.isActive)
      return fail(res, "Compte désactivé. Contactez le support.");

    const match = await user.matchPassword(password);
    if (!match) return fail(res, "Email ou mot de passe incorrect.");

    const token = await emettreTokens(user, res);

    return ok(res, { token, user: sanitizeUser(user) }, "Connexion réussie.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/auth/moi
   Header : Authorization: Bearer <token>
───────────────────────────────────────────────────────────── */
exports.moi = async (req, res, next) => {
  try {
    /* req.user est injecté par le middleware proteger */
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, "Utilisateur introuvable.");

    /* Si propriétaire de salon, inclure l'id de son salon */
    let salonId = null;
    if (user.role === "salon") {
      const salon = await Salon.findOne({ proprietaire: user._id }).select(
        "_id",
      );
      salonId = salon?._id || null;
    }

    return ok(res, { ...sanitizeUser(user), salonId }, "Profil récupéré.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/profil
   Body : { nom?, telephone?, commune?, quartier?, avatar? }
───────────────────────────────────────────────────────────── */
exports.modifierProfil = async (req, res, next) => {
  try {
    const { nom, telephone, commune, quartier, avatar } = req.body;

    const champs = {};
    if (nom) champs.nom = nom.trim();
    if (telephone) champs.telephone = telephone.trim();
    if (commune) champs.commune = commune.trim();
    if (quartier) champs.quartier = quartier.trim();
    if (avatar) champs.avatar = avatar.trim();

    if (Object.keys(champs).length === 0)
      return fail(res, "Aucun champ à modifier.");

    const user = await User.findByIdAndUpdate(req.user._id, champs, {
      new: true,
      runValidators: true,
    });

    return ok(res, sanitizeUser(user), "Profil mis à jour.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/password
   Body : { ancienPassword, nouveauPassword }
───────────────────────────────────────────────────────────── */
exports.changerPassword = async (req, res, next) => {
  try {
    const { ancienPassword, nouveauPassword } = req.body;

    if (!ancienPassword || !nouveauPassword) {
      return fail(res, "Les deux mots de passe sont requis.");
    }
    if (nouveauPassword.length < 6) {
      return fail(
        res,
        "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      );
    }

    const user = await User.findById(req.user._id).select("+password");
    const match = await user.matchPassword(ancienPassword);
    if (!match) return fail(res, "Ancien mot de passe incorrect.");

    user.password = nouveauPassword; // le hook pre-save hashera
    await user.save();

    return ok(res, null, "Mot de passe mis à jour.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/refresh
   Cookie : sf_refresh
───────────────────────────────────────────────────────────── */
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.sf_refresh;
    if (!refreshToken) return fail(res, "Refresh token manquant.");

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.REFRESH_SECRET);
    } catch {
      return fail(res, "Refresh token invalide ou expiré.");
    }

    const hashed = hashToken(refreshToken);
    const user = await User.findOne({ _id: decoded.id, refreshToken: hashed });
    if (!user || !user.isActive)
      return fail(res, "Session invalide. Reconnectez-vous.");

    const newAccessToken = genAccessToken(user._id, user.role);
    return ok(res, { token: newAccessToken }, "Token renouvelé.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/auth/deconnexion
───────────────────────────────────────────────────────────── */
exports.deconnexion = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }
    res.clearCookie("sf_refresh", { path: "/api/auth" });
    return ok(res, null, "Déconnecté avec succès.");
  } catch (err) {
    next(err);
  }
};
