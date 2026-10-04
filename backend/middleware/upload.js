"use strict";
const multer = require("multer");
const { fail } = require("../utils/apiResponse");

const MIME_AUTORISES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (MIME_AUTORISES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format non autorisé. Utilisez JPG, PNG ou WEBP."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: TAILLE_MAX },
});

/**
 * Middleware de gestion des erreurs multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return fail(res, "Fichier trop volumineux. Maximum 5 Mo.", 400);
    }
    return fail(res, `Erreur upload : ${err.message}`, 400);
  }
  if (err) return fail(res, err.message, 400);
  next();
};

module.exports = { upload, handleUploadError };
