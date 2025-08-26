const express = require("express");
const router = express.Router();
const AuthRoutes = require("../module/auth/auth.routes");
const AdminRoutes = require("../module/admin/admin.routes");
const UserRoutes = require("../module/user/user.routes");
const DashboardRoutes = require("../module/dashboard/dashboard.routes");
const ManageRoutes = require("../module/manage/manage.routes");
const NotificationRoutes = require("../module/notification/notification.routes");
const FeedbackRoutes = require("../module/feedback/feedback.routes");
const ReviewRoutes = require("../module/review/review.routes");
const CarRoutes = require("../module/car/car.routes");
const DCoinRoutes = require("../module/dcoin/dcoin.routes");
const TripRoutes = require("../module/trip/trip.routes");
const SavedLocationRoutes = require("../module/savedLocation/savedLocation.routes");
const ChatRoutes = require("../module/chat/chat.routes");
const PaymentRoutes = require("../module/payment/payment.routes");
const CouponRoutes = require("../module/coupon/coupon.routes");
const { contactRoutes } = require("../module/Contact/contact.route");

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/user",
    route: UserRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/dashboard",
    route: DashboardRoutes,
  },
  {
    path: "/manage",
    route: ManageRoutes,
  },
  {
    path: "/notification",
    route: NotificationRoutes,
  },
  {
    path: "/feedback",
    route: FeedbackRoutes,
  },
  {
    path: "/review",
    route: ReviewRoutes,
  },
  {
    path: "/car",
    route: CarRoutes,
  },
  {
    path: "/dcoin",
    route: DCoinRoutes,
  },
  {
    path: "/trip",
    route: TripRoutes,
  },
  {
    path: "/saved-location",
    route: SavedLocationRoutes,
  },
  {
    path: "/chat",
    route: ChatRoutes,
  },
  {
    path: "/payment",
    route: PaymentRoutes,
  },
  {
    path: "/coupon",
    route: CouponRoutes,
  },
  {
    path:"/contact",
    route:contactRoutes
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

module.exports = router;
