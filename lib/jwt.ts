import jwt from "jsonwebtoken";

export const generateToken = (user: any, expireTime: string) => {
  return jwt.sign({ user }, process.env.JWT_SECRET as string, {
    expiresIn: expireTime as any,
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as any;
};
