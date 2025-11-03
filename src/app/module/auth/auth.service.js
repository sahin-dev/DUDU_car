const bcrypt = require("bcrypt");
const cron = require("node-cron");
const { status } = require("http-status");

const ApiError = require("../../../error/ApiError");
const config = require("../../../config");
const { jwtHelpers } = require("../../../util/jwtHelpers");
const { EnumUserRole, LoginProvider } = require("../../../util/enum");
const { logger } = require("../../../util/logger");
const Auth = require("./Auth");
const codeGenerator = require("../../../util/codeGenerator");
const User = require("../user/User");
const Admin = require("../admin/Admin");
const validateFields = require("../../../util/validateFields");
const EmailHelpers = require("../../../util/emailHelpers");

const registrationAccount = async (payload) => {
  validateFields(payload, [
    "password",
    "confirmPassword",
    "email",
    "phoneNumber",
    "role",
    "name",
    "provider",
  ]);

  if (payload.provider !== LoginProvider.LOCAL)
    throw new ApiError(status.BAD_REQUEST, "Invalid provider");

  const {
    role,
    name,
    password,
    confirmPassword,
    email,
    phoneNumber,
    emergencyPhoneNumber,
  } = payload || {};

  if (role === EnumUserRole.DRIVER)
    throw new ApiError(status.BAD_REQUEST, "Invalid role");

  const { code: activationCode, expiredAt: activationCodeExpire } =
    codeGenerator(3);
  const authData = {
    role,
    name,
    email,
    password,
    activationCode,
    activationCodeExpire,
  };
  const data = {
    user: name,
    activationCode,
    activationCodeExpire: Math.round(
      (activationCodeExpire - Date.now()) / (60 * 1000)
    ),
  };

  if (!Object.values(EnumUserRole).includes(role))
    throw new ApiError(status.BAD_REQUEST, "Invalid role");
  if (password !== confirmPassword)
    throw new ApiError(
      status.BAD_REQUEST,
      "Password and Confirm Password didn't match"
    );

  const user = await Auth.findOne({ email });
  if (user) {
    const message = user.isActive
      ? "Account active. Please Login"
      : "Already have an account. Please activate";

    if (!user.isActive) {
      user.activationCode = activationCode;
      user.activationCodeExpire = activationCodeExpire;
      await user.save();

      EmailHelpers.sendOtpResendEmail(email, data);
    }

    return {
      isActive: user.isActive,
      message,
    };
  }

  if (role !== EnumUserRole.ADMIN)
    EmailHelpers.sendActivationEmail(email, data);

  const auth = await Auth.create(authData);

  const userData = {
    authId: auth._id,
    name,
    email,
    role,
    phoneNumber,
    ...(emergencyPhoneNumber && { emergencyPhoneNumber }),
  };

  if (role === EnumUserRole.ADMIN) await Admin.create(userData);
  else await User.create(userData);

  return {
    isActive: false,
    message: "Account created successfully. Please check your email",
  };
};

const resendActivationCode = async (payload) => {
  const email = payload.email;

  const user = await Auth.isAuthExist(email);
  if (!user) throw new ApiError(status.BAD_REQUEST, "Email not found!");

  const { code: activationCode, expiredAt: activationCodeExpire } =
    codeGenerator(3);
  const data = {
    user: user.name,
    code: activationCode,
    expiresIn: Math.round((activationCodeExpire - Date.now()) / (60 * 1000)),
  };

  user.activationCode = activationCode;
  user.activationCodeExpire = activationCodeExpire;
  await user.save();

  EmailHelpers.sendOtpResendEmail(email, data);
};

const activateAccount = async (payload) => {
  const { activationCode, email } = payload;

  const auth = await Auth.findOne({ email });
  if (!auth) throw new ApiError(status.NOT_FOUND, "User not found");
  if (!auth.activationCode)
    throw new ApiError(
      status.NOT_FOUND,
      "Activation code not found. Get a new activation code"
    );
  if (auth.activationCode !== activationCode)
    throw new ApiError(status.BAD_REQUEST, "Code didn't match!");

  await Auth.updateOne(
    { email: email },
    { isActive: true },
    {
      new: true,
      runValidators: true,
    }
  );

  let result;
  switch (auth.role) {
    case EnumUserRole.ADMIN:
      result = await Admin.findOne({ authId: auth._id }).lean();
      break;
    default:
      result = await User.findOne({ authId: auth._id }).lean();
  }

  const tokenPayload = {
    authId: auth._id,
    userId: result._id,
    email,
    role: auth.role,
  };

  const accessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret,
    config.jwt.expires_in
  );

  return {
    accessToken,
  };
};

