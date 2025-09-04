const cron = require("node-cron");
const { default: status } = require("http-status");
const { default: mongoose } = require("mongoose");

const User = require("../app/module/user/User");
const emitError = require("./emitError");
const socketCatchAsync = require("../util/socketCatchAsync");
const validateSocketFields = require("../util/socketValidateFields");
const fareCalculator = require("../util/fareCalculator");
const Trip = require("../app/module/trip/Trip");
const {
  EnumSocketEvent,
  EnumUserRole,
  TripStatus,
  EnumTripExtraChargeType,
  EnumTripType,
} = require("../util/enum");
const postNotification = require("../util/postNotification");
const emitResult = require("./emitResult");
const OnlineSession = require("../app/module/onlineSession/OnlineSession");
const { logger } = require("../util/logger");
const Chat = require("../app/module/chat/Chat");
const Message = require("../app/module/chat/Message");
const validateFields = require("../util/validateFields");
const isPeakHour = require("../util/isPeakHour");
const ReviewService = require("../app/module/review/review.service");
const NotificationService = require("../app/module/notification/notification.service");

// trip socket =============================================================================================================================
// track active timeouts for trip cancellation
const tripTimeouts = new Map();

const validateUser = socketCatchAsync(async (socket, io, payload) => {
  if (!payload.userId) {
    emitError(
      socket,
      status.BAD_REQUEST,
      "userId is required to connect",
      "disconnect"
    );
    return null;
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    emitError(socket, status.NOT_FOUND, "User not found", "disconnect");
    return null;
  }

  return user;
});

const updateOnlineStatus = socketCatchAsync(async (socket, io, payload) => {
  const { isOnline } = payload;

  const updatedUser = await User.findByIdAndUpdate(
    payload.userId,
    { isOnline },
    { new: true }
  );

  // start the session if driver is online
  if (updatedUser.role === EnumUserRole.DRIVER && isOnline) {
    await OnlineSession.create({
      driver: updatedUser._id,
      start: new Date(),
    });
  }

  // if driver is offline end the session and calculate the online duration
  if (updatedUser.role === EnumUserRole.DRIVER && !isOnline) {
    const onlineSession = await OnlineSession.findOne({
      driver: updatedUser._id,
      end: { $exists: false },
      duration: { $exists: false },
    }).sort({ createdAt: -1 });

    const end = new Date();
    const duration = end - onlineSession.start;

    onlineSession.end = end;
    onlineSession.duration = duration;
    await onlineSession.save();

    console.log("Online duration:", onlineSession.duration / 1000, "seconds");
  }

  socket.emit(
    EnumSocketEvent.ONLINE_STATUS,
    emitResult({
      statusCode: status.OK,
      success: true,
      message: `You are ${updatedUser.isOnline ? "online" : "offline"}`,
      data: { isOnline: updatedUser.isOnline },
    })
  );
});

