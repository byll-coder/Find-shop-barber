"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/reviewController");
const { proteger } = require("../middleware/auth");
const { autoriser } = require("../middleware/role");

router.get("/", ctrl.liste);
router.delete("/:id", proteger, autoriser("admin"), ctrl.supprimer);

module.exports = router;
