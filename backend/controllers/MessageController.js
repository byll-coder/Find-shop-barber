"use strict";
const Conversation = require("../models/conversation");
const Message = require("../models/Message");

/* ── Helpers ─────────────────────────────────────────────────── */
const populateConv = (query) =>
  query
    .populate("participants", "nom avatar role")
    .populate("salon", "nom logo")
    .populate("dernierMessage", "contenu createdAt expediteur");

/* ================================================================
   GET /api/messages/conversations
   Liste toutes les conversations de l'utilisateur connecté
   ================================================================ */
exports.conversations = async (req, res, next) => {
  try {
    const convs = await populateConv(
      Conversation.find({ participants: req.user._id }).sort({
        dernierMessageAt: -1,
      }),
    );

    res.json({ success: true, data: convs });
  } catch (err) {
    next(err);
  }
};

/* ================================================================
   GET /api/messages/non-lus
   Nombre total de messages non lus pour l'utilisateur connecté
   ================================================================ */
exports.nonLus = async (req, res, next) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id });

    const total = convs.reduce((acc, conv) => {
      const n = conv.nonLus?.get(String(req.user._id)) || 0;
      return acc + n;
    }, 0);

    res.json({ success: true, data: { total } });
  } catch (err) {
    next(err);
  }
};

/* ================================================================
   POST /api/messages/ouvrir
   Ouvre (ou retrouve) une conversation entre l'user et un salon
   Body : { salonId, participantId }
   ================================================================ */
exports.ouvrir = async (req, res, next) => {
  try {
    const { salonId, participantId } = req.body;

    if (!participantId) {
      return res
        .status(400)
        .json({ success: false, message: "participantId requis." });
    }

    const participants = [req.user._id, participantId].sort(); // ordre stable

    let conv = await Conversation.findOne({
      participants: { $all: participants },
    });

    if (!conv) {
      conv = await Conversation.create({
        participants,
        salon: salonId || null,
      });
    }

    await conv.populate("participants", "nom avatar role");
    await conv.populate("salon", "nom logo");

    res.status(201).json({ success: true, data: conv });
  } catch (err) {
    next(err);
  }
};

/* ================================================================
   GET /api/messages/:convId
   Récupère les messages d'une conversation (pagination)
   Query : ?page=1&limit=50
   ================================================================ */
exports.getMessages = async (req, res, next) => {
  try {
    const { convId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    // Vérifier que l'user fait partie de la conversation
    const conv = await Conversation.findOne({
      _id: convId,
      participants: req.user._id,
    });
    if (!conv) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation introuvable." });
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversation: convId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("expediteur", "nom avatar"),
      Message.countDocuments({ conversation: convId }),
    ]);

    // Marquer les messages comme lus
    await Message.updateMany(
      { conversation: convId, expediteur: { $ne: req.user._id }, lu: false },
      { lu: true },
    );

    // Remettre le compteur de non-lus à 0
    conv.nonLus.set(String(req.user._id), 0);
    await conv.save();

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // ordre chronologique
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ================================================================
   POST /api/messages/:convId
   Envoie un message dans une conversation
   Body : { contenu, type? }
   ================================================================ */
exports.envoyer = async (req, res, next) => {
  try {
    const { convId } = req.params;
    const { contenu, type = "texte" } = req.body;

    if (!contenu?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Le message ne peut pas être vide." });
    }

    // Vérifier que l'user fait partie de la conversation
    const conv = await Conversation.findOne({
      _id: convId,
      participants: req.user._id,
    });
    if (!conv) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation introuvable." });
    }

    const message = await Message.create({
      conversation: convId,
      expediteur: req.user._id,
      contenu: contenu.trim(),
      type,
    });

    await message.populate("expediteur", "nom avatar");

    // Mettre à jour la conversation
    conv.dernierMessage = message._id;
    conv.dernierMessageAt = message.createdAt;

    // Incrémenter les non-lus pour tous les autres participants
    conv.participants.forEach((pId) => {
      const key = String(pId);
      if (key !== String(req.user._id)) {
        conv.nonLus.set(key, (conv.nonLus.get(key) || 0) + 1);
      }
    });

    await conv.save();

    // Émettre via Socket.IO si disponible
    const io = req.app.get("io");
    if (io) {
      io.to(convId).emit("nouveau-message", message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};
