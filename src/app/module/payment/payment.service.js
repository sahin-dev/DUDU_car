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


const fiuuNotification = async (payload)=>{
  console.log(payload)

  const isPaymentVerified = FiuuService.verifySKey(payload)

  if(isPaymentVerified){
    //changed payment status to database
    console.log(isPaymentVerified)
  }
  
  return
}


const fiuuCallback = async (payload)=>{
  console.log(payload)
}

const verifyPayment = async (payload)=>{

  return FiuuService.verifySKey(payload)
}


const getFiuuCredentials = async ()=>{

}


function generateSignature(amount, orderid, merchantId, verifyKey) {
    const raw = `${amount}${merchantId}${orderid}${verifyKey}`;

    return crypto.createHash("md5").update(raw).digest("hex");
}


const initPayment = async (payload)=>{

  validateFields(payload, ["tripId", "email", "name", "phone"])
  const {tripId, email, name, phone} = payload

  const trip = await Trip.findOne({_id:tripId, status:TripStatus.COMPLETED})
  if(!trip)
  {
    throw new ApiError(status.NOT_FOUND, "trip not found")
  }
  const fiuuUrl = `https://sandbox-payment.fiuu.com/RMS/pay/${FiuuService.merchantId}/index.php`

  const paymentData = {
    merchant_id: FiuuService.merchantId,
    orderid: tripId,
    amount: trip.finalFare || 100,
    country:"MY",
    currency:"MYR",
    bill_name: name,
    bill_email: email,
    bill_mobile:phone,
    vcode:generateSignature(trip.finalFare || 100,tripId,FiuuService.merchantId,FiuuService.Verify_Key)
          
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
