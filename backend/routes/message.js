"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/messageController");
const { proteger } = require("../middleware/auth");

/* ⚠️  Routes statiques AVANT /:convId */
router.get("/conversations", proteger, ctrl.conversations);
router.get("/non-lus", proteger, ctrl.nonLus);
router.post("/ouvrir", proteger, ctrl.ouvrir);

/* Routes dynamiques */
router.get("/:convId", proteger, ctrl.getMessages);
router.post("/:convId", proteger, ctrl.envoyer);

module.exports = router;
