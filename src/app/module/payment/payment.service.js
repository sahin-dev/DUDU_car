const status = require('http-status')
const Payment = require("./Payment");
const QueryBuilder = require("../../../builder/queryBuilder");
const ApiError = require("../../../error/ApiError");
const validateFields = require("../../../util/validateFields");
const { default: mongoose } = require("mongoose");
const FiuuService = require("./fiuu.service");
const querystring  = require('querystring')
const crypto = require('crypto')
const {
  EnumPaymentStatus,
  EnumPaymentFor,
  EnumPaymentType,
  TripStatus,
} = require("../../../util/enum");
const Trip = require("../trip/Trip");
const DCoinService = require('../dcoin/dcoin.service');
const User = require('../user/User');
const emitPaymentSuccess = require('../../../socket/emitPaymentSuccess');


const fiuuUrl = `https://sandbox-payment.fiuu.com/RMS/pay/${FiuuService.merchantId}/index.php`

const fiuuNotification = async (payload)=>{
  console.log("notification",payload)
  let payment = await Payment.findOne({orderId:payload.orderid})
  let trip;
  if(payment && payload.status === '00'){
    await Payment.findByIdAndUpdate(payment._id, {status:EnumPaymentStatus.SUCCEEDED}, {new:true})
  
    
    if(payment.paymentFor === EnumPaymentFor.COIN_PURCHASE){
      const userId = payment.user

      const user = await User.findByIdAndUpdate(userId, {'$inc':{coins:payment.amountInCoins}}, {new:true})
      console.log("Coin added successfully")
      // emitPaymentSuccess(updatedTrip, payment);
    }else if(payment.paymentFor === EnumPaymentFor.TRIP) {
      try{
        trip = await Trip.findByIdAndUpdate(payment.trip, {paymentStatus:"paid"}, {new: true});
        try{
           emitPaymentSuccess(trip, payment);
        }catch(err){
          console.log("error payment emitting..", err)
        }
       
      }catch(err){
        console.log("payment notification sending failed" ,  err)
      }
    }
  }else {
    console.log("payment not found")
  }
}

function generateUniqueNumber() { 4229989999000012
  const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
  const random = Math.floor(1000 + Math.random() * 9000); // random 4-digit number
  return Number(`${random}${timestamp}`); // combine both
}


const fiuuCallback = async (payload)=>{
  console.log("callback",payload)
}

const verifyPayment = async (payload)=>{

  return FiuuService.verifySKey(payload)
}


function generateSignature(amount, orderid, merchantId, verifyKey) {
    const raw = `${amount}${merchantId}${orderid}${verifyKey}`;

    return crypto.createHash("md5").update(raw).digest("hex");
}


const initPayment = async (userId,payload)=>{

  validateFields(payload, ["email", "name", "phone"])
  const {tripId, email, name, phone, dCoinId} = payload

  let trip ,dcoin 
  if(tripId){
    
    trip = await Trip.findOne({_id:tripId, status:TripStatus.DESTINATION_REACHED})
    if(!trip){
        throw new ApiError(status.NOT_FOUND, "Trip not found")
    }

    if(trip.paymentType === EnumPaymentType.COIN){

      const finalFare = trip.finalFare
      const user = await User.findById(trip.user)

      if(!user){
        console.log("user not found")
        throw new ApiError(status.NOT_FOUND, "user not found")
      }
      else if(user.coins < finalFare){
        console.log("Your coin is limited")
        throw new ApiError(status.BAD_REQUEST, "Your coin is less than rqquired coin!")
      }else {

        const updatedUser = await  User.findByIdAndUpdate(user._id, {$inc:{coins:-finalFare}}, {new:true})
        // sendPaymentNotification(trip._id)
        console.log(updatedUser)
        let payment = await Payment.create({
          trip: trip._id, 
          user:userId, 
          driver:trip.driver,
          amountForCoinPurchase:0, 
          orderId:101,
          amountInCash:trip.finalFare || 100, 
          amountInCoins:trip.finalFare || 100,
          paymentFor: EnumPaymentFor.TRIP,
          paymentType: trip.paymentType,
          status:EnumPaymentStatus.SUCCEEDED
        })

        const updatedTrip = await Trip.findByIdAndUpdate(trip._id, {paymentStatus:"paid"}, {new:true})
        emitPaymentSuccess(updatedTrip, payment);
        return {message:"coin payment succeeded"}
      }
        
    }
      
  }
  else{
    dcoin = await DCoinService.getDCoin({userId}, {dCoinId})
    if(!dcoin){
      throw new ApiError(status.NOT_FOUND, "Dcoin not found")
    }
  }

  let payment = null

  const uniqueOrderId = generateUniqueNumber()

  if(trip){
    payment = await Payment.create({
      trip: trip._id, 
      user:userId, 
      driver:trip.driver,
      amountForCoinPurchase:0, 
      orderId:uniqueOrderId,
      amountInCash:trip.finalFare || 100, 
      amountInCoins:trip.finalFare || 100,
      paymentFor: EnumPaymentFor.TRIP,
      paymentType: trip.paymentType
    })
  }else{
    payment = await Payment.create({
      user:userId, 
      amountForCoinPurchase:dcoin.MYR, 
      orderId:uniqueOrderId,
      amountInCash:dcoin.MYR, 
      amountInCoins:dcoin.coin,
      paymentFor: EnumPaymentFor.COIN_PURCHASE,
      paymentType: EnumPaymentType.CASH
    })

    console.lo
  }
  


  const paymentData = {
    merchant_id: FiuuService.merchantId,
    orderid: payment.orderId,
    amount: payment.amountInCash,
    country:"MY",
    currency:"MYR",
    bill_name: name,
    bill_email: email,
    bill_mobile:phone,
    vcode:generateSignature(payment.amountInCash,payment.orderId,FiuuService.merchantId,FiuuService.Verify_Key)
          
  };


  try{
    const str = querystring.encode(paymentData)
    return (`${fiuuUrl}?${str}`)
  }catch(err){
    console.log(err.message)
        
  }


}

