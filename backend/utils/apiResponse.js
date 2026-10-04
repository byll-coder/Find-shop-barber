"use strict";

/**
 * Répond avec { success: true, data, message }
 */
const ok = (res, data = null, message = "Succès", statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

/**
 * Répond avec { success: false, message }
 */
const fail = (res, message = "Erreur serveur", statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

/**
 * Réponse 201 Created
 */
const created = (res, data = null, message = "Créé avec succès") =>
  ok(res, data, message, 201);

/**
 * Réponse paginée
 */
const paginated = (res, data, total, page, limit, message = "Succès") => {
  const pages = Math.ceil(total / limit);
  return res
    .status(200)
    .json({ success: true, message, data, total, page, pages, limit });
};

module.exports = { ok, fail, created, paginated };
