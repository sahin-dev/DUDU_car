const auth = require("../../middleware/auth");
const express = require("express");
const DashboardController = require("./dashboard.controller");
const config = require("../../../config");
const { uploadFile } = require("../../middleware/fileUploader");

const router = express.Router();

router

  // overview ========================
  .get(
    "/total-overview",
    auth(config.auth_level.admin),
    DashboardController.totalOverview
  )
  .get(
    "/get-revenue",
    auth(config.auth_level.admin),
    DashboardController.getRevenue
  )
  .get("/growth", auth(config.auth_level.admin), DashboardController.growth)

  // driver-user management ==================
  .get("/get-user", auth(config.auth_level.admin), DashboardController.getUser)
  .post(
    "/post-driver",
    auth(config.auth_level.admin),
    uploadFile(),
    DashboardController.postDriver
  )
  .get(
    "/get-driver",
    auth(config.auth_level.admin),
    DashboardController.getDriver
  )
  .get(
    "/get-all-drivers-or-users",
    auth(config.auth_level.admin),
    DashboardController.getAllDriversOrUsers
  )
  .patch(
    "/edit-driver",
    auth(config.auth_level.admin),
    uploadFile(),
    DashboardController.editDriver
  )
  .get(
    "/get-user-trip-stats",
    auth(config.auth_level.admin),
    DashboardController.getUserTripStats
  )
  .patch(
    "/block-unblock-user-driver",
    auth(config.auth_level.admin),
    DashboardController.blockUnblockUserDriver
  )

  // announcement management ==================
  .get("/get-announcement", DashboardController.getAnnouncement)
  .patch(
    "/update-announcement",
    auth(config.auth_level.admin),
    DashboardController.updateAnnouncement
  )
  .patch(
    "/update-toggle-announcement",
    auth(config.auth_level.admin),
    DashboardController.updateToggleAnnouncement
  )
  // announcement management ==================
  .get("/get-fare", auth(config.auth_level.admin), DashboardController.getFareSettings)
  .post(
    "/create-fare",
    auth(config.auth_level.admin),
    DashboardController.createFare
  )
  .patch(
    "/update-fare",
    auth(config.auth_level.admin),
    DashboardController.updateFare
  )
  .post("/verification-status", 
    auth(config.auth_level.admin),
    DashboardController.updateVerificationStatus
  )


module.exports = router;
