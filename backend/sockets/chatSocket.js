"use strict";
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const User = require("../models/User");
const Conversation = require("../models/conversation");
const Message = require("../models/Message");

/* Utilisateurs en ligne : Map userId → socketId */
const onlineUsers = new Map();

const initSocket = (io) => {
  /* ── Auth middleware Socket.IO ───────────────────────────────── */
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("Token manquant."));

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        "-password -refreshToken",
      );
      if (!user || !user.isActive)
        return next(new Error("Utilisateur invalide."));

      socket.user = user;
      next();
    } catch {
      next(new Error("Token invalide."));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌  Socket connecté : ${socket.user.nom} (${userId})`);

    /* ── Enregistrer l'utilisateur en ligne ──────────────────── */
    socket.on("user:join", () => {
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      io.emit("user:online", { userId });
    });

    /* ── Rejoindre une conversation ──────────────────────────── */
    socket.on("conversation:join", (convId) => {
      socket.join(`conv:${convId}`);
    });

    /* ── Quitter une conversation ────────────────────────────── */
    socket.on("conversation:leave", (convId) => {
      socket.leave(`conv:${convId}`);
    });

    /* ── Envoyer un message ──────────────────────────────────── */
    socket.on("message:send", async ({ conversationId, contenu }) => {
      try {
        if (!contenu?.trim()) return;

        /* Vérifier que l'utilisateur est participant */
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;

        const estParticipant = conv.participants.some(
          (p) => p.toString() === userId,
        );
        if (!estParticipant) return;

        /* Créer le message en DB */
        const msg = await Message.create({
          conversation: conversationId,
          expediteur: userId,
          contenu: contenu.trim(),
        });

        const msgPeuple = await msg.populate("expediteur", "nom avatar");

        /* Mettre à jour la conversation */
        const nonLus = new Map(conv.nonLus);
        conv.participants.forEach((pid) => {
          const pidStr = pid.toString();
          if (pidStr !== userId) {
            nonLus.set(pidStr, (nonLus.get(pidStr) || 0) + 1);
          }
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          dernierMessage: msg._id,
          dernierMessageAt: new Date(),
          nonLus,
        });

        /* Émettre dans la room de la conversation */
        io.to(`conv:${conversationId}`).emit("message:receive", msgPeuple);

        /* Notifier les autres participants via leur room personnelle */
        conv.participants.forEach((pid) => {
          const pidStr = pid.toString();
          if (pidStr !== userId) {
            io.to(`user:${pidStr}`).emit("notification:message", {
              conversationId,
              expediteur: { _id: userId, nom: socket.user.nom },
              contenu: contenu.trim().substring(0, 60),
            });
          }
        });
      } catch (err) {
        console.error("Socket message:send error:", err.message);
      }
    });

    /* ── Indicateur de frappe ────────────────────────────────── */
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit("typing:start", {
        userId,
        nom: socket.user.nom,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit("typing:stop", { userId });
    });

    /* ── Déconnexion ─────────────────────────────────────────── */
    socket.on("disconnect", async () => {
      console.log(`🔌  Socket déconnecté : ${socket.user.nom}`);
      onlineUsers.delete(userId);
      io.emit("user:offline", { userId });

      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    });
  });
};

const isOnline = (userId) => onlineUsers.has(userId.toString());

module.exports = { initSocket, isOnline };
