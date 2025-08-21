const { default: status } = require("http-status");
const Trip = require("./Trip");
const QueryBuilder = require("../../../builder/queryBuilder");
const ApiError = require("../../../error/ApiError");
const validateFields = require("../../../util/validateFields");
const {
  EnumUserRole,
  EnumPaymentType,
  TripStatus,
} = require("../../../util/enum");
const OnlineSession = require("../onlineSession/OnlineSession");
const dateTimeValidator = require("../../../util/dateTimeValidator");
const PeakHour = require("./PeakHour");
const isPeakHour = require("../../../util/isPeakHour");
const getTimeRange = require("../../../util/getTimeRage");
const { default: mongoose } = require("mongoose");
const fareCalculator = require("../../../util/fareCalculator");
const ReviewService = require("../review/review.service");

const getTrip = async (userData, query) => {
  validateFields(query, ["tripId"]);

  const trip = await Trip.findOne({
    _id: query.tripId,
  })
    .populate([
      {
        path: "user",
        select: "-_id -authId -createdAt -updatedAt -__v",
      },
      {
        path: "driver",
        select: "profile_image name email",
      },
      {
        path: "car",
        select: "-createdAt -updatedAt -__v",
      },
    ])
    .lean();

  if (!trip) throw new ApiError(status.NOT_FOUND, "Trip not found");

  return trip;
};

const getAllTrips = async (userData, query) => {
  /**
   * Retrieves a list of trips based on user role and query parameters.
   * - If the user is an **admin**, fetches all trips.
   * - Otherwise, fetches trips associated with the user or driver.
   */

  const queryObj =
    userData.role === EnumUserRole.ADMIN
      ? {}
      : {
          [userData.role === EnumUserRole.DRIVER ? "driver" : "user"]:
            userData.userId,
        };

  const tripQuery = new QueryBuilder(
    Trip.find(queryObj)
      .populate([
        {
          path: "user",
          select: "name profile_image",
        },
        {
          path: "driver",
          select: "name profile_image",
        },
      ])
      .lean(),
    query
  )
    .search(["status", "cancellationReason", "dropOffAddress", "pickUpAddress"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [trips, meta] = await Promise.all([
    tripQuery.modelQuery,
    tripQuery.countTotal(),
  ]);

  return {
    meta,
    trips,
  };
};

const deleteTrip = async (userData, payload) => {
  validateFields(payload, ["tripId"]);

  const trip = await Trip.deleteOne({
    _id: payload.tripId,
  });

  if (!trip.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Trip not found");

  return trip;
};

const updateTollFee = async (userData, payload) => {
  // Updates the toll fee of a trip by adding the provided tollFee to the existing one.
  validateFields(payload, ["tripId", "tollFee"]);

  const trip = await Trip.findById(payload.tripId).lean();
  if (!trip) throw new ApiError(status.NOT_FOUND, "Trip not found");

  const newTollFee = Math.max(0, trip.tollFee + Number(payload.tollFee));

  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: payload.tripId },
    { tollFee: newTollFee },
    { new: true }
  );

  return updatedTrip;
};

const getTripStatistics = async (userData, query) => {
  const { filter = "all-time" } = query;
  const dateFilter = getTimeRange(filter.toLowerCase().trim());

  if (userData.role === EnumUserRole.ADMIN) validateFields(query, ["userId"]);

  const matchStage = {
    status: TripStatus.COMPLETED,
    driver: mongoose.Types.ObjectId.createFromHexString(
      userData.role === EnumUserRole.ADMIN ? query.userId : userData.userId
    ),
  };

  if (Object.keys(dateFilter).length > 0)
    matchStage.tripCompletedAt = dateFilter;

  const stats = await Trip.aggregate([
    { $match: matchStage },
    {
      $facet: {
        totalEarnings: [
          {
            $group: { _id: null, total: { $sum: "$finalFare" } },
          },
        ],
        earningsByCash: [
          {
            $match: { paymentType: EnumPaymentType.CASH },
          },
          {
            $group: { _id: null, total: { $sum: "$finalFare" } },
          },
        ],
        earningsByCoin: [
          {
            $match: { paymentType: EnumPaymentType.COIN },
          },
          {
            $group: { _id: null, total: { $sum: "$finalFareInCoins" } },
          },
        ],
        totalTrips: [
          {
            $count: "count",
          },
        ],
        totalDistance: [
          {
            $group: { _id: null, total: { $sum: "$distance" } },
          },
        ],
      },
    },
  ]);

  const result = await OnlineSession.aggregate([
    {
      $match: {
        createdAt: dateFilter,
      },
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $divide: ["$duration", 1000 * 60], // convert ms to minutes
          },
        },
      },
    },
  ]);

  const format = (arr) => (arr[0] ? arr[0].total || arr[0].count : 0);

  return {
    totalEarn: format(stats[0].totalEarnings),
    cash: format(stats[0].earningsByCash),
    coin: format(stats[0].earningsByCoin),
    numberOfTrips: format(stats[0].totalTrips),
    tripDistance: format(stats[0].totalDistance),
    activeHours: format(result),
  };
};

