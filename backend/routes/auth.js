"use strict";
const router = require("express").Router();
const { body } = require("express-validator");

const ctrl = require("../controllers/authController");
const { proteger } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

/* ── Règles de validation ────────────────────────────────────── */
const inscriptionRules = [
  body("nom")
    .trim()
    .notEmpty()
    .withMessage("Le nom est obligatoire.")
    .isLength({ max: 60 })
    .withMessage("Nom trop long."),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Email invalide.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Le mot de passe doit contenir au moins 6 caractères."),
  body("role")
    .optional()
    .isIn(["client", "salon"])
    .withMessage("Rôle invalide."),
];

const connexionRules = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Email invalide.")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Le mot de passe est obligatoire."),
];

/* ── Routes publiques (avec rate limiting strict) ────────────── */
router.post("/inscription", authLimiter, inscriptionRules, ctrl.inscription);
router.post("/connexion", authLimiter, connexionRules, ctrl.connexion);
router.post("/refresh", ctrl.refresh);

/* ── Routes protégées ────────────────────────────────────────── */
router.get("/moi", proteger, ctrl.moi);
router.put("/profil", proteger, ctrl.modifierProfil);
router.put("/password", proteger, ctrl.changerPassword);
router.post("/deconnexion", proteger, ctrl.deconnexion);

module.exports = router;
