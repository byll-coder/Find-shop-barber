"use strict";
const Notification = require("../models/Notifications");
const { ok, fail } = require("../utils/apiResponse");

/* ================================================================
   GET /api/notifications
   Liste les notifications de l'utilisateur connecté
   Query : ?page=1&limit=20&nonLues=true
   ================================================================ */
exports.liste = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const filtre = { destinataire: req.user._id };

    if (req.query.nonLues === "true") filtre.lu = false;

    const [notifications, total, totalNonLues] = await Promise.all([
      Notification.find(filtre)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filtre),
      Notification.countDocuments({ destinataire: req.user._id, lu: false }),
    ]);

    return ok(res, {
      notifications,
      totalNonLues,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
};

/* ================================================================
   PUT /api/notifications/tout-lire
   Marque TOUTES les notifications comme lues
   ================================================================ */
exports.toutMarquerLu = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { destinataire: req.user._id, lu: false },
      { lu: true },
    );
    return ok(res, null, "Toutes les notifications marquées comme lues.");
  } catch (e) {
    next(e);
  }
};

/* ================================================================
   PUT /api/notifications/:id/lire
   Marque une notification comme lue
   ================================================================ */
exports.marquerLu = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, destinataire: req.user._id },
      { lu: true },
      { new: true },
    );
    if (!notif) return fail(res, "Notification introuvable.", 404);
    return ok(res, notif);
  } catch (e) {
    next(e);
  }
};

/* ================================================================
   DELETE /api/notifications/:id
   Supprime une notification
   ================================================================ */
exports.supprimer = async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      destinataire: req.user._id,
    });
    if (!notif) return fail(res, "Notification introuvable.", 404);
    return ok(res, null, "Notification supprimée.");
  } catch (e) {
    next(e);
  }
};
