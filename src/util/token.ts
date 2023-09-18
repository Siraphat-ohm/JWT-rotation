import jwt from "jsonwebtoken"

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

export const generateTokenSet = ( userInfo ) => {
    const accessToken = jwt.sign(userInfo, ACCESS_TOKEN_SECRET, {
        expiresIn: "10s"
    });

    const refreshToken = jwt.sign(userInfo, REFRESH_TOKEN_SECRET, {
        expiresIn: "1d"
    });

    return {
        accessToken,
        refreshToken
    };
};
