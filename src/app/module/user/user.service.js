const { status } = require("http-status");

const ApiError = require("../../../error/ApiError");
const User = require("./User");
const Auth = require("../auth/Auth");
const unlinkFile = require("../../../util/unlinkFile");
const deleteFalsyField = require("../../../util/deleteFalsyField");
const { EnumUserRole } = require("../../../util/enum");
const Trip = require("../trip/Trip");

const updateProfile = async (req) => {
  const { files, body: data } = req;
  const { userId, authId } = req.user;
  const updateData = { ...data };

  deleteFalsyField(data);
  const existingUser = await User.findById(userId).lean();

  if (files && files.profile_image) {
    if (existingUser.profile_image) unlinkFile(existingUser.profile_image);
    updateData.profile_image = files.profile_image[0].path;
  }

  if (files && files.id_or_passport_image) {
    if (existingUser.id_or_passport_image)
      unlinkFile(existingUser.id_or_passport_image);
    updateData.id_or_passport_image = files.id_or_passport_image[0].path;
  }

  const [auth, user] = await Promise.all([
    Auth.findByIdAndUpdate(
      authId,
      { name: updateData.name },
      {
        new: true,
      }
    ),
    User.findByIdAndUpdate(
      userId,
      { ...updateData },
      {
        new: true,
      }
    ).populate("authId"),
  ]);

  if (!auth || !user) throw new ApiError(status.NOT_FOUND, "User not found!");

  return user;
};

const getProfile = async (userData) => {
  const { userId, authId } = userData;

  const [auth, result] = await Promise.all([
    Auth.findById(authId).lean(),
    User.findById(userId).populate("authId assignedCar").lean(),
  ]);

  if (!result || !auth) throw new ApiError(status.NOT_FOUND, "User not found");
  if (auth.isBlocked)
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");

  return result;
};

const deleteMyAccount = async (payload) => {
  const { email, password } = payload;

  const isUserExist = await Auth.isAuthExist(email);
  if (!isUserExist) throw new ApiError(status.NOT_FOUND, "User does not exist");
  if (
    isUserExist.password &&
    !(await Auth.isPasswordMatched(password, isUserExist.password))
  ) {
    throw new ApiError(status.FORBIDDEN, "Password is incorrect");
  }

  Promise.all([
    Auth.deleteOne({ email }),
    User.deleteOne({ authId: isUserExist._id }),
  ]);
};

const getDriverStats = async (userId)=>{
  const driver = await User.find({_id:userId})
  if(!driver){
    throw new ApiError(status.NOT_FOUND, "Driver not found")
  }

 const trip = await Trip.aggregate([{$match:{_id:userId}}]).exec()

 return trip
  
}



const UserService = {
  getProfile,
  deleteMyAccount,
  updateProfile,
  getDriverStats,
};

module.exports = { UserService };
