import { IUser } from "../models/user.model";

export const generateAccessAndRefreshTokens = async (user: IUser) => {
  // Generate tokens using model methods
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};
