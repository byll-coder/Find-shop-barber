"use strict";

const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const config = require("../config/config");

// Configuration explicite du SDK Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploade un Buffer mémoire (Multer) vers Cloudinary
 */
const uploadBuffer = (buffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Supprime une image via son publicId
 */
const deleteImage = async (publicId) => {
  if (!publicId) return;
  return await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  uploadBuffer,
  deleteImage,
};
