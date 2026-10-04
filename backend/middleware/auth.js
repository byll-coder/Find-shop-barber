"use strict";
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/config");
const { fail } = require("../utils/apiResponse");

/**
 * proteger — vérifie le token Bearer et injecte req.user
 */
const proteger = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return fail(res, "Authentification requise.", 401);
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "-password -refreshToken",
    );
    if (!user) return fail(res, "Utilisateur introuvable.", 401);
    if (!user.isActive) return fail(res, "Compte désactivé.", 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return fail(res, "Session expirée. Reconnectez-vous.", 401);
    if (err.name === "JsonWebTokenError")
      return fail(res, "Token invalide.", 401);
    next(err);
  }
};

/**
 * protegerOptional — injecte req.user si token présent, continue sinon
 */
const protegerOptional = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return next();
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken",
    );
    if (user && user.isActive) req.user = user;
  } catch {}
  next();
};

module.exports = { proteger, protegerOptional };
