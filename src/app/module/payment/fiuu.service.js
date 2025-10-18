const { default: status } = require("http-status");
const Payment = require("./Payment");
const QueryBuilder = require("../../../builder/queryBuilder");
const ApiError = require("../../../error/ApiError");
const validateFields = require("../../../util/validateFields");
const { default: mongoose } = require("mongoose");
const crypto  = require('crypto')
const {
  EnumPaymentStatus,
  EnumPaymentFor,
  EnumPaymentType,
} = require("../../../util/enum");
const generateHash = require("../../../util/md5");

const getAllPayments = async (userData, query) => {};


//function to generate unique vcode
//send vcode to payment request endpoint

function generateVcode(amount, orderId) {
  const raw = `${amount}${this.merchantId}${orderId}${this.Verify_Key}`;

  return generateHash(raw)
}


//veerify key return from payment service to authenticate the transaction

function verifySKey(data) {
  const preSkey = generateHash(`${data.tranID}${data.orderid}${data.status}${data.domain}${data.amount}${data.currency}`)
  const skey = generateHash(`${data.paydate}${data.domain}${preSkey}${data.appcode}${this.secretKey}`)

  return skey === data.skey;
}


module.exports = {
  // FIUU_API_URL=https://www.onlinepayment.com.my/MOLPay/pay/ # Check Fiuu docs for the correct endpoint
  // FIUU_RETURN_URL=yourApp://payment/success # Your app's custom URL scheme
  // FIUU_CALLBACK_URL=https://yourdomain.com/api/payment/fiuu-callback
  // FIUU_NOTIFICATION_URL=https://yourdomain.com/api/payment/fiuu-notification # If applicable
  merchantId : 'SB_duducar',
  Verify_Key:'cc90186650dd4ffa3d05bb3528e2a3fa',
  secretKey:'6a99e3f4de4de83083aaf18456fb9c10',
  email:"duducar@domain.com",
  password:"Duducarmalaysia#2025",
  generateVcode: generateVcode.bind(this),
  verifySKey : verifySKey.bind(this)
};;
