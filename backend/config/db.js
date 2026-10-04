"use strict";

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // Force les DNS de Google
const mongoose = require("mongoose");
const config = require("./config");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`🍃  MongoDB connecté : ${conn.connection.host}`);
  } catch (err) {
    console.error("❌  Erreur MongoDB :", err.message);
    process.exit(1);
  }
};

/* Événements de connexion */
mongoose.connection.on("disconnected", () =>
  console.warn("⚠️   MongoDB déconnecté"),
);
mongoose.connection.on("reconnected", () =>
  console.log("🔄  MongoDB reconnecté"),
);

module.exports = connectDB;
