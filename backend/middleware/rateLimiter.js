"use strict";
const rateLimit = require("express-rate-limit");

const isDev = process.env.NODE_ENV !== "production";

/* ── Rate limiter général ────────────────────────────────────── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Trop de requêtes. Réessayez dans 15 minutes.",
  },
});

/* ── Rate limiter strict pour l'authentification ─────────────── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10, // ← 100 tentatives en dev, 10 en prod
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Handler explicite pour garantir un JSON propre
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: isDev
        ? "Rate limit atteint (dev). Réessayez dans 15 min ou redémarrez le serveur."
        : "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    });
  },
});

/* ── Rate limiter upload ─────────────────────────────────────── */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 500 : 50,
  message: {
    success: false,
    message: "Limite d'upload atteinte. Réessayez dans 1 heure.",
  },
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
