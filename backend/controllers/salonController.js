"use strict";

const Salon = require("../models/Salons");
const Service = require("../models/Service");
const Review = require("../models/Review");
const Favorite = require("../models/Favorite");
const { ok, fail, created, paginated } = require("../utils/apiResponse");
const { calcMoyenne } = require("../utils/helpers");

/* ── Helpers internes ────────────────────────────────────────── */
const parseLimit = (v, def = 12) =>
  Math.min(Math.max(parseInt(v, 10) || def, 1), 50);
const parsePage = (v) => Math.max(parseInt(v, 10) || 1, 1);

/* ─────────────────────────────────────────────────────────────
   GET /api/salons
   Query : q, commune, categorie, premium, tri, page, limit
───────────────────────────────────────────────────────────── */
exports.liste = async (req, res, next) => {
  try {
    const { q, commune, categorie, premium, tri = "note" } = req.query;
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const skip = (page - 1) * limit;

    const filtre = { isPublie: true, isActif: true };

    // 🔍 Recherche globale flexible avec $or et RegExp
    if (q) {
      const regex = new RegExp(q.trim(), "i");
      filtre.$or = [
        { nom: regex },
        { commune: regex },
        { quartier: regex },
        { description: regex },
        { categorie: regex },
        { tags: regex },
        { "services.nom": regex }, // Recherche dans les noms de prestations
        { "services.description": regex }, // Recherche dans la description des prestations
      ];
    }

    // Filtre direct par commune (ex: depuis la liste déroulante)
    if (commune) {
      filtre.commune = { $regex: new RegExp(`^${commune.trim()}$`, "i") };
    }

    // Filtre par catégorie
    if (categorie) {
      filtre.categorie = categorie;
    }

    // Filtre par statut premium
    if (premium === "true") {
      filtre.isPremium = true;
    }

    const sortMap = {
      note: { noteGlobale: -1, nbAvis: -1 },
      recent: { createdAt: -1 },
      vues: { vues: -1 },
      premium: { isPremium: -1, noteGlobale: -1 },
    };
    const sort = sortMap[tri] || sortMap.recent;

    const [data, total] = await Promise.all([
      Salon.find(filtre)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-coverPublicId -logoPublicId -__v")
        .lean(),
      Salon.countDocuments(filtre),
    ]);

    return paginated(res, data, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/salons/communes
   Retourne la liste des communes des salons publiés
───────────────────────────────────────────────────────────── */
exports.communes = async (req, res, next) => {
  try {
    const communes = await Salon.distinct("commune", {
      isPublie: true,
      isActif: true,
    });
    const triees = communes
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
    return ok(res, triees);
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/salons/moi
   Retourne le salon du propriétaire connecté
───────────────────────────────────────────────────────────── */
exports.monSalon = async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ proprietaire: req.user._id });
    if (!salon) return fail(res, "Vous n'avez pas encore de salon.", 404);
    return ok(res, salon);
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/salons/:id
   Détail d'un salon avec ses services et ses avis
───────────────────────────────────────────────────────────── */
exports.detail = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id)
      .populate("proprietaire", "nom avatar lastSeen")
      .lean();

    if (!salon) return fail(res, "Salon introuvable.", 404);

    // Permettre au propriétaire ou à l'admin de consulter même si inactif
    const estProprioOuAdmin =
      req.user &&
      (salon.proprietaire._id.toString() === req.user._id.toString() ||
        req.user.role === "admin");

    if (!salon.isActif && !estProprioOuAdmin) {
      return fail(res, "Ce salon n'est plus disponible.", 404);
    }

    /* Services actifs */
    const services = await Service.find({ salon: salon._id, isActif: true })
      .select("-__v")
      .sort({ categorie: 1, prix: 1 })
      .lean();

    /* Avis visibles */
    const avis = await Review.find({ salon: salon._id, isVisible: true })
      .populate("auteur", "nom avatar")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    /* Est-il dans les favoris de l'utilisateur connecté ? */
    let estFavori = false;
    if (req.user) {
      estFavori = !!(await Favorite.findOne({
        utilisateur: req.user._id,
        salon: salon._id,
      }));
    }

    /* Incrémenter les vues */
    Salon.findByIdAndUpdate(salon._id, { $inc: { vues: 1 } }).exec();

    return ok(res, { ...salon, services, avis, estFavori });
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/salons
   Créer un salon (role: salon, un seul par propriétaire)
───────────────────────────────────────────────────────────── */
exports.creer = async (req, res, next) => {
  try {
    const existe = await Salon.findOne({ proprietaire: req.user._id });
    if (existe) return fail(res, "Vous avez déjà un salon enregistré.", 409);

    const {
      nom,
      commune,
      categorie,
      slogan,
      description,
      telephone,
      whatsapp,
      email,
      instagram,
      facebook,
      adresse,
      quartier,
      photoCouverture,
      logo,
    } = req.body;

    if (!nom || !commune)
      return fail(res, "Le nom et la commune sont obligatoires.");

    const salon = await Salon.create({
      proprietaire: req.user._id,
      nom: nom.trim(),
      commune: commune.trim(),
      categorie,
      slogan: slogan?.trim() || null,
      description: description?.trim() || null,
      telephone: telephone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      instagram: instagram?.trim() || null,
      facebook: facebook?.trim() || null,
      adresse: adresse?.trim() || null,
      quartier: quartier?.trim() || null,
      photoCouverture: photoCouverture?.trim() || null,
      logo: logo?.trim() || null,

      // Activation et publication automatiques pour affichage immédiat
      isPublie: true,
      isActif: true,
      isVerifie: true,
    });

    return created(res, salon, "Salon créé et activé avec succès.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   PUT /api/salons/:id
   Modifier un salon (propriétaire ou admin)
───────────────────────────────────────────────────────────── */
exports.modifier = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon) return fail(res, "Salon introuvable.", 404);

    /* Vérifier la propriété */
    if (
      salon.proprietaire.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return fail(res, "Action non autorisée.", 403);
    }

    const CHAMPS_AUTORISES = [
      "nom",
      "slogan",
      "description",
      "categorie",
      "commune",
      "quartier",
      "adresse",
      "telephone",
      "whatsapp",
      "email",
      "instagram",
      "facebook",
      "horaires",
      "tags",
      "photoCouverture",
      "logo",
    ];

    if (req.user.role === "admin") {
      CHAMPS_AUTORISES.push("isPremium", "isVerifie", "isPublie", "isActif");
    }

    const mises = {};
    CHAMPS_AUTORISES.forEach((c) => {
      if (req.body[c] !== undefined) mises[c] = req.body[c];
    });

    if (Object.keys(mises).length === 0)
      return fail(res, "Aucun champ à modifier.");

    const updated = await Salon.findByIdAndUpdate(
      req.params.id,
      { $set: mises },
      { new: true, runValidators: true },
    );

    return ok(res, updated, "Salon mis à jour.");
  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/salons/:id/avis
   Ajouter un avis (role: client uniquement)
───────────────────────────────────────────────────────────── */
exports.ajouterAvis = async (req, res, next) => {
  try {
    const salon = await Salon.findById(req.params.id);
    if (!salon || !salon.isActif) return fail(res, "Salon introuvable.", 404);

    if (salon.proprietaire.toString() === req.user._id.toString()) {
      return fail(res, "Vous ne pouvez pas noter votre propre salon.", 403);
    }

    const { note, commentaire } = req.body;
    if (!note || note < 1 || note > 5)
      return fail(res, "La note doit être entre 1 et 5.");

    const avisExistant = await Review.findOne({
      salon: salon._id,
      auteur: req.user._id,
    });
    if (avisExistant)
      return fail(res, "Vous avez déjà laissé un avis pour ce salon.", 409);

    const avis = await Review.create({
      salon: salon._id,
      auteur: req.user._id,
      note: parseInt(note, 10),
      commentaire: commentaire?.trim() || null,
    });

    const result = await Review.aggregate([
      { $match: { salon: salon._id, isVisible: true } },
      { $group: { _id: null, total: { $sum: "$note" }, nb: { $sum: 1 } } },
    ]);

    if (result.length > 0) {
      await Salon.findByIdAndUpdate(salon._id, {
        noteGlobale: calcMoyenne(result[0].total, result[0].nb),
        nbAvis: result[0].nb,
      });
    }

    const avisPeuple = await avis.populate("auteur", "nom avatar");
    return created(res, avisPeuple, "Avis ajouté.");
  } catch (err) {
    next(err);
  }
};
