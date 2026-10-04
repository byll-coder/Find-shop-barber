"use strict";
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

/**
 * Génère un token JWT access (courte durée)
 */
const genAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });

/**
 * Génère un token JWT refresh (longue durée)
 */
const genRefreshToken = (userId) =>
  jwt.sign({ id: userId }, config.REFRESH_SECRET, {
    expiresIn: config.REFRESH_EXPIRES_IN,
  });

/**
 * Hash SHA-256 d'un token (pour stockage sécurisé en DB)
 */
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Options cookie HttpOnly pour le refresh token
 */
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: config.isProd ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours en ms
  path: "/api/auth",
});

/**
 * Supprime les champs sensibles d'un objet user
 */
const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

/**
 * Calcule la moyenne des avis (arrondie à 1 décimale)
 */
const calcMoyenne = (total, nb) =>
  nb === 0 ? 0 : Math.round((total / nb) * 10) / 10;

module.exports = {
  genAccessToken,
  genRefreshToken,
  hashToken,
  refreshCookieOptions,
  sanitizeUser,
  calcMoyenne,
};
