import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_development_secret_do_not_use_in_production";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is missing in production");
}

export interface JwtAuthUser {
  id: number;
  email: string;
  role?: string | null;
  [key: string]: unknown;
}

export interface JwtTokenUser {
  id?: number;
  email: string;
  role?: string | null;
  [key: string]: unknown;
}

export interface DecodedJwtPayload {
  user: JwtAuthUser;
  iat?: number;
  exp?: number;
}

export const generateToken = (
  user: JwtTokenUser,
  expireTime: string | number = "1h",
): string => {
  return jwt.sign({ user }, JWT_SECRET, {
    expiresIn: expireTime as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
};

export const verifyToken = (token: string): DecodedJwtPayload => {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  }) as DecodedJwtPayload;
};

export const getAuthCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: maxAgeSeconds,
  path: "/",
});
