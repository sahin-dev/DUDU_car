const PaymentService = require("./payment.service");
const sendResponse = require("../../../util/sendResponse");
const catchAsync = require("../../../util/catchAsync");

// const initiatePayment = catchAsync(async(req, res)=>{
//   const url = await PaymentService.initiatePayment()
//   res.redirect(url)

//   sendResponse(res, {
//     statusCode:200,
//     success:true,
//     message:"Payement request initiated",
//     data:url
//   })
// })

const fiuuNotification = catchAsync(async (req,res)=>{
  
  await PaymentService.fiuuNotification(req.body)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:"payment info found",
    data:null
  })
})


const fiuuCallback = catchAsync(async (req,res)=>{
  
  await PaymentService.fiuuCallback(req.body)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message:"payment info found",
    data:null
  })
})

const getPayment = catchAsync(async (req, res) => {
  const result = await PaymentService.getPayment(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment retrieved",
    data: result,
  });
});

const getAllPayments = catchAsync(async (req, res) => {
  const result = await PaymentService.getAllPayments(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payments retrieved",
    data: result,
  });
});

const getDriverEarningReport = catchAsync(async (req, res) => {
  const result = await PaymentService.getDriverEarningReport(
    req.user,
    req.query
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver earning report retrieved",
    data: result,
  });
});

const verifyPayment = catchAsync (async (req, res)=>{
  const payload = req.body
  const result = await PaymentService.verifyPayment(payload)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment Verified successfully",
    data: result,
  });
})


const createPayment = catchAsync(async (req,res)=>{
  const payload = req.body

  const createdPayment = await PaymentService.createPayment(payload)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment created",
    data:createdPayment
  })
})

const PaymentController = {
  getPayment,
  getAllPayments,
  getDriverEarningReport,
  fiuuNotification,
  fiuuCallback,
  verifyPayment,
  createPayment
};

module.exports = PaymentController;
