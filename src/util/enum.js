// user enums

const EnumUserRole = {
  USER: "USER",
  DRIVER: "DRIVER",
  ADMIN: "ADMIN",
};

const LoginProvider = {
  LOCAL: "local",
  GOOGLE: "google",
  APPLE: "apple",
};

const UserAccountStatus = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
};

// payment enums

const EnumPaymentType = {
  CASH: "cash",
  COIN: "coin",
  ONLINE:"online"
};

const EnumPaymentStatus = {
  SUCCEEDED: "succeeded",
  UNPAID: "unpaid",
  VERIFIED:"verified"
};

const EnumPaymentFor = {
  TRIP: "trip",
  COIN_PURCHASE: "coin_purchase",
};

// socket enums

const EnumSocketEvent = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  SOCKET_ERROR: "socket_error",
  ONLINE_STATUS: "online_status",

  TRIP_AVAILABLE: "trip_available",
  TRIP_NO_DRIVER_FOUND: "trip_no_driver_found",
  TRIP_DRIVER_LOCATION_UPDATE: "trip_driver_location_update",
  TRIP_REQUESTED: "trip_requested",
  TRIP_ACCEPTED: "trip_accepted",
  TRIP_UPDATE_STATUS: "trip_update_status",

  START_CHAT: "start_chat",
  SEND_MESSAGE: "send_message",
};

// trip enums

const TripStatus = {
  REQUESTED: "requested",
  ACCEPTED: "accepted",
  ON_THE_WAY: "on_the_way",
  ARRIVED: "arrived",
  PICKED_UP: "picked_up",
  STARTED: "started",
  DESTINATION_REACHED: "destination_reached",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

const EnumTripExtraChargeType = {
  LATE_CANCELLATION: "late_cancellation",
  DRIVER_WAITING: "driver_waiting",
  NO_SHOW: "no_show",
};

const EnumTripType = {
  RIDE: "ride",
  PREBOOK: "pre_book",
};

module.exports = {
  EnumUserRole,
  EnumPaymentType,
  EnumPaymentStatus,
  EnumPaymentFor,
  EnumSocketEvent,
  LoginProvider,
  TripStatus,
  EnumTripExtraChargeType,
  UserAccountStatus,
  EnumTripType,
};
