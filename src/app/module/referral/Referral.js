
const { Schema, model } = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const referralSchema = new Schema({
    user:{
        type:ObjectId,
        ref:"User"
    },
    referredBy:{
        type:ObjectId,
        ref:"User"
    },
    rewardProvided:{
        type:Boolean,
        default:false
    },

    firstTripCompleted:{
        type:Boolean,
        default:false
    }

},{
    
timestamps: true,
  
})

const Referral = model("Referral", referralSchema)

module.exports = Referral