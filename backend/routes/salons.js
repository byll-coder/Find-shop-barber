"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/salonController");
const { proteger, protegerOptional } = require("../middleware/auth");
const { autoriser } = require("../middleware/role");

/* ⚠️  Les routes statiques DOIVENT être déclarées AVANT /:id */

/* Publiques */
router.get("/", protegerOptional, ctrl.liste);
router.get("/communes", ctrl.communes);

/* Propriétaire connecté */
router.get("/moi", proteger, autoriser("salon", "admin"), ctrl.monSalon);
router.post("/", proteger, autoriser("salon"), ctrl.creer);

/* Routes dynamiques avec :id */
router.get("/:id", protegerOptional, ctrl.detail);
router.put("/:id", proteger, autoriser("salon", "admin"), ctrl.modifier);
router.post("/:id/avis", proteger, autoriser("client"), ctrl.ajouterAvis);

module.exports = router;
