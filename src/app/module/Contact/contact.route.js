const { Router } = require("express");
const { contactController } = require("./contact.controller");
const auth = require("../../middleware/auth");
const config = require("../../../config");

const router = Router()

router.route("/").get(contactController.getContacts).post(auth(config.auth_level.admin), contactController.updateContact)

module.exports.contactRoutes = router