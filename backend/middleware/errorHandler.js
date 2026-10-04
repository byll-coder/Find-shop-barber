"use strict";
const config = require("../config/config");

/**
 * Middleware de gestion d'erreurs global.
 * Doit être enregistré EN DERNIER dans server.js.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Erreur serveur interne";

  /* Erreur de validation Mongoose */
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  /* Duplicate key MongoDB (ex : email déjà utilisé) */
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "champ";
    message = `Cette valeur est déjà utilisée (${field}).`;
  }

  /* Cast error Mongoose (ex : ObjectId invalide) */
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Identifiant invalide : ${err.value}`;
  }

  /* JWT expiré */
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expirée. Reconnectez-vous.";
  }

  /* JWT malformé */
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token invalide.";
  }

  /* Ne jamais exposer les détails internes en production */
  const response = {
    success: false,
    message,
    ...(config.isProd ? {} : { stack: err.stack }),
  };

  if (!config.isProd) console.error("❗ Erreur :", err);

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
