const { Schema, model } = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const carSchema = new Schema(
  {
    brand: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    seats: {
      type: Number,
      required: true,
    },
    evpNumber: {
      type: String,
      required: true,
    },
    evpExpiry: {
      type: String,
      required: true,
    },
    carNumber: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    carLicensePlate: {
      type: String,
      required: true,
    },
    vin: {
      type: String,
      required: true,
    },
    insuranceStatus: {
      type: String,
      required: true,
      enum: {
        values: ["active", "inactive"],
        message: "Invalid insurance status. Allowed values: active, inactive",
      },
    },
    registrationDate: {
      type: String,
      required: true,
    },
    car_image: {
      type: [String],
      required: true,
    },
    car_grant_image: {
      type: String,
      required: true,
    },
    car_insurance_image: {
      type: String,
      required: true,
    },
    e_hailing_vehicle_permit_pdf: {
      type: String,
      required: true,
    },
    assignedDriver: {
      type: ObjectId,
      ref: "User",
    },
    isAssigned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Car = model("Car", carSchema);

module.exports = Car;
