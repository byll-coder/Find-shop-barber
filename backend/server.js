"use strict";
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const config = require("./config/config");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { globalLimiter } = require("./middleware/rateLimiter");
const { initSocket } = require("./sockets/chatSocket");

const app = express();
const server = http.createServer(app);

/* ── Définition des origines autorisées ──────────────────────── */
const allowedOrigins = [
  config.FRONTEND_URL,
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

/* ── Socket.IO ───────────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});
initSocket(io);
app.set("io", io); // accès depuis les controllers si besoin

/* ── Sécurité ────────────────────────────────────────────────── */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

/* ── CORS ────────────────────────────────────────────────────── */
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* ── Parsing ─────────────────────────────────────────────────── */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(config.COOKIE_SECRET));

/* ── Rate limiter global ─────────────────────────────────────── */
app.use("/api", globalLimiter);

/* ── Routes ──────────────────────────────────────────────────── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/salons", require("./routes/salons"));
app.use("/api/services", require("./routes/services"));
app.use("/api/messages", require("./routes/message")); // ← sans 's'
app.use("/api/favoris", require("./routes/favorites"));
app.use("/api/rendez-vous", require("./routes/appointments"));
app.use("/api/avis", require("./routes/reviews"));
app.use("/api/media", require("./routes/media"));
app.use("/api/notifications", require("./routes/notifications"));

/* ── Health check ────────────────────────────────────────────── */
app.get("/api/health", (req, res) =>
  res.json({
    success: true,
    message: "🌿 Salon Finder V2 API opérationnelle",
    env: config.NODE_ENV,
    date: new Date().toISOString(),
  }),
);

/* ── Route inconnue ──────────────────────────────────────────── */
app.use((req, res) =>
  res
    .status(404)
    .json({ success: false, message: `Route ${req.originalUrl} introuvable.` }),
);

/* ── Gestion globale des erreurs (doit être en dernier) ──────── */
app.use(errorHandler);

/* ── Démarrage ───────────────────────────────────────────────── */
const start = async () => {
  await connectDB();
  server.listen(config.PORT, () => {
    console.log("\n🌿  ─────────────────────────────────────────");
    console.log(`   Salon Finder V2 API`);
    console.log(`   http://localhost:${config.PORT}`);
    console.log(`   Env : ${config.NODE_ENV}`);
    console.log("🔌  Socket.IO activé");
    console.log("─────────────────────────────────────────────\n");
  });
};

start();
