const { status } = require("http-status");

const ApiError = require("../../../error/ApiError");
const QueryBuilder = require("../../../builder/queryBuilder");
const postNotification = require("../../../util/postNotification");
const validateFields = require("../../../util/validateFields");
const { default: mongoose } = require("mongoose");
const { EnumUserRole, EnumTripType, TripStatus } = require("../../../util/enum");
const Review = require("./Review");
const Trip = require("../trip/Trip");
const Car = require("../car/Car");

const postReview = async (userData, payload) => {
  // validateFields(payload, ["carId","rating"]);

  const { userId } = userData;
  const { carId } = payload || {};
  const reviewData = {
    user: userId,
    rating: payload.rating,
    review: payload.review
  };

  if(!mongoose.Types.ObjectId.isValid(carId)){
    throw new ApiError(status.BAD_REQUEST, "Car id is not valid");
  }


  const car = await Car.findById(payload.carId).populate("assignedDriver").lean();


   if (!car) throw new ApiError(status.NOT_FOUND, "Car not found");

 
  reviewData.driver = car.assignedDriver._id;


  const result = await Review.create(reviewData);

  

  postNotification(
    "New Review Alert",
    `You've received a new ${payload.rating}-star review.`,
    result.driver
  );

  return result;
};

const getAllReviews = async (userData, query) => {
  validateFields(query,["driverId"])
  const queryObj = {driver: query.driverId}
  const reviewQuery = new QueryBuilder(
    Review.find(queryObj)
      .populate([
        {
          path: "user",
          select: "-createdAt -updatedAt -__v",
        },
      ])
      .lean(),
    query
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    reviewQuery.modelQuery,
    reviewQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const getReview = async (userData, query) => {
  validateFields(query, ["reviewId"]);

  const review = await Review.findById(query.reviewId).lean();
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");

  return review;
};

const updateReview = async (userData, payload) => {
  validateFields(payload, ["reviewId"]);

  const updateData = {
    ...(payload.rating && { rating: payload.rating }),
    ...(payload.review && { review: payload.review }),
  };

  const result = await Review.findByIdAndUpdate(
    payload.reviewId,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!result) throw new ApiError(status.NOT_FOUND, "Review not found");

  return result;
};

const deleteReview = async (userData, payload) => {
  validateFields(payload, ["reviewId"]);

  const result = await Review.deleteOne({ _id: payload.reviewId });

  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Review not found");

  return result;
};

const getDriverRating = async (query) => {
  const { driverId } = query;
  const driverReviews = await Review.find({ driver: driverId }).populate({path:'user', select:'name profile_image'})
    .select("rating review")
    .lean();  

  if (!driverReviews || driverReviews.length === 0) {
    return {
      averageRating: 0.00,
      reviews: [],
    };
  }
  const totalRating = driverReviews.reduce((acc, review) => acc + review.rating, 0);
  const averageRating = parseFloat((totalRating / driverReviews.length).toFixed(2));
  return {
    averageRating,
    reviews: driverReviews,
  };
}

const ReviewService = {
  postReview,
  getAllReviews,
  getReview,
  deleteReview,
  updateReview,
  getDriverRating
};

module.exports = ReviewService;