const requestTrip = socketCatchAsync(async (socket, io, payload) => {
  
  validateSocketFields(socket, payload, [
    "pickUpAddress",
    "pickUpLat",
    "pickUpLong",
    "dropOffAddress",
    "dropOffLat",
    "dropOffLong",
    "duration",
    "distance",

     //filed to recognised the trip type, ride or pre-book ride
  ]);

  if (payload.tripType === EnumTripType.PREBOOK){
    validateSocketFields(socket,payload, ["pickUpDate"])
  }


  if (new Date(payload.pickUpDate) < Date.now()){
    emitError(socket, status.BAD_REQUEST, "Pickup date must be in future");
  }

  const tripData = {
    user: payload.userId,
    pickUpAddress: payload.pickUpAddress,
    tripType: payload.tripType,
    pickUpDate: (payload.tripType === EnumTripType.PREBOOK? payload.pickUpDate: null),
    pickUpCoordinates: {
      coordinates: [Number(payload.pickUpLong), Number(payload.pickUpLat)],
    },
    dropOffAddress: payload.dropOffAddress,
    dropOffCoordinates: {
      coordinates: [Number(payload.dropOffLong), Number(payload.dropOffLat)],
    },
    duration: Math.ceil(Number(payload.duration)),
    distance: Math.ceil(Number(payload.distance)), // in meter
    estimatedFare: await fareCalculator(
      socket,
      payload.duration,
      payload.distance,
      payload.coupon
    ),
    isPeakHourApplied: await isPeakHour(),
    isCouponApplied: payload.coupon ? true : false,
    paymentType: payload.paymentType || "coin"
  };

  const trip = await Trip.create(tripData);
  await trip.populate([
    {
      path: "user",
      select: "name phoneNumber profile_image",
    },
  ]);

  socket.emit(
    EnumSocketEvent.TRIP_REQUESTED,
    emitResult({
      statusCode: status.OK,
      success: true,
      message: "Trip requested successfully",
      data: trip,
    })
  );

  postNotification(
    "Trip Requested",
    "Your trip request is sent. Waiting for driver acceptance.",
    trip.user._id
  );

  const availableDrivers = await User.find({
    role: EnumUserRole.DRIVER,
    isOnline: true,
    isAvailable:true
  }).lean();


  const driverIds = availableDrivers.map((driver) => driver._id.toString());

  driverIds.forEach((driverId) => {
    const driverSocket = payload.activeDrivers.get(driverId);


    if (driverSocket) {
      driverSocket.emit(
        EnumSocketEvent.TRIP_AVAILABLE,
        emitResult({
          statusCode: status.OK,
          success: true,
          message: "Trip available",
          data: trip,
        })
      );

      

  postNotification(
    "Trip Available",
    "A trip is available for you, grab it now!",
   driverId
  );
    }
  });

  // timeout handler with transaction support
  const timeoutHandler = async () => {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const currentTrip = await Trip.findById(trip._id)
          .session(session)
          .select("status")
          .lean();

        if (!currentTrip || currentTrip.status !== TripStatus.REQUESTED) return;

        await Trip.updateOne(
          { _id: trip._id },
          {
            status: TripStatus.CANCELLED,
            cancellationReason: ["No driver available"],
          }
        ).session(session);

        socket.emit(
          EnumSocketEvent.TRIP_NO_DRIVER_FOUND,
          emitResult({
            statusCode: status.OK,
            success: true,
            message: "No driver available. Please try again later.",
            data: { tripId: trip._id },
          })
        );

        postNotification(
          "Trip Cancelled",
          "No driver available for your trip request",
          trip.user
        );
      });
    } catch (error) {
      console.log(error);
    } finally {
      session.endSession();
      tripTimeouts.delete(trip._id.toString());
    }
  };

  const timeoutRef = setTimeout(timeoutHandler, 1000 * 60 * 0.5); // 30 seconds
  tripTimeouts.set(trip._id.toString(), timeoutRef);
});

