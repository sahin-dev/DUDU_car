const TripService = require("./trip.service");
const sendResponse = require("../../../util/sendResponse");
const catchAsync = require("../../../util/catchAsync");

const getTrip = catchAsync(async (req, res) => {
  const result = await TripService.getTrip(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trip retrieved",
    data: result,
  });
});

const getAllTrips = catchAsync(async (req, res) => {
  const result = await TripService.getAllTrips(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trips retrieved",
    data: result,
  });
});

const deleteTrip = catchAsync(async (req, res) => {
  const result = await TripService.deleteTrip(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trip deleted",
    data: result,
  });
});

const updateTollFee = catchAsync(async (req, res) => {
  const result = await TripService.updateTollFee(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Toll fee updated",
    data: result,
  });
});

const getTripStatistics = catchAsync(async (req, res) => {
  const result = await TripService.getTripStatistics(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trip statistics retrieved",
    data: result,
  });
});

// driver specific ========================
const getDriverCurrentTrip = catchAsync(async (req, res) => {
  const result = await TripService.getDriverCurrentTrip(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver current trip retrieved",
    data: result,
  });
});

// user specific ========================
const getUserCurrentTrip = catchAsync(async (req, res) => {
  const result = await TripService.getUserCurrentTrip(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User current trip retrieved",
    data: result,
  });
});

// fare calculator ========================
const getFare = catchAsync(async (req, res) => {
  const result = await TripService.getFare(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Fare calculated",
    data: result,
  });
});

// Peak hour =========================
const getPeakHours = catchAsync(async (req, res) => {
  const result = await TripService.getPeakHours();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Peak hours retrieved",
    data: result,
  });
});

const postTimeRange = catchAsync(async (req, res) => {
  const result = await TripService.postTimeRange(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Time range created",
    data: result,
  });
});

const deleteTimeRange = catchAsync(async (req, res) => {
  const result = await TripService.deleteTimeRange(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Time range deleted",
    data: result,
  });
});

const updateTogglePeakHours = catchAsync(async (req, res) => {
  const result = await TripService.updateTogglePeakHours(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Peak hour updated",
    data: result,
  });
});

const getPrebookTrips = catchAsync(async (req, res) => {
  const result = await TripService.getPrebookTrips();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Prebook trips retrieved",
    data: result,
  });
});

const assignDriverForPrebookTrip = catchAsync(async (req, res) => {
  const result = await TripService.assignDriverForPrebookTrip(req.body.tripId, req.body.driverId);
  sendResponse(res, { 
    statusCode: 200,
    success: true,
    message: "Driver assigned for prebook trip",
    data: result,
   });
});

const getAvailableDrivers = catchAsync(async (req, res) => {
  const result = await TripService.getAvailableDrivers();
  sendResponse(res, { 
    statusCode: 200,
    success: true,
    message: "Available drivers retrieved",
    data: result,
   });
});


const TripController = {
  getTrip,
  getAllTrips,
  deleteTrip,
  updateTollFee,
  getTripStatistics,
  getDriverCurrentTrip,
  getUserCurrentTrip,
  getFare,
  getPeakHours,
  postTimeRange,
  deleteTimeRange,
  updateTogglePeakHours,
  assignDriverForPrebookTrip,
  getPrebookTrips,
  getAvailableDrivers,
};

module.exports = TripController;
