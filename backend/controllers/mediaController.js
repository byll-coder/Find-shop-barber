"use strict";

const Salon = require("../models/Salons");
const Media = require("../models/Media");
const { uploadBuffer, deleteImage } = require("../services/cloudinaryService");
const { ok, fail, created } = require("../utils/apiResponse");

/* POST /api/media/upload
   Multipart : file (image), type (cover|logo|gallery)
────────────────────────────────────────────────────────────── */
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, "Aucun fichier reçu.");

    const salon = await Salon.findOne({ proprietaire: req.user._id }).select(
      "_id nom coverPublicId logoPublicId photoCouverture logo galerie",
    );
    if (!salon) return fail(res, "Créez d'abord votre salon.", 404);

    const type = req.body.type || "gallery";
    const folder = `salon-finder/${salon._id}/${type}`;

    /* Options de transformation selon le type d'image */
    const transformOpts = {
      cover: { width: 1200, height: 600, crop: "fill", quality: 85 },
      logo: { width: 400, height: 400, crop: "fill", quality: 90 },
      gallery: { width: 800, height: 800, crop: "limit", quality: 85 },
    };

    const options = {
      transformation: transformOpts[type] || transformOpts.gallery,
    };

    /* Upload vers Cloudinary via le buffer */
    const result = await uploadBuffer(req.file.buffer, folder, options);

    /* Traitement selon le type de média */
    if (type === "cover") {
      // Suppression de l'ancienne couverture si existante
      if (salon.coverPublicId) {
        await deleteImage(salon.coverPublicId).catch(() => {});
      }

      await Salon.findByIdAndUpdate(salon._id, {
        photoCouverture: result.url,
        coverPublicId: result.publicId,
      });

      // Synchronisation dans le modèle Media
      await Media.findOneAndUpdate(
        { salon: salon._id, type: "cover" },
        {
          salon: salon._id,
          uploadeur: req.user._id,
          url: result.url,
          publicId: result.publicId,
          type: "cover",
        },
        { upsert: true, new: true },
      );
    } else if (type === "logo") {
      // Suppression de l'ancien logo si existant
      if (salon.logoPublicId) {
        await deleteImage(salon.logoPublicId).catch(() => {});
      }

      await Salon.findByIdAndUpdate(salon._id, {
        logo: result.url,
        logoPublicId: result.publicId,
      });

      // Synchronisation dans le modèle Media
      await Media.findOneAndUpdate(
        { salon: salon._id, type: "logo" },
        {
          salon: salon._id,
          uploadeur: req.user._id,
          url: result.url,
          publicId: result.publicId,
          type: "logo",
        },
        { upsert: true, new: true },
      );
    } else {
      /* Type "gallery" : ajout dans le tableau galerie du Salon + création Media */
      const itemGalerie = {
        url: result.url,
        publicId: result.publicId,
      };

      await Salon.findByIdAndUpdate(salon._id, {
        $push: { galerie: itemGalerie },
      });

      await Media.create({
        salon: salon._id,
        uploadeur: req.user._id,
        url: result.url,
        publicId: result.publicId,
        type: "gallery",
      });
    }

    return created(
      res,
      { url: result.url, publicId: result.publicId, type },
      "Image uploadée et enregistrée avec succès.",
    );
  } catch (e) {
    next(e);
  }
};

/* DELETE /api/media/:publicId ───────────────────────────────── */
exports.supprimer = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const decodedId = decodeURIComponent(publicId);

    const media = await Media.findOne({ publicId: decodedId }).populate(
      "salon",
      "proprietaire",
    );
    if (!media) return fail(res, "Média introuvable.", 404);

    if (
      media.salon.proprietaire.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return fail(res, "Non autorisé.", 403);
    }

    // Suppression dans Cloudinary
    await deleteImage(decodedId);

    // Suppression dans la collection Media
    await media.deleteOne();

    // Retrait du tableau galerie ou réinitialisation logo/couverture si pertinent
    if (media.type === "gallery") {
      await Salon.findByIdAndUpdate(media.salon._id, {
        $pull: { galerie: { publicId: decodedId } },
      });
    } else if (media.type === "cover") {
      await Salon.findByIdAndUpdate(media.salon._id, {
        photoCouverture: null,
        coverPublicId: null,
      });
    } else if (media.type === "logo") {
      await Salon.findByIdAndUpdate(media.salon._id, {
        logo: null,
        logoPublicId: null,
      });
    }

    return ok(res, null, "Image supprimée.");
  } catch (e) {
    next(e);
  }
};

/* GET /api/media?salonId= ───────────────────────────────────── */
exports.listeSalon = async (req, res, next) => {
  try {
    const { salonId } = req.query;
    if (!salonId) return fail(res, "salonId requis.");

    const medias = await Media.find({ salon: salonId, type: "gallery" })
      .sort({ ordre: 1, createdAt: -1 })
      .lean();

    return ok(res, medias);
  } catch (e) {
    next(e);
  }
};