const loginAccount = async (payload) => {
  const { email, password, deviceId,token, source } = payload;
  
  const auth = await Auth.isAuthExist(email);

  if (!auth) throw new ApiError(status.NOT_FOUND, "User does not exist");

  // if (auth.deviceId && (auth.deviceId !== deviceId)){
  //   throw new ApiError(status.BAD_REQUEST, "You are already logged in from another device");
  // }
  if (!auth.isActive)
    throw new ApiError(
      status.BAD_REQUEST,
      "Please activate your account then try to login"
    );
  if (auth.isBlocked)
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");

  if (
    auth.password && !(await Auth.isPasswordMatched(password, auth.password))
  ) {
    throw new ApiError(status.BAD_REQUEST, "Password is incorrect");
  }
  if(!((auth.role === EnumUserRole.ADMIN && source === 'dashboard') || ((auth.role === EnumUserRole.USER || auth.role === EnumUserRole.DRIVER) && source !== 'dashboard'))){
    throw new ApiError(status.BAD_REQUEST, "Sorry, you are try to login incorrectly");
  }
  // Update token whenever user login 
  await User.updateOne({authId:auth._id}, {token:token})

  //update deviceId if it is not same as previous
  // await Auth.updateOne({ _id: auth._id }, { deviceId: deviceId }, { new: true });

  let result;
  let nrc_verification_status = undefined
  switch (auth.role) {
    case EnumUserRole.ADMIN:
     
      result = await Admin.findOne({ authId: auth._id }).populate("authId")
      break;
    case EnumUserRole.USER:
    
      result = await User.findOne({ authId: auth._id }).populate("authId");
      nrc_verification_status = result.nrc_verification_status
      break
    case EnumUserRole.DRIVER:
      result = await User.findOne({ authId: auth._id }).populate("authId");
      
  }



  const tokenPayload = {
    authId: auth._id,
    userId: result._id,
    email,
    role: auth.role,
  };

  const accessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret,
    config.jwt.expires_in
  );

  const returnedObj =  {
    ...(nrc_verification_status?{nrc_verification_status}:{}),
    accessToken,
  };
  console.log(returnedObj)
  return returnedObj
};

const socialLogin = async (payload) => {
  validateFields(payload, ["email", "name", "role", "provider", "token", "deviceId"]);
  const { email, name, role, provider, profile_image, address, phoneNumber, token,deviceId } =
    payload || {};

  if (provider === LoginProvider.LOCAL)
    throw new ApiError(status.BAD_REQUEST, "Invalid provider");

  let message = `${provider} login successful`;
  let [auth, user] = await Promise.all([
    Auth.isAuthExist(email),
    User.findOne({ email }),
  ]);

  if(auth && auth.deviceId && (auth.deviceId !== deviceId)){
    throw new ApiError(status.BAD_REQUEST, "You are already logged in from another device");
  }


  if (!auth) {
    const authData = {
      name,
      email,
      role,
      provider,
      deviceId,
      isActive: true,
    };
    validateFields(payload, ["phoneNumber"]);

    auth = await Auth.create(authData);

    const userData = {
      authId: auth._id,
      name,
      email,
      role,
      phoneNumber,
      ...(profile_image && { profile_image }),
      ...(address && { address }),
    };

    user = await User.create(userData);

    message = `Account created successfully`;
  }

  

  //update token for social login
  await User.updateOne({authId:auth._id}, {token})

  const tokenPayload = {
    authId: auth._id,
    userId: user._id,
    email,
    role,
  };

  const accessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret,
    config.jwt.expires_in
  );

  return {
    accessToken,
    message,
    nrc_verification_status:user.nrc_verification_status
  };
};

const forgotPass = async (payload) => {
  const { email } = payload;

  if (!email) throw new ApiError(status.BAD_REQUEST, "Missing email");

  const user = await Auth.isAuthExist(email);
  if (!user) throw new ApiError(status.BAD_REQUEST, "User not found!");

  const { code: verificationCode, expiredAt: verificationCodeExpire } =
    codeGenerator(3);

  user.verificationCode = verificationCode;
  user.verificationCodeExpire = verificationCodeExpire;
  await user.save();

  const data = {
    name: user.name,
    verificationCode,
    verificationCodeExpire: Math.round(
      (verificationCodeExpire - Date.now()) / (60 * 1000)
    ),
  };

  EmailHelpers.sendResetPasswordEmail(email, data);
};

