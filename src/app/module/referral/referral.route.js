const express = require("express")
const  referralController  = require("./referral.controller")
const auth = require("../../middleware/auth")
const config = require("../../../config")

const router = express.Router()

router.post("/",auth(), referralController.useReferralCode)

module.exports = router