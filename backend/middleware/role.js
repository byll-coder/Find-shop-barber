"use strict";
const { fail } = require("../utils/apiResponse");

/**
 * autoriser(...roles) — vérifie que req.user a le bon rôle.
 * Doit être appelé APRÈS proteger().
 *
 * Exemple : router.delete('/:id', proteger, autoriser('admin'), deleteUser)
 */
const autoriser =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return fail(res, "Authentification requise.", 401);
    if (!roles.includes(req.user.role)) {
      return fail(
        res,
        `Accès interdit. Rôle requis : ${roles.join(" ou ")}.`,
        403,
      );
    }
    next();
  };

module.exports = { autoriser };