const forgetPassOtpVerify = async (payload) => {
  const { email, code } = payload;

  if (!email) throw new ApiError(status.BAD_REQUEST, "Missing email");

  const auth = await Auth.findOne({ email: email });
  if (!auth) throw new ApiError(status.NOT_FOUND, "Account does not exist!");
  if (!auth.verificationCode)
    throw new ApiError(
      status.NOT_FOUND,
      "No verification code. Get a new verification code"
    );
  if (auth.verificationCode !== code)
    throw new ApiError(status.BAD_REQUEST, "Invalid verification code!");

  await Auth.updateOne(
    { email: auth.email },
    { isVerified: true, verificationCode: null }
  );
};

const resetPassword = async (payload) => {
  const { email, newPassword, confirmPassword } = payload;

  if (newPassword !== confirmPassword)
    throw new ApiError(status.BAD_REQUEST, "Passwords do not match");

  const auth = await Auth.isAuthExist(email);
  if (!auth) throw new ApiError(status.NOT_FOUND, "User not found!");
  if (!auth.isVerified)
    throw new ApiError(status.FORBIDDEN, "Please complete OTP verification");

  const hashedPassword = await hashPass(newPassword);

  await Auth.updateOne(
    { email },
    {
      $set: { password: hashedPassword },
      $unset: {
        isVerified: "",
        verificationCode: "",
        verificationCodeExpire: "",
      },
    }
  );
};

const changePassword = async (userData, payload) => {
  const { email } = userData;
  const { oldPassword, newPassword, confirmPassword } = payload;

  validateFields(payload, ["oldPassword", "newPassword", "confirmPassword"]);

  if (newPassword !== confirmPassword)
    throw new ApiError(
      status.BAD_REQUEST,
      "Password and confirm password do not match"
    );

  const isUserExist = await Auth.isAuthExist(email);

  if (!isUserExist)
    throw new ApiError(status.NOT_FOUND, "Account does not exist!");
  if (
    isUserExist.password &&
    !(await Auth.isPasswordMatched(oldPassword, isUserExist.password))
  ) {
    throw new ApiError(status.BAD_REQUEST, "Old password is incorrect");
  }

  isUserExist.password = newPassword;
  isUserExist.save();
};

const updateFieldsWithCron = async (check) => {
  const now = new Date();
  let result;

  if (check === "activation") {
    result = await Auth.updateMany(
      {
        activationCodeExpire: { $lte: now },
      },
      {
        $unset: {
          activationCode: "",
          activationCodeExpire: "",
        },
      }
    );
  }

  if (check === "verification") {
    result = await Auth.updateMany(
      {
        verificationCodeExpire: { $lte: now },
      },
      {
        $unset: {
          isVerified: "",
          verificationCode: "",
        },
      }
    );
  }

  if (result.modifiedCount > 0)
    logger.info(
      `Removed ${result.modifiedCount} expired ${
        check === "activation" ? "activation" : "verification"
      } code`
    );
};

const hashPass = async (newPassword) => {
  return await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
};

// Unset activationCode activationCodeExpire field for expired activation code
// Unset isVerified, verificationCode, verificationCodeExpire field for expired verification code
cron.schedule("* * * * *", async () => {
  try {
    updateFieldsWithCron("activation");
    updateFieldsWithCron("verification");
  } catch (error) {
    logger.error("Error removing expired code:", error);
  }
});

const logout = async (userData) => {
  const { authId } = userData;

  const auth = await Auth.findById(authId);
  const user = await User.findOne({ authId });
  if (!user) throw new ApiError(status.NOT_FOUND, "User not found");

  user.token = null; // Clear token to log out
  await user.save();

  // Clear deviceId to log out
  auth.deviceId = null;
  await auth.save();

  return { message: "Logged out successfully" };
};

const AuthService = {
  registrationAccount,
  loginAccount,
  logout,
  changePassword,
  forgotPass,
  resetPassword,
  activateAccount,
  forgetPassOtpVerify,
  resendActivationCode,
  socialLogin,
};

module.exports = { AuthService };
