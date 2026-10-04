"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/notificationController");
const { proteger } = require("../middleware/auth");

/* ⚠️  /tout-lire AVANT /:id */
router.get("/", proteger, ctrl.liste);
router.put("/tout-lire", proteger, ctrl.toutMarquerLu);
router.put("/:id/lire", proteger, ctrl.marquerLu);
router.delete("/:id", proteger, ctrl.supprimer);

module.exports = router;
