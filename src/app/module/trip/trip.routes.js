const express = require("express");
const auth = require("../../middleware/auth");
const config = require("../../../config");
const TripController = require("./trip.controller");

const router = express.Router();

router
  .get("/get-trip", auth(config.auth_level.user), TripController.getTrip)
  .get(
    "/get-all-trips",
    auth(config.auth_level.user),
    TripController.getAllTrips
  )
  .delete(
    "/delete-trip",
    auth(config.auth_level.admin),
    TripController.deleteTrip
  )
  .patch(
    "/update-toll-fee",
    auth(config.auth_level.driver),
    TripController.updateTollFee
  )
  .get(
    "/get-trip-statistics",
    auth(config.auth_level.driver),
    TripController.getTripStatistics
  )

  // user specific ========================
  .get(
    "/get-user-current-trip",
    auth(config.auth_level.user),
    TripController.getUserCurrentTrip
  )

  // fare calculator ========================
  .post("/get-fare", auth(config.auth_level.user), TripController.getFare)

  // driver specific ========================
  .get(
    "/get-driver-current-trip",
    auth(config.auth_level.driver),
    TripController.getDriverCurrentTrip
  )

  // Peak hour routes =========================
  .get(
    "/get-peak-hours",
    auth(config.auth_level.user),
    TripController.getPeakHours
  )
  .patch(
    "/post-time-range",
    auth(config.auth_level.admin),
    TripController.postTimeRange
  )
  .patch(
    "/delete-time-range",
    auth(config.auth_level.admin),
    TripController.deleteTimeRange
  )
  .patch(
    "/update-toggle-peak-hours",
    auth(config.auth_level.admin),
    TripController.updateTogglePeakHours
  );

module.exports = router;
