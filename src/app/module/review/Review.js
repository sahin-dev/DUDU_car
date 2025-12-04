const { Schema, model } = require("mongoose");

const ObjectId = Schema.Types.ObjectId;

const reviewSchema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    driver:{
      type:ObjectId,
      ref:"User",
      required:true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    review: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Review = model("Review", reviewSchema);

module.exports = Review;
