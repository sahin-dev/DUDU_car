const { EnumSocketEvent, EnumUserRole } = require("../util/enum");
const postNotification = require("../util/postNotification");
const socketCatchAsync = require("../util/socketCatchAsync");
const SocketController = require("./socket.controller");

const socketHandlers = socketCatchAsync(async (socket, io, activeDrivers) => {
  console.log("Trying to connect");

  const userId = socket.handshake.query.userId;

  const user = await SocketController.validateUser(socket, io, { userId });
  if (!user) return;

  socket.join(userId);

  console.log(userId, "connected");

  await SocketController.updateOnlineStatus(socket, io, {
    userId,
    isOnline: true,
  });

  if (user.role === EnumUserRole.DRIVER) {
    activeDrivers.set(userId, socket);
  }

  console.log("connected activeDrivers:", activeDrivers.size);

  socket.on(EnumSocketEvent.TRIP_REQUESTED, (payload) => {
    
    SocketController.requestTrip(socket, io, {
      ...payload,
      userId,
      activeDrivers,
    });
  });

  socket.on(EnumSocketEvent.TRIP_ACCEPTED, (payload) => {
    SocketController.acceptTrip(socket, io, { ...payload, userId });
  });

  socket.on(EnumSocketEvent.TRIP_DRIVER_LOCATION_UPDATE, (payload) => {
    SocketController.updateDriverLocation(socket, io, { ...payload });
  });

  socket.on(EnumSocketEvent.TRIP_UPDATE_STATUS, (payload) => {
    SocketController.updateTripStatus(socket, io, {
      ...payload,
      userId,
      activeDrivers,
    });
  });

  socket.on(EnumSocketEvent.SEND_MESSAGE, async (payload) => {
    SocketController.sendMessage(socket, io, { ...payload, userId });
  });

  socket.on(EnumSocketEvent.DISCONNECT, () => {
    SocketController.updateOnlineStatus(socket, io, {
      userId,
      isOnline: false,
    });

    activeDrivers.delete(userId);

    console.log("disconnected activeDrivers:", activeDrivers.size);
    console.log(userId, "disconnected");
  });
});

module.exports = socketHandlers;
