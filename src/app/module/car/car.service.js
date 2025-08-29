const { default: status } = require("http-status");
const Car = require("./Car");
const QueryBuilder = require("../../../builder/queryBuilder");
const ApiError = require("../../../error/ApiError");
const validateFields = require("../../../util/validateFields");
const postNotification = require("../../../util/postNotification");
const unlinkFile = require("../../../util/unlinkFile");
const processFileUpdates = require("../../../util/processFileUpdates");
const User = require("../user/User");
const { default: mongoose } = require("mongoose");
const convertToArray = require("../../../util/convertToArray");
const updateFileArrayField = require("../../../util/updateFileArrayField");

const postCar = async (req) => {
  validateFields(req, ["files", "body"]);

  const { body: payload, files } = req;

  validateFields(files, [
    "car_image",
    "car_grant_image",
    "car_insurance_image",
    "e_hailing_vehicle_permit_pdf",
  ]);
  validateFields(payload, [
    "brand",
    "model",
    "type",
    "seats",
    "evpNumber",
    "evpExpiry",
    "carNumber",
    "color",
    "carLicensePlate",
    "vin",
    "insuranceStatus",
    "registrationDate",
  ]);

  const carData = {
    brand: payload.brand,
    model: payload.model,
    type: payload.type,
    seats: payload.seats,
    evpNumber: payload.evpNumber,
    evpExpiry: payload.evpExpiry,
    carNumber: payload.carNumber,
    color: payload.color,
    carLicensePlate: payload.carLicensePlate,
    vin: payload.vin,
    insuranceStatus: payload.insuranceStatus,
    registrationDate: payload.registrationDate,
    car_image: files.car_image.map((file) => file.path),
    car_grant_image: files.car_grant_image[0].path,
    car_insurance_image: files.car_insurance_image[0].path,
    e_hailing_vehicle_permit_pdf: files.e_hailing_vehicle_permit_pdf[0].path,
  };

  const car = await Car.create(carData);

  postNotification("Car created", "A new car has been added to DuDu");

  return car;
};

const getCar = async (userData, query) => {
  validateFields(query, ["carId"]);

  if (!mongoose.Types.ObjectId.isValid(query.carId)){
    throw new ApiError(status.BAD_REQUEST, "carId is not valid")
  }

  const car = await Car.findById(query.carId)
    .populate([
      {
        path: "assignedDriver",
        select: "-createdAt -updatedAt -__v",
      },
    ])
    .lean();

  if (!car) throw new ApiError(status.NOT_FOUND, "Car not found");

  return car;
};

const getAllCars = async (userData, query) => {
  const carQuery = new QueryBuilder(
    Car.find({})
      .populate([
        {
          path: "assignedDriver",
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

  const [cars, meta] = await Promise.all([
    carQuery.modelQuery,
    carQuery.countTotal(),
  ]);

  return {
    meta,
    cars,
  };
};

// update the fields in the car and also update the images and unlink the old images
const updateCar = async (req) => {
  const { body: payload, files = {} } = req || {};

  validateFields(payload, ["carId"]);

  const car = await Car.findById(payload.carId).lean();
  if (!car) throw new ApiError(status.NOT_FOUND, "Car not found");

  const deletedIndexes = convertToArray(
    payload.car_image_deleted_indexes || "[]"
  );

  const updatedCarImages = updateFileArrayField(
    car.car_image,
    deletedIndexes,
    files.car_image || []
  );

  console.log(files)

  const fileFields = [
    { key: "car_grant_image", oldPath: car.car_grant_image },
    { key: "car_insurance_image", oldPath: car.car_insurance_image },
    {
      key: "e_hailing_vehicle_permit_pdf",
      oldPath: car.e_hailing_vehicle_permit_pdf,
    },
  ];

  const fileUpdates = processFileUpdates(files, fileFields);

  

  const updateData = {
    ...payload,
    ...fileUpdates,
    ...(payload.car_image_deleted_indexes && { car_image: updatedCarImages }),
    ...(files.car_image && { car_image: updatedCarImages }),
    carId: undefined,
  };

  const updatedCar = await Car.findByIdAndUpdate(payload.carId, updateData, {
    new: true,
  }).lean();

  postNotification(
    "Car updated",
    `A car has been updated in DuDu. Car ID: ${payload.carId}`
  );

  return updatedCar;
};

// assign a car to a driver
const updateAssignCarToDriver = async (userData, payload) => {
  validateFields(payload, ["carId", "driverId"]);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [car, driver] = await Promise.all([
      Car.findById(payload.carId).lean(),
      User.findById(payload.driverId).lean(),
    ]);

    if (!car) throw new ApiError(status.NOT_FOUND, "Car not found");
    if (!driver) throw new ApiError(status.NOT_FOUND, "Driver not found");

    // if (driver.assignedCar)
    //   throw new ApiError(status.BAD_REQUEST, "Driver already has a car");

    const updatedCar = await Car.findByIdAndUpdate(
      payload.carId,
      {
        $set: {
          assignedDriver: payload.driverId,
          isAssigned: true,
        },
      },
      { new: true, session }
    )
      .select("assignedDriver")
      .lean();

    const updatedDriver = await User.findByIdAndUpdate(
      payload.driverId,
      { $set: { assignedCar: payload.carId } },
      { new: true, session }
    )
      .select("assignedCar")
      .lean();

    await session.commitTransaction();

    postNotification(
      "Car assigned",
      `A car has been assigned to a driver in DuDu. Car ID: ${payload.carId}`
    );
    postNotification(
      "Car assigned",
      `A car has been assigned to you.`,
      car.assignedDriver
    );

    return { updatedCar, updatedDriver };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// when deleting a car, unlink the images, remove the driver assignment and delete the car
const deleteCar = async (userData, payload) => {
  validateFields(payload, ["carId"]);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const car = await Car.findById(payload.carId).lean();
    if (!car) throw new ApiError(status.NOT_FOUND, "Car not found");

    // push all the images of the car in a array
    const fileFields = [
      { key: "car_image", oldPath: car.car_image }, // array of images
      { key: "car_grant_image", oldPath: car.car_grant_image },
      { key: "car_insurance_image", oldPath: car.car_insurance_image },
      {
        key: "e_hailing_car_permit_image",
        oldPath: car.e_hailing_car_permit_image,
      },
    ];

    // push every path inside fileFields into an array
    const pathsToUnlink = fileFields
      .flatMap(({ oldPath }) => (Array.isArray(oldPath) ? oldPath : [oldPath]))
      .filter((path) => path); // filter out null values

    if (car.assignedDriver) {
      const updatedDriver = await User.findByIdAndUpdate(
        car.assignedDriver,
        { $unset: { assignedCar: null } },
        { new: true, session }
      );

      if (!updatedDriver)
        throw new ApiError(status.INTERNAL_SERVER_ERROR, "Error unlinking car");
    }

    const result = await Car.deleteOne({ _id: payload.carId }, { session });

    if (!result.deletedCount)
      throw new ApiError(status.NOT_FOUND, "Car not found");

    await session.commitTransaction();

    // only unlink the images after the transaction is committed
    pathsToUnlink.forEach((path) => {
      if (path) unlinkFile(path);
    });

    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const CarService = {
  postCar,
  getCar,
  getAllCars,
  updateCar,
  deleteCar,
  updateAssignCarToDriver,
};

module.exports = CarService;
