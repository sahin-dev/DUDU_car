const { status } = require("http-status");

const User = require("../user/User")
const ApiError = require("../../../error/ApiError");
const Referral = require("./Referral");
const NotificationService = require("../notification/notification.service");


const applyReferralCode = async (userId, code)=> {

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(status.NOT_FOUND, "user not found")
    }
   

    const referredBy = await User.findOne({referralCode:code})

    if(!referredBy){
        throw new ApiError(status.BAD_REQUEST, "Invalid referral code!")
    }
    if(user._id.equals(referredBy._id)){
        throw new ApiError(status.BAD_REQUEST, "Sorry! You can not referred yourself.")
    }

    if(user.referredBy && user.referredCode){
        throw new ApiError(status.BAD_REQUEST, "Sorry! You already used another referral code.")
    }

    const existingReferral = await Referral.findOne({referredBy:referredBy._id, user:user.id})

    if(existingReferral){
        throw new ApiError(status.CONFLICT, "Referral already exist!")
    }

     //create referral if not exist

    await Referral.create({
        user:user._id,
        referredBy:referredBy._id,
    })

    await User.findByIdAndUpdate(user._id, {referredBy:referredBy.name, referredCode:code})
   

   

}

const getReferredUserStatus = async (userId) => {
    const referredUser = await Referral.findOne({user:userId})
    

    return referredUser
}


const checkUserForReward = async (userId)=> {

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(status.NOT_FOUND, "user not found")
    }

    const unrewardedReferral = await Referral.find({referredBy:user._id, rewardProvided:false, firstTripCompleted:true})
    const totalUnRewardedReferral = unrewardedReferral.length
    while(totalUnRewardedReferral >= 3){
        const firstThree = unrewardedReferral.splice(0,3)
        await rewardUser(userId, firstThree)
        totalUnRewardedReferral -= 3
    }
}

const rewardUser = async (userId, referrals) => {

    //award user
    const user = await User.findOneAndUpdate({_id:userId}, {$inc:{coins:20}})

    if(user.token){
        NotificationService.sendNotification(user.token, {
            "title": "20 DUUD Coins Rewarded!",
            "message": "You completed 3 successful referrals."
        })
    }

    //update referrals
    referrals.forEach(async referral => {
        await Referral.findByIdAndUpdate(referral._id, {
            rewardProvided:true
        })
    })

}


const updateReferralTripStatus = async (referralId) => {
    const ref = await Referral.findByIdAndUpdate(referralId, {
        firstTripCompleted:true
    })

    checkUserForReward(ref.referredBy)
}



const referralService = {
    applyReferralCode,
    getReferredUserStatus,
    updateReferralTripStatus

}


module.exports = referralService
