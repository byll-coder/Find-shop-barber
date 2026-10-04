"use strict";
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    date: { type: Date, required: [true, "La date est obligatoire."] },
    heure: { type: String, required: [true, "L'heure est obligatoire."] }, // "10:30"
    statut: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "rejected"],
      default: "pending",
    },
    message: { type: String, trim: true, default: null }, // message du client
    noteProprietaire: { type: String, trim: true, default: null }, // note interne salon
  },
  {
    timestamps: true,
  },
);

appointmentSchema.index({ client: 1, statut: 1 });
appointmentSchema.index({ salon: 1, statut: 1 });
appointmentSchema.index({ date: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
