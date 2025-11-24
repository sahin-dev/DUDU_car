const { errorLogger, logger } = require("./util/logger");
const connectDB = require("./connection/connectDB");
const config = require("./config");

const jobScheduler = require("./app/module/agenda/init");
const https = require("https");
const http = require("http")
const app = require("./app");
const {initSocketServer} = require("./connection/socket");
const fs = require("fs")

let io = undefined

const options = {
  key: fs.readFileSync("./cert/key.pem"),
  cert: fs.readFileSync("./cert/cert.pem"),
};
async function main() {
  try {
    await connectDB();
    logger.info(`DB Connected Successfully at ${new Date().toLocaleString()}`);
    await jobScheduler.start();

    // general
    // mainServer.listen(Number(config.port), config.base_url, () => {
    //   logger.info(`App listening on http://${config.base_url}:${config.port}`);
    // });
  const mainHttpsServer = https.createServer(options, app);
  const httpServer = http.createServer(app)

  initSocketServer(httpServer)

    // port forwarded
    httpServer.listen(Number(config.port), () => {
      logger.info(`App listening on http://localhost:${config.port}`);

    });
    mainHttpsServer.listen(8001, () => {
      logger.info(`https server listening on https//localhost:8001`)
    })

  


    process.on("unhandledRejection", (error) => {
      errorLogger.error("Unhandled Rejection:", error);
    });

    process.on("uncaughtException", (error) => {
      errorLogger.error("Uncaught Exception:", error);
    });

    process.on("SIGTERM", () => {
      jobScheduler.stop();
      logger.info("SIGTERM received");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        logger.info("SIGINT received. Shutting down gracefully...");
        jobScheduler.stop();
        
        process.exit(0);
      } catch (err) {
        errorLogger.error("Error during shutdown:", err);
        process.exit(1);
      }
    });

    process
  } catch (err) {
    errorLogger.error("Main Function Error:", err);
  }
}

main();

