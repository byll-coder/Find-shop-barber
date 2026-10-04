"use strict";
const Service = require("../models/Service");
const Salon = require("../models/Salons");
const { ok, fail, created } = require("../utils/apiResponse");

/* ── Vérifier que le salon appartient au user connecté ──────── */
const verifierProprio = async (salonId, userId) => {
  const salon = await Salon.findById(salonId).select("proprietaire");
  if (!salon) return { err: "Salon introuvable.", status: 404 };
  if (salon.proprietaire.toString() !== userId.toString())
    return { err: "Action non autorisée.", status: 403 };
  return { salon };
};

/* GET /api/services?salonId= ────────────────────────────────── */
exports.liste = async (req, res, next) => {
  try {
    const { salonId } = req.query;
    if (!salonId) return fail(res, "salonId requis.");
    const services = await Service.find({ salon: salonId, isActif: true })
      .sort({ categorie: 1, prix: 1 })
      .lean();
    return ok(res, services);
  } catch (err) {
    next(err);
  }
};

/* POST /api/services ────────────────────────────────────────── */
exports.creer = async (req, res, next) => {
  try {
    /* Trouver le salon du propriétaire connecté */
    const salon = await Salon.findOne({ proprietaire: req.user._id }).select(
      "_id",
    );
    if (!salon) return fail(res, "Créez d'abord votre salon.", 404);

    const { nom, description, prix, duree, categorie } = req.body;
    if (!nom || prix === undefined)
      return fail(res, "Nom et prix sont obligatoires.");
    if (prix < 0) return fail(res, "Le prix doit être positif.");

    const service = await Service.create({
      salon: salon._id,
      nom: nom.trim(),
      description: description?.trim() || null,
      prix: Number(prix),
      duree: Number(duree) || 30,
      categorie: categorie?.trim() || null,
    });

    return created(res, service, "Service ajouté.");
  } catch (err) {
    next(err);
  }
};

/* PUT /api/services/:id ─────────────────────────────────────── */
exports.modifier = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "salon",
      "proprietaire",
    );
    if (!service) return fail(res, "Service introuvable.", 404);
    if (service.salon.proprietaire.toString() !== req.user._id.toString())
      return fail(res, "Action non autorisée.", 403);

    const { nom, description, prix, duree, categorie } = req.body;
    if (nom !== undefined) service.nom = nom.trim();
    if (description !== undefined)
      service.description = description?.trim() || null;
    if (prix !== undefined) service.prix = Number(prix);
    if (duree !== undefined) service.duree = Number(duree);
    if (categorie !== undefined) service.categorie = categorie?.trim() || null;

    await service.save();
    return ok(res, service, "Service mis à jour.");
  } catch (err) {
    next(err);
  }
};

/* DELETE /api/services/:id ──────────────────────────────────── */
exports.supprimer = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "salon",
      "proprietaire",
    );
    if (!service) return fail(res, "Service introuvable.", 404);
    if (service.salon.proprietaire.toString() !== req.user._id.toString())
      return fail(res, "Action non autorisée.", 403);

    /* Soft delete */
    service.isActif = false;
    await service.save();
    return ok(res, null, "Service supprimé.");
  } catch (err) {
    next(err);
  }
};
