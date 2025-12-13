const mongoose = require("mongoose");
const { UserAccountStatus, VerificationStatusEnum } = require("../../../util/enum");
const generateUniqueCode = require("../../../util/referralCOdes");

const { Schema, model, Types } = mongoose;

const ObjectId = Schema.Types.ObjectId;

const UserSchema = new Schema(
  {
    authId: {
      type: ObjectId,
      required: true,
      ref: "Auth",
    },
   
    name: {
      type: String,
      required: true,
    },
    // token field to accept firebase fcm token
    token:{
      type: String,
      required:false
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["USER", "DRIVER"],
      required: true,
    },
    profile_image: {
      type: String,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: String,
    },
    address: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
   
    nrc_verification_status:{
      type: String,
      default:VerificationStatusEnum.UNVERIFIED
    },
    nrc_images:{
      type:[String],
      required:false
  
    },
    identification_number:{
      type:String,
      required:false
    },
    id_or_passport_image: {
      type: String,
    },

    // driver specific fields
    locationCoordinates: {
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
    isAvailable: {
      type: Boolean,
    },
    idOrPassportNo: {
      type: String,
    },
    drivingLicenseNo: {
      type: String,
    },
    licenseType: {
      type: String,
    },
    licenseExpiry: {
      type: String,
    },
    psv_license_image: {
      type: String,
    },
    driving_license_image: {
      type: String,
    },
    assignedCar: {
      type: ObjectId,
      ref: "Car",
    },

    // user specific fields
    emergencyPhoneNumber: {
      type: String,
    },
    userAccountStatus: {
      type: String,
      enum: {
        values: Object.values(UserAccountStatus),
        message: `Invalid value. Allowed values: ${Object.values(
          UserAccountStatus
        ).join(", ")}`,
      },
      default: UserAccountStatus.UNVERIFIED,
    },
    coins: {
      type: Number,
      min: 0,
      default: 0
    },
   
    // outstanding fee from previous trips
    outstandingFee: {
      type: Number,
      default: 0,
      min: [0, "outstanding fee cannot be negative"],
    },
    //referral system related paths
    referralCode: {
      type:String,
      required:false,
      unique:true
    },
    referredBy: {
      type:String,
      required:false
    },
    referredCode:{
      type:String,
      required:false
    },
    completedReferralCount: {
      type:Number,
      default:0
    },

  },
  
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function(next) {

  if(this.isNew){
    let code =  generateUniqueCode()
    let user = await User.findOne({referralCode:code})

    while(user){
      code = generateUniqueCode()
      user = await User.findOne({referralCOde:code})
    }
    this.referralCode = code
    console.log("new user created with referral code: ",code )
  }
  if(!this.referralCode){
    const code = generateUniqueCode()
    this.referralCode = code
    console.log("referral code set for existing user: ",code )
  }
  next()
})




const User = model("User", UserSchema);

module.exports = User;
