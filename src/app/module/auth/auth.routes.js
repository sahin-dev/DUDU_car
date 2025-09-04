const express = require("express");
const auth = require("../../middleware/auth");
const { AuthController } = require("../auth/auth.controller");
const config = require("../../../config");
const limiter = require("../../middleware/limiter");

const router = express.Router();

router
  .post("/register", AuthController.registrationAccount)
  // .post("/login", limiter, AuthController.loginAccount)
  .post("/login", AuthController.loginAccount)
  .post("/social-login", AuthController.socialLogin)
  .post("/activate-account", AuthController.activateAccount)
  .post("/activation-code-resend", AuthController.resendActivationCode)
  .post("/forgot-password", AuthController.forgotPass)
  .post("/forget-pass-otp-verify", AuthController.forgetPassOtpVerify)
  .post("/reset-password", AuthController.resetPassword)
  .post("/logout", auth(), AuthController.logout)
  .patch(
    "/change-password",
    auth(config.auth_level.user),
    AuthController.changePassword
  );
router.post('/apple-login', AuthController.oAuthLogin);
module.exports = router;
