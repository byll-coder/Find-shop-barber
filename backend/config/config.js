"use strict";
require("dotenv").config();

/* Vérifie les variables critiques au démarrage */
const REQUIRED = ["MONGODB_URI", "JWT_SECRET", "REFRESH_SECRET"];
REQUIRED.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌  Variable manquante : ${key}`);
    process.exit(1);
  }
});

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  MONGODB_URI: process.env.MONGODB_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",

  REFRESH_SECRET: process.env.REFRESH_SECRET,
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "7d",

  COOKIE_SECRET: process.env.COOKIE_SECRET || "cookie_secret_fallback",
  COOKIE_SECURE: process.env.NODE_ENV === "production",

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",

  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  get isProd() {
    return this.NODE_ENV === "production";
  },
};
