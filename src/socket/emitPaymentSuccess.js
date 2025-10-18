const NotificationService = require('../app/module/notification/notification.service');
const { getIoServer } = require('../connection/socket');
const emitResult = require('./emitResult');
const status = require('http-status');



const emitPaymentSuccess = async (trip, payment) => {
    const io = getIoServer()

    io.to(trip.driver.toString()).emit(`payment_received`, emitResult({
        statusCode: status.OK,
        success: true,
        message: 'Payment successfully received',
        data: {
        trip,
        payment
        }
  }));

  await NotificationService.sendNotificationByUserId(trip.driver, {title:"Payment received", message:"Payment successfully received"})

  io.to(trip.user.toString()).emit(`payment_paid`, emitResult({
        statusCode: status.OK,
        success: true,
        message: 'Payment successfully paid',
        data: {
        trip,
        payment
        }
  }));

  await NotificationService.sendNotificationByUserId(trip.user, {title:"Payment paid", message:"Payment successfully paid"})
};

module.exports = emitPaymentSuccess;