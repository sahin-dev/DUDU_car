const express = require("express");
const auth = require("../../middleware/auth");
const { uploadFile } = require("../../middleware/fileUploader");
const { UserController } = require("./user.controller");
const config = require("../../../config");

const router = express.Router();

router
  .get("/profile", auth(config.auth_level.user), UserController.getProfile)
  .get("/states", auth(config.auth_level.driver), UserController.getDriverStates)
  .patch(
    "/edit-profile",
    auth(config.auth_level.user),
    uploadFile(),
    UserController.updateProfile
  )
  .post("/verify-identity" ,
    auth(config.auth_level.user),
    uploadFile(),
    UserController.submitNrcDocument
  )
  .delete(
    "/delete-account",
    auth(config.auth_level.user),
    UserController.deleteMyAccount
  );

module.exports = router;
