const ApiError = require("../../../error/ApiError");
const User = require("../user/User");
const httpStatus = require("http-status");
const appleSigninAuth  = require('apple-signin-auth');
const config = require("../../../config");

const loginWithOAuth = async (
    provider,
    token,
    role = 'user',
    playerId
) => {
     if (!['google', 'apple', 'facebook'].includes(provider)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid provider');
    }
    let email, id, name, picture;


    try {
        if (provider === 'apple') {
            try {
                const appleUser = await appleSigninAuth.verifyIdToken(token, {
                    audience: config.apple_client_id,
                    ignoreExpiration: false,
                });

                if (!appleUser || !appleUser.sub) {
                    throw new ApiError(400, 'Invalid Apple token payload');
                }

                email = appleUser?.email || ' ';
                id = appleUser.sub;
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

        // Find or create user
        let user = await User.findOne({ [`${provider}Id`]: id });

        
        if (!user) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                user = new User({
                    email,
                    [`${provider}Id`]: id,
                    name,
                    profilePic: picture,
                    role,
                    isVerified: true,
                    playerIds: playerId ? [playerId] : [],
                });

                await user.save({ session });

                const nameParts = name.split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts[1] || '';

                const result = await NormalUser.create(
                    [
                        {
                            firstName,
                            lastName,
                            user: user._id,
                            email,
                            profile_image: picture,
                        },
                    ],
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
        } else {
            if (playerId) {
                const currentPlayerIds = user.playerIds || [];

                // If already exists, remove it first (to avoid duplicates)
                const filtered = currentPlayerIds.filter(
                    (id) => id !== playerId
                );

                // Add the new one to the end
                filtered.push(playerId);

                // If length > 3, remove from beginning
                if (filtered.length > 3) {
                    filtered.shift();
                }

                user.playerIds = filtered;
                await user.save();
            }
        }

        if (!user) {
            throw new ApiError(404, 'User not found after creation');
        }

        // Prepare JWT tokens
        const jwtPayload = {
            id: user._id,
            profileId: user.profileId,
            email: user.email,
            role: user.role ,
        };

        const accessToken = createToken(
            jwtPayload,
            config.jwt_access_secret ,
            config.jwt_access_expires_in 
        );
        const refreshToken = createToken(
            jwtPayload,
            config.jwt_refresh_secret ,
            config.jwt_refresh_expires_in 
        );

        return { accessToken, refreshToken };
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