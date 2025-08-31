const { errorLogger, logger } = require("./util/logger");
const connectDB = require("./connection/connectDB");
const config = require("./config");
const mainServer = require("./connection/socket");
const jobScheduler = require("./app/module/agenda/init");

async function main() {
  try {
    await connectDB();
    logger.info(`DB Connected Successfully at ${new Date().toLocaleString()}`);
    jobScheduler.start();

    // general
    // mainServer.listen(Number(config.port), config.base_url, () => {
    //   logger.info(`App listening on http://${config.base_url}:${config.port}`);
    // });

    // port forwarded
    mainServer.listen(Number(config.port), () => {
      logger.info(`App listening on http://localhost:${config.port}`);
    });

    process.on("unhandledRejection", (error) => {
      errorLogger.error("Unhandled Rejection:", error);
    });

    process.on("uncaughtException", (error) => {
      errorLogger.error("Uncaught Exception:", error);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        logger.info("SIGINT received. Shutting down gracefully...");
        jobScheduler.stop();
        await mainServer.close();
        logger.info("Server closed");
        await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for 3 seconds
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
