"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/appointmentsController");
const { proteger } = require("../middleware/auth");
const { autoriser } = require("../middleware/role");

router.get("/", proteger, ctrl.liste);
router.post("/", proteger, autoriser("client"), ctrl.creer);
router.put("/:id", proteger, ctrl.modifierStatut);

module.exports = router;
