"use strict";
const Appointment = require("../models/Appointment");
const Salon = require("../models/Salons");
const Service = require("../models/Service");
const { ok, fail, created, paginated } = require("../utils/apiResponse");
const { push } = require("../services/notificationsService");

/* GET /api/rendez-vous
   Client : ses propres rdv.  Salon : rdv de son salon.
────────────────────────────────────────────────────────────── */
exports.liste = async (req, res, next) => {
  try {
    const { statut, page = 1, limit = 20 } = req.query;
    let filtre = {};

    if (req.user.role === "client") {
      filtre.client = req.user._id;
    } else if (req.user.role === "salon") {
      const salon = await Salon.findOne({ proprietaire: req.user._id }).select(
        "_id",
      );
      if (!salon) return ok(res, [], "Aucun salon.");
      filtre.salon = salon._id;
    }

    if (statut) filtre.statut = statut;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [data, total] = await Promise.all([
      Appointment.find(filtre)
        .populate("client", "nom telephone avatar")
        .populate("salon", "nom commune photoCouverture")
        .populate("service", "nom prix duree")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Appointment.countDocuments(filtre),
    ]);

    return paginated(res, data, total, parseInt(page, 10), parseInt(limit, 10));
  } catch (e) {
    next(e);
  }
};

/* POST /api/rendez-vous ─────────────────────────────────────── */
exports.creer = async (req, res, next) => {
  try {
    const { salonId, serviceId, date, heure, message } = req.body;
    if (!salonId || !date || !heure)
      return fail(res, "Salon, date et heure obligatoires.");

    const salon = await Salon.findById(salonId).select(
      "_id nom proprietaire isActif",
    );
    if (!salon || !salon.isActif) return fail(res, "Salon introuvable.", 404);

    const rdv = await Appointment.create({
      client: req.user._id,
      salon: salon._id,
      service: serviceId || null,
      date: new Date(date),
      heure,
      message: message?.trim() || null,
    });

    /* Notifier le propriétaire du salon */
    const io = req.app.get("io");
    push(
      io,
      salon.proprietaire,
      "reservation",
      "Nouvelle demande de réservation",
      `${req.user.nom} souhaite un rendez-vous le ${new Date(date).toLocaleDateString("fr-FR")}.`,
      `/pages/dashboard-salon.html#rendez-vous`,
    );

    const rdvPeuple = await rdv.populate(["client", "salon", "service"]);
    return created(res, rdvPeuple, "Demande envoyée.");
  } catch (e) {
    next(e);
  }
};

/* PUT /api/rendez-vous/:id
   Salon : confirme / refuse / termine.  Client : annule.
────────────────────────────────────────────────────────────── */
exports.modifierStatut = async (req, res, next) => {
  try {
    const rdv = await Appointment.findById(req.params.id).populate(
      "salon",
      "proprietaire nom",
    );
    if (!rdv) return fail(res, "Rendez-vous introuvable.", 404);

    const io = req.app.get("io");

    if (req.user.role === "client") {
      if (rdv.client.toString() !== req.user._id.toString())
        return fail(res, "Non autorisé.", 403);
      if (!["pending", "confirmed"].includes(rdv.statut))
        return fail(res, "Ce rendez-vous ne peut pas être annulé.");
      rdv.statut = "cancelled";
      push(
        io,
        rdv.salon.proprietaire,
        "reservation",
        "Rendez-vous annulé",
        `${req.user.nom} a annulé son rendez-vous.`,
      );
    } else if (req.user.role === "salon") {
      if (rdv.salon.proprietaire.toString() !== req.user._id.toString())
        return fail(res, "Non autorisé.", 403);
      const STATUTSVALIDES = ["confirmed", "rejected", "completed"];
      const { statut } = req.body;
      if (!STATUTSVALIDES.includes(statut))
        return fail(res, `Statut invalide : ${STATUTSVALIDES.join(", ")}.`);
      rdv.statut = statut;

      const messages = {
        confirmed: "Votre rendez-vous a été confirmé.",
        rejected: "Votre rendez-vous a été refusé.",
        completed: "Rendez-vous terminé.",
      };
      push(
        io,
        rdv.client,
        "reservation",
        rdv.salon.nom,
        messages[statut],
        `/pages/dashboard-client.html#rendez-vous`,
      );
    } else {
      return fail(res, "Non autorisé.", 403);
    }

    await rdv.save();
    return ok(res, rdv, "Statut mis à jour.");
  } catch (e) {
    next(e);
  }
};