// driver specific ========================

const getDriverCurrentTrip = async (userData, payload) => {
  const validStatus = [
    TripStatus.ACCEPTED,
    TripStatus.ON_THE_WAY,
    TripStatus.ARRIVED,
    TripStatus.PICKED_UP,
    TripStatus.STARTED,
    TripStatus.DESTINATION_REACHED,
  ];

  const trip = await Trip.findOne({
    driver: userData.userId,
    status: { $in: validStatus },
  })
    .populate([
      {
        path: "user",
      },
      {
        path: "driver",
        
        populate: {
          path: "assignedCar",
        },
      },
    ])
    .sort({ updatedAt: -1 })
    .lean();

  if (!trip) throw new ApiError(status.NOT_FOUND, "No current trip found.");

  

  return trip;
};

// user specific ========================

const getUserCurrentTrip = async (userData, payload) => {
  const validStatus = [
    TripStatus.ACCEPTED,
    TripStatus.ON_THE_WAY,
    TripStatus.ARRIVED,
    TripStatus.PICKED_UP,
    TripStatus.STARTED,
    TripStatus.DESTINATION_REACHED,
  ];

  const trip = await Trip.findOne({
    user: userData.userId,
    status: { $in: validStatus },
  })
    .populate([
      {
        path: "user",
      },
      {
        path: "driver",
        populate: {
          path: "assignedCar",
        },
      },
    ])
    .sort({ updatedAt: -1 })
    .lean();

  if (!trip) throw new ApiError(status.NOT_FOUND, "No current trip found.");
  
  const driverReview = await ReviewService.getDriverRating(
    trip.driver._id.toString(),{})
    trip.driver.rating = driverReview.averageRating;

  return trip;
};

// fare calculator ========================

const getFare = async (userData, payload) => {
  validateFields(payload, ["duration", "distance"]);

  const estimatedFare = await fareCalculator(
    null,
    payload.duration,
    payload.distance,
    payload.coupon
  );

  return { estimatedFare };
};

// peak hours ========================

const getPeakHours = async (userData, payload) => {
  const peak = await PeakHour.findOne().lean();
  if (!peak) throw new ApiError(status.NOT_FOUND, "No peak hours found.");
  return peak;
};

const postTimeRange = async (userData, payload) => {
  validateFields(payload, ["timeRanges", "isActive"]);
  validateFields(payload.timeRanges, ["start", "end"]);
  dateTimeValidator([], [payload.timeRanges.start, payload.timeRanges.end]);

  const { start, end } = payload.timeRanges;

  const peak = await PeakHour.findOneAndUpdate(
    {},
    {
      $push: { timeRanges: { start, end } },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!peak) throw new ApiError(status.NOT_FOUND, "Peak hours not found");

  return peak;
};

const deleteTimeRange = async (userData, payload) => {
  validateFields(payload, ["index"]);
  const { index } = payload; // index of the timeRange to remove

  if (typeof index !== "number")
    throw new ApiError(status.BAD_REQUEST, "Index must be a number.");

  const peak = await PeakHour.findOne();
  if (!peak) throw new ApiError(status.NOT_FOUND, "No peak hours found.");

  if (index < 0 || index >= peak.timeRanges.length)
    throw new ApiError(
      status.BAD_REQUEST,
      "Index out of bounds. Please provide a valid index."
    );

  peak.timeRanges.splice(index, 1);
  await peak.save();

  return peak;
};

const updateTogglePeakHours = async (userData, payload) => {
  validateFields(payload, ["isActive"]);

  const peak = await PeakHour.findOneAndUpdate(
    {},
    {
      isActive: payload.isActive,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!peak) throw new ApiError(status.NOT_FOUND, "Peak hours not found");

  return peak;
};

// utility functions ==================

const TripService = {
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
};

module.exports = TripService;
