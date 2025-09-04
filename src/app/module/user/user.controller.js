const { UserService } = require("./user.service");
const sendResponse = require("../../../util/sendResponse");
const catchAsync = require("../../../util/catchAsync");

const updateProfile = catchAsync(async (req, res) => {
  const result = await UserService.updateProfile(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getProfile = catchAsync(async (req, res) => {
  const result = await UserService.getProfile(req.user);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const deleteMyAccount = catchAsync(async (req, res) => {
  await UserService.deleteMyAccount(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Account deleted!",
  });
});

const getDriverStates = catchAsync(async (req,res)=>{
  
  const {userId} = req.user

 

  const states = await UserController.getDriverStates(userId)

  sendResponse(res, {
    statusCode:200,
    success:true,
    message:"driver states fetched successfully",
    data:states
  })
})



const UserController = {
  deleteMyAccount,
  getProfile,
  updateProfile,
  getDriverStates
};

module.exports = { UserController };