const createPayment = async (userId,payload)=>{

  const { name, email, phone,amount, tripId} = payload;

  const trip = await Trip.findOne({_id:tripId, status:TripStatus.COMPLETED})
  if (!trip){
    throw new ApiError(status.NOT_FOUND, "Trip not found")
  }

  const payment = await Payment.create({
    trip:trip._id, 
    user:userId, 
    driver:trip.driver,
    amountForCoinPurchase:amount, 
    orderId:tripId,
    amountInCash:trip.finalFare, 
    amountInCoins:trip.finalFareInCoins,
    paymentFor: tripId? EnumPaymentFor.TRIP: EnumPaymentFor.COIN_PURCHASE,
    paymentType: trip.paymentType
  })

  const data = {
    mp_username: FiuuService.email,
    mp_password: FiuuService.password,
    mp_merchant_ID: FiuuService.merchantId,
    mp_verification_key: FiuuService.Verify_Key,
    mp_order_ID: tripId,
    mp_currency: "MYR",
    mp_country: "MY",
    mp_amount: amount,
    mp_bill_description: "Order Payment",
    mp_bill_name: name,
    mp_bill_email: email,
    mp_bill_mobile: phone,
    mp_channel: "multi",
    mp_sandbox_mode: true,
    mp_classic_webcore: true,
  };


  return data
}

const getPayment = async (userData, query) => {
  validateFields(query, ["paymentId"]);

  const payment = await Payment.findOne({
    _id: query.paymentId,
  })
    .populate([{ path: "user" }, { path: "driver" }, { path: "trip" }])
    .lean();

  if (!payment) throw new ApiError(status.NOT_FOUND, "Payment not found");

  return payment;
};

const getAllPayments = async (userData, query) => {
  const paymentQuery = new QueryBuilder(Payment.find({}).populate([{path:"user", select:"name profile_image email"}]).lean(), query)
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [payments, meta] = await Promise.all([
    paymentQuery.modelQuery,
    paymentQuery.countTotal(),
  ]);

  return {
    meta,
    payments,
  };
};

const getDriverEarningReport = async (userData, query) => {
  const { year: strYear, type = EnumPaymentType.CASH } = query;

  validateFields(query, ["year"]);

  const year = Number(strYear);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const driverId = mongoose.Types.ObjectId.createFromHexString(userData.userId);
  const revenueField =
    type === EnumPaymentType.COIN ? "$amountInCoins" : "$amountInCash";

  const [result] = await Payment.aggregate([
    {
      $match: {
        paymentFor: EnumPaymentFor.TRIP,
        status: EnumPaymentStatus.SUCCEEDED,
        driver: driverId,
      },
    },
    {
      $facet: {
        // All years this driver earned
        distinctYears: [
          {
            $group: {
              _id: { $year: "$createdAt" },
            },
          },
          {
            $sort: { _id: 1 },
          },
          {
            $project: {
              year: "$_id",
              _id: 0,
            },
          },
        ],

        // Monthly revenue based on dynamic type (cash or coin)
        monthlyRevenue: [
          {
            $match: {
              createdAt: {
                $gte: startDate,
                $lt: endDate,
              },
            },
          },
          {
            $project: {
              month: { $month: "$createdAt" },
              revenue: revenueField, // 👈 dynamic field
            },
          },
          {
            $group: {
              _id: "$month",
              totalRevenue: { $sum: "$revenue" },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ],

        // Revenue split by cash/coin
        tripRevenueBreakdown: [
          {
            $group: {
              _id: "$paymentType", // cash / coin
              total: {
                $sum: {
                  $add: [
                    { $ifNull: ["$amountInCash", 0] },
                    { $ifNull: ["$amountInCoins", 0] },
                  ],
                },
              },
            },
          },
          {
            $sort: { total: 1 },
          },
        ],
      },
    },
  ]);

  const {
    distinctYears = [],
    monthlyRevenue = [],
    tripRevenueBreakdown = [],
  } = result || {};

  const totalYears = distinctYears.map((item) => item.year);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthlyRevenueObj = monthNames.reduce((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {});

  monthlyRevenue.forEach((r) => {
    const monthName = monthNames[r._id - 1];
    monthlyRevenueObj[monthName] = r.totalRevenue;
  });

  const tripPaymentAnalysis = {};
  tripRevenueBreakdown.forEach((item) => {
    tripPaymentAnalysis[item._id] = item.total;
  });

  return {
    tripPaymentAnalysis,
    total_years: totalYears,
    monthlyRevenue: monthlyRevenueObj,
  };
};

const PaymentService = {
  getPayment,
  getAllPayments,
  getDriverEarningReport,
  fiuuNotification,
  fiuuCallback,
  verifyPayment,
  createPayment,
  initPayment
};

module.exports = PaymentService;
