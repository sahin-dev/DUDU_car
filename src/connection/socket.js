
const { Server } = require("socket.io");

const app = require("../app");
const socketHandlers = require("../socket/socketHandlers");
const socketCors = require("./socketCors");
const { EnumSocketEvent } = require("../util/enum");


let io;


const initSocketServer = (server) => {
  
io = new Server(server, {
  cors: socketCors,
});


const activeDrivers = new Map();

io.on(EnumSocketEvent.CONNECTION, (socket) => {
  socketHandlers(socket, io, activeDrivers);
});
}


const getIoServer = ()=> {
  return io
}



module.exports = {initSocketServer, getIoServer};
