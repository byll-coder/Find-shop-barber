"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/mediaController");
const { proteger } = require("../middleware/auth");
const { autoriser } = require("../middleware/role");
const { upload, handleUploadError } = require("../middleware/upload");
const { uploadLimiter } = require("../middleware/rateLimiter");

router.get("/", proteger, ctrl.listeSalon);
router.post(
  "/upload",
  proteger,
  autoriser("salon", "admin"),
  uploadLimiter,
  upload.single("file"),
  handleUploadError,
  ctrl.upload,
);
router.delete(
  "/:publicId",
  proteger,
  autoriser("salon", "admin"),
  ctrl.supprimer,
);

module.exports = router;
