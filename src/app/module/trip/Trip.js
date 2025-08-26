const { Schema, model } = require("mongoose");
const { TripStatus, EnumPaymentType } = require("../../../util/enum");
const ObjectId = Schema.Types.ObjectId;

const tripSchema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    driver: {
      type: ObjectId,
      ref: "User",
    },
    car: {
      type: ObjectId,
      ref: "Car",
    },
    tripType:{                          //
      type:String,                      //  New trip field for tripe type
      enum:["ride","pre_book"],         //  Two possible option for trip ride or pre-book ride
      default:"ride"                    //
    },
    pickUpAddress: {
      type: String,
      required: true,
    },
    pickUpCoordinates: {
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
    dropOffAddress: {
      type: String,
      required: true,
    },
    dropOffCoordinates: {
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
    driverCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
    duration: {
      type: Number,
      required: true,
    },
    distance: {
      type: Number,
      required: true,
    },
    estimatedFare: {
      type: Number,
    },
    tollFee: {
      type: Number,
      default: 0,
    },
    extraCharge: {
      type: Number,
      default: 0,
    },
    finalFare: {
      type: Number,
    },
    finalFareInCoins: {
      type: Number,
    },
    isPeakHourApplied: {
      type: Boolean,
      default: false,
    },
    isCouponApplied: {
      type: Boolean,
      default: false,
    },

    driverTripAcceptedAt: {
      // for calculating late cancellation fee
      type: Date,
    },
    driverArrivedAt: {
      // for calculating driver waiting fee
      type: Date,
    },
    tripStartedAt: {
      type: Date,
    },
    tripCompletedAt: {
      type: Date,
    },

    cancellationReason: {
      type: [String],
    },
    paymentType: {
      type: String,
      enum: {
        values: [EnumPaymentType.CASH, EnumPaymentType.COIN, EnumPaymentType.ONLINE],
        message: `Invalid trip status. Allowed values: ${Object.values(
          EnumPaymentType
        ).join(", ")}`,
      },
    },
    status: {
      type: String,
      enum: {
        values: [
          TripStatus.REQUESTED,
          TripStatus.ACCEPTED,
          TripStatus.ON_THE_WAY,
          TripStatus.ARRIVED,
          TripStatus.PICKED_UP,
          TripStatus.STARTED,
          TripStatus.DESTINATION_REACHED,
          TripStatus.COMPLETED,
          TripStatus.CANCELLED,
          TripStatus.NO_SHOW,
        ],
        message: `Invalid trip status. Allowed values: ${Object.values(
          TripStatus
        ).join(", ")}`,
      },
      default: "requested",
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.index({ pickUpCoordinates: "2dsphere" });
tripSchema.index({ dropOffCoordinates: "2dsphere" });
tripSchema.index({ driverCoordinates: "2dsphere" });

const Trip = model("Trip", tripSchema);

module.exports = Trip;
