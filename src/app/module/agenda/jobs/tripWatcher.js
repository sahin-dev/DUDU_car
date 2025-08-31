const { TripStatus, EnumTripType } = require("../../../../util/enum");
const Trip = require("../../trip/Trip");
const NotificationService = require("../../notification/notification.service");

const tripWatcher = async () => {
    
    const trips = await Trip.find({
        status:TripStatus.ACCEPTED, tripType:EnumTripType.PREBOOK
    })

    console.log("Prebook trips to watch: ", trips.length);

   trips.forEach(trip => {
    const now = new Date();
    const diff = (new Date(trip.pickUpDate).getTime() - now.getTime()) / 60000; // difference in minutes

    if (diff <= 15) {

        try{
            NotificationService.sendNotificationByUserId(
                trip.user._id,
                {
                    title: "Trip Reminder",
                    message: `Your prebooked trip is scheduled to start at ${new Date(trip.pickUpDate).toLocaleString()}. Please be ready.`,
                }
            );

            NotificationService.sendNotificationByUserId(
                trip.driver._id,
                {
                    title: "Trip Reminder",
                    message: `You have a prebooked trip scheduled to start at ${new Date(trip.pickUpDate).toLocaleString()}. Please be ready.`,
                }
            );
        }catch(err){
            console.log("Error sending notification for prebook trip: ", err.message);
        }
        
    }

   })

}

module.exports = tripWatcher;