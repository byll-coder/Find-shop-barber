"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/favoriteController");
const { proteger } = require("../middleware/auth");

/* ⚠️  /check AVANT /:id pour éviter le conflit de route */
router.get("/", proteger, ctrl.liste);
router.get("/:id/check", proteger, ctrl.check);
router.post("/:id", proteger, ctrl.toggle);

module.exports = router;