const acceptTrip = socketCatchAsync(async (socket, io, payload) => {
  validateSocketFields(socket, payload, ["tripId", "userId", "lat", "long"]);

  const { tripId, userId: driverId } = payload;

  console.log(`tripId: ${tripId} , userId: ${driverId}`)

  const session = await mongoose.startSession();

  try {
    

    const result = await session.withTransaction(async () => {
      
      const trip = await Trip.findOne({ _id: tripId,status: TripStatus.REQUESTED }).session(session);
      // If no document was modified another driver already accepted
      if (!trip)
        emitError(socket, status.CONFLICT, "Trip no longer available");

      let newTripStatus = TripStatus.ACCEPTED
      if (trip.tripType === EnumTripType.PREBOOK){
          newTripStatus = TripStatus.SCHEDULED
      }
      // 1️⃣ Atomically try to grab & update the trip
      const updatedTrip = await Trip.findOneAndUpdate(
        { _id: tripId, status: TripStatus.REQUESTED }, // only accept if still REQUESTED
        {
          $set: {
            driverTripAcceptedAt: Date.now(),
            status: newTripStatus,
            driver: driverId,
            driverCoordinates: {
              coordinates: [Number(payload.lat), Number(payload.long)],
            },
          },
          $inc: {
            __V: 1,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      ).lean();

      
      

      // 2️⃣ Deep-populate in a second query (required for nested paths)
      const acceptedTrip = await Trip.findById(updatedTrip._id)
        .populate([
          { path: "user" },
          { path: "driver", populate: { path: "assignedCar" } },
        ])
        .session(session)
        .lean();

      const driver = await User.findByIdAndUpdate(
        driverId,
        { $set: { isAvailable: newTripStatus === TripStatus.SCHEDULED } },
        { new: true, session }
      );
      if (!driver) emitError(socket, status.NOT_FOUND, "Driver not found");

      const driverRating = await ReviewService.getDriverRating({driverId: driverId});
      

      
      acceptedTrip.driver.rating = driverRating.averageRating;

      return acceptedTrip
    });


    if (result) {
      const timeoutRef = tripTimeouts.get(result._id.toString());

      if (timeoutRef) {
        clearTimeout(timeoutRef);
        tripTimeouts.delete(result._id.toString());
      }

      

      io.to(result.user._id.toString()).emit(
        EnumSocketEvent.TRIP_ACCEPTED,
        emitResult({
          statusCode: status.OK,
          success: true,
          message: `${result.driver.name} has accepted your trip`,
          data: result,
        })
      );

      socket.emit(
        EnumSocketEvent.TRIP_ACCEPTED,
        emitResult({
          statusCode: status.OK,
          success: true,
          message: `You have accepted a trip from ${result.user.name}`,
          data: result,
        })
      );

      postNotification(
        "Trip Accepted",
        `Driver ${result.driver.name} has accepted your trip`,
        result.user._id
      );
      // postNotification(
      //   "Trip Accepted",
      //   `You have accepted a trip from ${result.user.name}`,
      //   result.driver._id
      // );
    }
  } catch (error) {
    console.log(error);
  } finally {
    session.endSession();
  }
});

const updateDriverLocation = socketCatchAsync(async (socket, io, payload) => {
  validateSocketFields(socket, payload, ["tripId", "lat", "long"]);

  const { tripId, lat, long } = payload;

  const updatedTrip = await Trip.findByIdAndUpdate(
    tripId,
    {
      driverCoordinates: {
        coordinates: [Number(long), Number(lat)],
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedTrip) emitError(socket, status.NOT_FOUND, "Trip not found");

  await User.findByIdAndUpdate(
    updatedTrip.driver,
    {
      locationCoordinates: {
        coordinates: [Number(long), Number(lat)],
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  // Broadcast to user (consider throttling in production)
  io.to(updatedTrip.user.toString()).emit(
    EnumSocketEvent.TRIP_DRIVER_LOCATION_UPDATE,
    emitResult({
      statusCode: status.OK,
      success: true,
      message: "Driver location updated",
      data: updatedTrip.driverCoordinates,
    })
  );

  // Broadcast to driver (consider throttling in production)
  io.to(updatedTrip.driver.toString()).emit(
    EnumSocketEvent.TRIP_DRIVER_LOCATION_UPDATE,
    emitResult({
      statusCode: status.OK,
      success: true,
      message: "Your location updated",
      data: updatedTrip.driverCoordinates,
    })
  );
});

const updateTripStatus = socketCatchAsync(async (socket, io, payload) => {
  /**
   * Updates the status of a trip and handles associated logic based on the new status.
   *
   * @param {Object} socket - The socket connection object
   * @param {Object} io - The Socket.IO server instance
   * @param {Object} payload - The payload containing trip update information
   * @param {string} payload.tripId - The ID of the trip to update
   * @param {string} payload.newStatus - The new status to set for the trip
   * @param {number} [payload.duration] - Trip duration (required for COMPLETED status)
   * @param {number} [payload.distance] - Trip distance (required for COMPLETED status)
   * @param {string} [payload.reason] - Cancellation reason (required for CANCELLED status)
   * @param {Map} [payload.activeDrivers] - Map of active drivers and their socket connections
   *
   * @throws {SocketError} When required fields are missing or status is invalid
   *
   * @description
   * Handles various trip status updates including:
   * - Driver arrival
   * - Trip start
   * - Trip completion
   * - Trip cancellation
   * Calculates extra charges for late cancellations and driver waiting time and toll fees.
   * Updates driver availability after trip completion or cancellation
   * Manages MongoDB transactions for data consistency
   * Sends notifications for status changes
   *
   * @async
   * @function updateTripStatus
   */

  const {
    userId,
    tripId,
    newStatus,
    duration,
    distance,
    reason,
    activeDrivers,
  } = payload || {};

  validateSocketFields(socket, payload, ["tripId", "newStatus"]);
  validateTripStatusPayload(newStatus, payload, socket);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();

      const [trip, user] = await Promise.all([
        Trip.findById(tripId).session(session),
        User.findById(userId).session(session),
      ]);

      if (!trip) return emitError(socket, status.NOT_FOUND, "Trip not found");

      const tripUser = await User.findById(trip.user).lean().session(session);

      // prevent duplicate status updates to ensure accurate extra charge calculations
      const duplicateStatusChecks = {
        [TripStatus.CANCELLED]: "Trip already cancelled",
        [TripStatus.PICKED_UP]: "Trip already picked up",
        [TripStatus.NO_SHOW]: "User already marked as no show",
        [TripStatus.DESTINATION_REACHED]: "Trip already reached destination",
        [TripStatus.COMPLETED]: "Trip already completed",
      };

      if (trip.status === newStatus && duplicateStatusChecks[newStatus]) {
        return emitError(
          socket,
          status.BAD_REQUEST,
          duplicateStatusChecks[newStatus]
        );
      }

      let extraCharge = 0;

      // Calculate late cancellation fee if trip is cancelled by user (between ON_THE_WAY and CANCELLED status)
      if (
        user.role === EnumUserRole.USER &&
        newStatus === TripStatus.CANCELLED &&
        trip.driverTripAcceptedAt &&
        trip.status === TripStatus.ON_THE_WAY
      ) {
        extraCharge = calculateExtraCharge(
          EnumTripExtraChargeType.LATE_CANCELLATION,
          trip.driverTripAcceptedAt
        );
      }

      // Calculate waiting fee if driver has been waiting at pickup location (between ARRIVED and PICKED_UP status)
      if (
        user.role === EnumUserRole.DRIVER &&
        newStatus === TripStatus.PICKED_UP &&
        trip.driverArrivedAt &&
        trip.status === TripStatus.ARRIVED
      ) {
        extraCharge = calculateExtraCharge(
          EnumTripExtraChargeType.DRIVER_WAITING,
          trip.driverArrivedAt
        );
      }

      // Calculate no show fee if user is a no show (between ARRIVED and PICKED_UP status)
      if (
        user.role === EnumUserRole.DRIVER &&
        newStatus === TripStatus.NO_SHOW &&
        trip.driverArrivedAt &&
        trip.status === TripStatus.ARRIVED
      ) {
        extraCharge = calculateExtraCharge(
          EnumTripExtraChargeType.NO_SHOW,
          trip.driverArrivedAt
        );
      }

      // Cash payment users - carry forward extra charges for late cancellation fee and driver waiting fee to next ride
      const shouldApplyExtraCharge =
        extraCharge > 0 &&
        (newStatus === TripStatus.CANCELLED ||
          newStatus === TripStatus.NO_SHOW);

      // Handle extra charges for cash payment users
      if (shouldApplyExtraCharge && user.role === EnumUserRole.USER) {
        await User.findByIdAndUpdate(
          trip.user,
          {
            $inc: { outstandingFee: extraCharge },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );
      }

      // initiate trip update data
      const tripUpdateData = {
        status: newStatus,
        ...(newStatus === TripStatus.ARRIVED && { driverArrivedAt: now }),
        ...(newStatus === TripStatus.PICKED_UP && { extraCharge }),
        ...(newStatus === TripStatus.STARTED && { tripStartedAt: now }),
        ...(newStatus === TripStatus.NO_SHOW && { extraCharge }),
        ...(newStatus === TripStatus.CANCELLED && {
          cancellationReason: reason,
          extraCharge,
        }),
        ...(newStatus === TripStatus.DESTINATION_REACHED && {
          duration,
          distance,
          finalFare:
            (await fareCalculator(socket, duration, distance)) +
            trip.tollFee +
            trip.extraCharge +
            tripUser.outstandingFee,
        }),
        ...(newStatus === TripStatus.COMPLETED && {
          tripCompletedAt: now,
        }),
      };

      await Trip.findByIdAndUpdate(tripId, tripUpdateData, {
        new: true,
        runValidators: true,
        session,
      }).lean();

      const updatedTrip = await Trip.findById(tripId)
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
        .session(session)
        .lean();

      // Clear outstanding fee AFTER a user completes a trip successfully
      if (
        newStatus === TripStatus.COMPLETED &&
        user.role === EnumUserRole.DRIVER
      ) {
        await User.findByIdAndUpdate(
          trip.user,
          {
            $set: { outstandingFee: 0 },
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        );
      }

      handleStatusNotifications(io, updatedTrip, newStatus);

      // Update driver availability after trip completion and cancellation
      if (
        [
          TripStatus.COMPLETED,
          TripStatus.CANCELLED,
          TripStatus.NO_SHOW,
        ].includes(newStatus)
      ) {
        
        await updateDriverAvailability(
          updatedTrip,
          socket,
          activeDrivers,
          session
        );
      }
    });
  } catch (error) {
    console.log(error);
  } finally {
    session.endSession();
  }
});

// chat socket =============================================================================================================================

const sendMessage = socketCatchAsync(async (socket, io, payload) => {
  try {
    const { userId, receiverId, chatId, message } = payload;

    validateFields(payload, ["receiverId", "chatId", "message"]);

    const existingChat = await Chat.findOne({
      _id: chatId,
      participants: { $all: [userId, receiverId] },
    });

    if (!existingChat) emitError(socket, status.NOT_FOUND, "Chat not found");

    const newMessage = await Message.create({
      sender: userId,
      receiver: receiverId,
      message,
    });

    // notify both user and driver upon new message
    // postNotification("New message", message, receiverId);
    await NotificationService.sendNotificationByUserId(receiverId, "New message", message, {chatId})
    //Disable notification for sender
    // postNotification("New message", message, userId);

    Promise.all([
      Chat.updateOne({ _id: chatId }, { $push: { messages: newMessage._id } }),
    ]);

    // Broadcast to user
    io.to(userId).emit(
      EnumSocketEvent.SEND_MESSAGE,
      emitResult({
        statusCode: status.OK,
        success: true,
        message: "Message sent successfully",
        data: {
          chatId,
          ...newMessage.toObject(),
        },
      })
    );

    // Broadcast to driver
    io.to(receiverId).emit(
      EnumSocketEvent.SEND_MESSAGE,
      emitResult({
        statusCode: status.OK,
        success: true,
        message: "Message sent successfully",
        data: {
          chatId,
          ...newMessage.toObject(),
        },
      })
    );

    return newMessage;
  } catch (error) {
    console.log(error);
  }
});

// utility functions =============================================================================================================================

const handleStatusNotifications = async (io, trip, newStatus) => {
  const eventName = EnumSocketEvent.TRIP_UPDATE_STATUS;
  const messageMap = {
    [TripStatus.ON_THE_WAY]: {
      rider: "Your driver is on the way",
      driver: "You are on the way to the rider",
    },
    [TripStatus.ARRIVED]: {
      rider: "Your driver has arrived",
      driver: "You have arrived at the pickup location",
    },
    [TripStatus.PICKED_UP]: {
      rider: "You've been picked up",
      driver: "You have picked up the rider",
    },
    [TripStatus.STARTED]: {
      rider: "Your trip has started",
      driver: "The trip has started",
    },
    [TripStatus.DESTINATION_REACHED]: {
      rider: "You have reached the destination",
      driver: "The rider has reached the destination",
    },
    [TripStatus.COMPLETED]: {
      rider: "Your trip has been completed successfully",
      driver: "You have successfully completed the trip",
    },
    [TripStatus.CANCELLED]: {
      rider: "Your trip has been cancelled",
      driver: "The trip has been cancelled",
    },
    [TripStatus.NO_SHOW]: {
      rider: "You are marked as no show. You will be charged a fee",
      driver: "The user is marked as no show",
    },
  };

  if (trip.driver){
    const driverRating = await ReviewService.getDriverRating({driverId:trip.driver._id})
    trip.driver.rating = driverRating.averageRating
  }

 

  // Notify user
  io.to(trip.user._id.toString()).emit(
    eventName,
    emitResult({
      statusCode: status.OK,
      success: true,
      message: messageMap[newStatus].rider,
      data: trip,
    })
  );
  
  if (newStatus === TripStatus.COMPLETED || newStatus === TripStatus.CANCELLED || newStatus === TripStatus.ACCEPTED)
      postNotification(`Trip update`, messageMap[newStatus].rider, trip.user);

  // Notify driver if any
  if (trip.driver) {
    io.to(trip.driver._id.toString()).emit(
      eventName,
      emitResult({
        statusCode: status.OK,
        success: true,
        message: messageMap[newStatus].driver,
        data: trip,
      })
    );

    postNotification(`Trip update`, messageMap[newStatus].driver, trip.driver);
  }
};

const removeStaleOnlineSessions = async () => {
  try {
    console.log("hit every hour", new Date().toLocaleString());

    const result = await OnlineSession.deleteMany({
      duration: { $exists: false },
    });

    if (result.deletedCount > 0)
      logger.info(
        `Removed ${result.deletedCount} OnlineSessions without a duration`,
        new Date().toLocaleString()
      );
  } catch (error) {
    logger.error("⌚ Error removing OnlineSessions", error);
  }
};

const calculateExtraCharge = (type, referenceTime) => {
  /**
   * Calculates extra charges based on elapsed time and charge type
   * @param {string} type - The type of extra charge (LATE_CANCELLATION, DRIVER_WAITING, or NO_SHOW)
   * @param {string|Date} referenceTime - The reference time to calculate elapsed minutes from
   * @returns {number} The calculated extra charge amount in currency units
   *
   * @description
   * - For LATE_CANCELLATION or DRIVER_WAITING:
   *   - 10 currency units if waited 10+ minutes
   *   - 5 currency units if waited 5-9 minutes
   *   - No charge if waited less than 5 minutes
   * - For NO_SHOW:
   *   - 10 currency units if waited 5+ minutes
   *   - No charge if waited less than 5 minutes
   */
  const minutesElapsed = (Date.now() - new Date(referenceTime)) / 60000;
  let extraCharge = 0;

  if (
    type === EnumTripExtraChargeType.LATE_CANCELLATION ||
    type === EnumTripExtraChargeType.DRIVER_WAITING
  ) {
    if (minutesElapsed >= 10) extraCharge = 10;
    else if (minutesElapsed >= 5) extraCharge = 5;
  } else if (type === EnumTripExtraChargeType.NO_SHOW) {
    if (minutesElapsed >= 5) extraCharge = 10;
  }

  return extraCharge;
};

const validateTripStatusPayload = (status, payload, socket) => {
  const allowedNewStatus = [
    TripStatus.ON_THE_WAY,
    TripStatus.ARRIVED,
    TripStatus.PICKED_UP,
    TripStatus.STARTED,
    TripStatus.DESTINATION_REACHED,
    TripStatus.COMPLETED,
    TripStatus.CANCELLED,
    TripStatus.NO_SHOW,
  ];

  if (!allowedNewStatus.includes(status))
    emitError(
      socket,
      status.BAD_REQUEST,
      `Invalid status. Valid status are ${allowedNewStatus.join(", ")}`
    );

  if (status === TripStatus.DESTINATION_REACHED)
    validateSocketFields(socket, payload, ["duration", "distance"]);

  if (status === TripStatus.CANCELLED)
    validateSocketFields(socket, payload, ["reason"]);
};

const updateDriverAvailability = async (
  trip,
  socket,
  activeDrivers,
  session
) => {
  console.log(trip)
  if (trip.driver){
    
  await User.findByIdAndUpdate(
    trip.driver,
    {
      isAvailable: true,
    },
    {
      new: true,
      runValidators: true,
      session,
    }
  );

  activeDrivers.set(trip.driver.toString(), socket);
  }
};

// Schedule a cron job to run every Sunday at midnight for removing OnlineSessions without a duration field
cron.schedule("0 0 * * 0", removeStaleOnlineSessions);

const SocketController = {
  validateUser,
  updateOnlineStatus,
  requestTrip,
  acceptTrip,
  updateDriverLocation,
  updateTripStatus,
  sendMessage,
};

module.exports = SocketController;
