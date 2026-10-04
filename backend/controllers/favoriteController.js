"use strict";
const Favorite = require("../models/Favorite");
const Salon = require("../models/Salons");
const { ok, fail } = require("../utils/apiResponse");

/* GET /api/favoris ─────────────────────────────────────────── */
exports.liste = async (req, res, next) => {
  try {
    const favoris = await Favorite.find({ utilisateur: req.user._id })
      .populate({
        path: "salon",
        select:
          "nom commune quartier photoCouverture noteGlobale nbAvis isPremium isVerifie isActif",
      })
      .sort({ createdAt: -1 })
      .lean();

    /* Filtrer les salons supprimés/inactifs */
    const data = favoris
      .filter((f) => f.salon && f.salon.isActif)
      .map((f) => f.salon);

    return ok(res, data);
  } catch (e) {
    next(e);
  }
};

/* POST /api/favoris/:id ─────────────────────────────────────── */
exports.toggle = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id).select(
      "_id isActif nbFavoris",
    );
    if (!salon || !salon.isActif) return fail(res, "Salon introuvable.", 404);

    const existant = await Favorite.findOne({
      utilisateur: req.user._id,
      salon: salon._id,
    });

    if (existant) {
      await existant.deleteOne();
      await Salon.findByIdAndUpdate(salon._id, { $inc: { nbFavoris: -1 } });
      return ok(res, { action: "retiré" }, "Retiré des favoris.");
    }

    await Favorite.create({ utilisateur: req.user._id, salon: salon._id });
    await Salon.findByIdAndUpdate(salon._id, { $inc: { nbFavoris: 1 } });
    return ok(res, { action: "ajouté" }, "Ajouté aux favoris.");
  } catch (e) {
    next(e);
  }
};

/* GET /api/favoris/:id/check ───────────────────────────────── */
exports.check = async (req, res, next) => {
  try {
    const estFavori = !!(await Favorite.findOne({
      utilisateur: req.user._id,
      salon: req.params.id,
    }));
    return ok(res, { estFavori });
  } catch (e) {
    next(e);
  }
};
