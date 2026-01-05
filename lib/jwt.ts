import jwt from "jsonwebtoken";

export const generateToken = (user: any) => {
  return jwt.sign({ user }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as any;
};
