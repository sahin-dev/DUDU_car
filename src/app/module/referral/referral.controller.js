const catchAsync = require( "../../../util/catchAsync")
const sendResponse = require("../../../util/sendResponse")
const referralService = require("./referral.service")


const useReferralCode  = catchAsync(async (req, res) => {

    const {code} = req.body

    const user = req.user

    const result = await referralService.applyReferralCode(user.userId, code)

    sendResponse(res, {
        statusCode:200,
        success: true,
        message:"Referral code redeemedd successfully",
        data:result
    })
})

const referralController = {
    useReferralCode

}

module.exports = referralController