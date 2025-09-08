const ApiError = require("../../../error/ApiError");
const User = require("../user/User");
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
    const { provider, appleToken, role, deviceId, token } = payload || {};

     if (!['google', 'apple', 'facebook'].includes(provider)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid provider');
    }
    let email, id, name, picture;


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
                console.log(appleUser)
                email = appleUser?.email || ' ';
                appleId = appleUser.sub;
                name = 'Apple User';
                picture = '';
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
                    isActive: true,
                    };
                auth = new Auth(authData);

                await auth.save({ session });

                
                const userData = {
                    authId: auth._id,
                    name,
                    email,
                    role,
                    phoneNumber,
                    ...(profile_image && { profile_image }),
                    ...(address && { address }),
                    };

                const user = await User.create(
                        userData,
                    { session }
                );

                user = await User.findByIdAndUpdate(
                    user._id,
                    { profileId: result[0]._id },
                    { new: true, runValidators: true, session }
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

        // Prepare JWT tokens
        const jwtPayload = {
            userId: user._id,
            authId: auth._id,
            email: user.email,
            role: user.role ,
        };

        const accessToken = jwtHelpers.createToken(
            jwtPayload,
            config.jwt_access_secret ,
            config.jwt_access_expires_in 
        );
    
        return { accessToken, message:'Account created successfully'};
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