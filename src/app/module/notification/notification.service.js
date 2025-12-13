const { default: status } = require("http-status");
const QueryBuilder = require("../../../builder/queryBuilder");
const ApiError = require("../../../error/ApiError");
const validateFields = require("../../../util/validateFields");
const Notification = require("./Notification");
const { EnumUserRole } = require("../../../util/enum");
const AdminNotification = require("./AdminNotification");
const firebaseClient = require("./firebase-admin")
const User = require('../user/User');
const Message = require("../chat/Message");


const sendNotificationByUserId = async (userId, payload,data)=>{
  const user = await User.findById(userId)
  
  if(!user){
    throw new ApiError(status.NOT_FOUND, "User does not exist")
  }


  validateFields(payload, ["title", "message"])

  if(user.token){
    console.log(user.token)
    console.log("notification send: ", user._id)
    await sendNotification(user.token, payload, data)
  }
}

//This service only for test the notification
const sendNotification = async (token,payload, data)=>{
  const {title = "Test Notification", message = "This is a test notification"} = payload
 
  try{

    if(!token){
      throw new ApiError(status.BAD_REQUEST, "token must not be empty")
    }
    if(data){
      return  await firebaseClient.messaging().send({notification:{title,body:message}, 
      android: {
        notification: {
          sound: "dudu_car_notification"
        },
     apns: {
        payload: {
          aps: {
            sound: "DUDU-Car-App-Notification-Sound.caf",
          },
        },
      }
    }, data:{chatId:data.chatId.toString()}, token})
    }
      
    return await firebaseClient.messaging().send({notification:{title,body:message},
      android: {
        notification: {
          sound: "dudu_car_notification"
        }
    },
     apns: {
        payload: {
          aps: {
            sound: "DUDU-Car-App-Notification-Sound.caf",
          },
        },
      }
      , token})
    
  }catch(err){
    console.log(err)
    console.log("firebase: message sending failed!")
  }
  
}

const getNotification = async (userData, query) => {
  const { role } = userData;
  const Model = role === EnumUserRole.ADMIN ? AdminNotification : Notification;

  if (role !== EnumUserRole.ADMIN) validateFields(query, ["notificationId"]);

  const queryObj =
    role === EnumUserRole.ADMIN ? {} : { _id: query.notificationId };

  const notification = await Model.findOne(queryObj).lean();

  if (!notification)
    throw new ApiError(status.NOT_FOUND, "Notification not found");

  return notification;
};

/**
 * Retrieves notifications based on the user's role.
 *
 * - If the user is an **admin**, it fetches all notifications from `AdminNotification`.
 * - If the user is a **regular user**, it fetches only notifications relevant to them from `Notification`.
 */
const getAllNotifications = async (userData, query) => {
  const { role } = userData;
  const Model = role === EnumUserRole.ADMIN ? AdminNotification : Notification;
  const queryObj = role === EnumUserRole.ADMIN ? {} : { toId: userData.userId };

  const notificationQuery = new QueryBuilder(Model.find(queryObj).lean(), query)
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [notification, meta] = await Promise.all([
    notificationQuery.modelQuery,
    notificationQuery.countTotal(),
  ]);

  return {
    meta,
    notification,
  };
};

const updateAsReadUnread = async (userData, payload) => {
  const { role } = userData;
  const Model = role === EnumUserRole.ADMIN ? AdminNotification : Notification;
  const queryObj = role === EnumUserRole.ADMIN ? {} : { toId: userData.userId };
  queryObj.isRead = !payload.isRead;

  const result = await Model.updateMany(queryObj, {
    $set: { isRead: payload.isRead },
  });

  if (!result.modifiedCount)
    throw new ApiError(status.BAD_REQUEST, "Already updated");

  return result;
};

const deleteNotification = async (userData, payload) => {
  validateFields(payload, ["notificationId"]);

  const Model =
    userData.role === EnumUserRole.ADMIN ? AdminNotification : Notification;

  const notification = await Model.deleteOne({
    _id: payload.notificationId,
  });

  if (!notification.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Notification not found");

  return notification;
};

const NotificationService = {
  getNotification,
  getAllNotifications,
  updateAsReadUnread,
  deleteNotification,
  sendNotification,
  sendNotificationByUserId
};

module.exports = NotificationService;
