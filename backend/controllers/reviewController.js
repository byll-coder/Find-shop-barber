"use strict";
const Review = require("../models/Review");
const Salon = require("../models/Salons");
const { ok, fail } = require("../utils/apiResponse");
const { calcMoyenne } = require("../utils/helpers");

/* GET /api/avis?salonId=&page= ──────────────────────────────── */
exports.liste = async (req, res, next) => {
  try {
    const { salonId } = req.query;
    if (!salonId) return fail(res, "salonId requis.");
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 20;
    const filtre = { salon: salonId, isVisible: true };
    const [data, total] = await Promise.all([
      Review.find(filtre)
        .populate("auteur", "nom avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(filtre),
    ]);
    return ok(res, { data, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    next(e);
  }
};

/* DELETE /api/avis/:id  (admin uniquement) ──────────────────── */
exports.supprimer = async (req, res, next) => {
  try {
    const avis = await Review.findById(req.params.id);
    if (!avis) return fail(res, "Avis introuvable.", 404);

    avis.isVisible = false;
    await avis.save();

    /* Recalculer la note globale */
    const [result = { total: 0, nb: 0 }] = await Review.aggregate([
      { $match: { salon: avis.salon, isVisible: true } },
      { $group: { _id: null, total: { $sum: "$note" }, nb: { $sum: 1 } } },
    ]);
    await Salon.findByIdAndUpdate(avis.salon, {
      noteGlobale: calcMoyenne(result.total, result.nb),
      nbAvis: result.nb,
    });

    return ok(res, null, "Avis masqué.");
  } catch (e) {
    next(e);
  }
};
