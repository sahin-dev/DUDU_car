const ApiError = require("../../../error/ApiError");
const User = require("../user/User");
const mongoose = require('mongoose')
const httpStatus = require("http-status");
const appleSigninAuth  = require('apple-signin-auth');
const config = require("../../../config");
const Auth = require("./Auth");
const validateFields = require("../../../util/validateFields");
const { jwtHelpers } = require("../../../util/jwtHelpers");

const loginWithOAuth = async (
   payload
) => {

    validateFields(payload, ['provider', 'appleToken', 'role', 'deviceId', "token"]);
    const { provider, appleToken, role, deviceId, token, phoneNumber } = payload || {};

     if (!['google', 'apple', 'facebook'].includes(provider)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid provider');
    }
    let email, appleId, name, email_verified;


    try {
        if (provider === 'apple') {
         
            try {
                const appleUser = await appleSigninAuth.verifyIdToken(appleToken, {
                    audience: config.apple_client_id,
                    ignoreExpiration: false,
                }); 

                if (!appleUser || !appleUser.sub) {
                    throw new ApiError(400, 'Invalid Apple token payload');
                }
                email = appleUser?.email || ' ';
                appleId = appleUser.sub;
                name = appleUser?.name || 'Apple User';
                profile_image = '';
                email_verified = appleUser.email_verified
            } catch (err) {
                throw new ApiError(
                    401,
                    `Apple token verification failed: ${err.message}`
                );
            }
        } else {
            throw new ApiError(400, 'Unsupported OAuth provider');
        }

        let [auth, user] = await Promise.all([
            Auth.isAuthExist(email),
            User.findOne({ email }),
          ]);
          console.log(auth)

        // Find or create user
        
        if (!auth) {
            validateFields(payload, ["phoneNumber"]);
            const session = await mongoose.startSession();
            session.startTransaction();

            try {

                const authData = {
                    name,
                    email,
                    role,
                    provider,
                    deviceId,
                    phoneNumber,
                    appleId,
                    isActive: true,
                    isVerified:email_verified
                    };
                auth = new Auth(authData);

                await auth.save({ session });

                console.log(payload)

                
                const userData = {
                    authId: auth._id,
                    name,
                    email,
                    role,
                    phoneNumber,
                    };

                user = await User.create(
                        [userData],
                    { session }
                );

                await session.commitTransaction();
                session.endSession();
                //
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw new ApiError(
                    httpStatus.SERVICE_UNAVAILABLE,
                    error.message ||
                        'Something went wrong please try again letter'
                );
            }
        } 

        await User.updateOne({authId:auth._id}, {token})

        // Prepare JWT tokens
        const jwtPayload = {
            userId: user._id,
            authId: auth._id,
            email: user.email,
            role: user.role ,
        };

        const accessToken = jwtHelpers.createToken(
            jwtPayload,
            config.jwt.secret ,
            config.jwt.expires_in 
        );
        let first_time_log_in = !auth.initialLoggedIn
        if(first_time_log_in)
            await Auth.findOneAndUpdate({_id:auth._id}, {initialLoggedIn:true, initialLoggedInAt:new Date(Date.now())})
    
        return { accessToken, message:'Account created successfully', nrc_verification_status: user.nrc_verification_status, first_time_log_in};
    } catch (error) {
        console.error('OAuth login error:', error);

        if (error instanceof ApiError) {
            // Forward AppError to frontend with status and message
            throw error;
        }

        // Unknown error fallback
        throw new ApiError(500, 'Internal server error during OAuth login');
    }
};

module.exports.oauthService = { loginWithOAuth };