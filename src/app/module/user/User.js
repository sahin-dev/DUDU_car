const mongoose = require("mongoose");
const { UserAccountStatus } = require("../../../util/enum");

const { Schema, model, Types } = mongoose;

const ObjectId = Schema.Types.ObjectId;

const UserSchema = new Schema(
  {
    authId: {
      type: ObjectId,
      required: true,
      ref: "Auth",
    },
   
    name: {
      type: String,
      required: true,
    },
    // token field to accept firebase fcm token
    token:{
      type: String,
      required:false
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["USER", "DRIVER"],
      required: true,
    },
    profile_image: {
      type: String,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: String,
    },
    address: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    id_or_passport_image: {
      type: String,
    },

    // driver specific fields
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    isAvailable: {
      type: Boolean,
    },
    idOrPassportNo: {
      type: String,
    },
    drivingLicenseNo: {
      type: String,
    },
    licenseType: {
      type: String,
    },
    licenseExpiry: {
      type: String,
    },
    psv_license_image: {
      type: String,
    },
    driving_license_image: {
      type: String,
    },
    assignedCar: {
      type: ObjectId,
      ref: "Car",
    },

    // user specific fields
    emergencyPhoneNumber: {
      type: String,
    },
    userAccountStatus: {
      type: String,
      enum: {
        values: Object.values(UserAccountStatus),
        message: `Invalid value. Allowed values: ${Object.values(
          UserAccountStatus
        ).join(", ")}`,
      },
      default: UserAccountStatus.UNVERIFIED,
    },
    coins: {
      type: Number,
      min: 0,
    },
    outstandingFee: {
      type: Number,
      default: 0,
      min: [0, "outstanding fee cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

const User = model("User", UserSchema);

module.exports = User;
