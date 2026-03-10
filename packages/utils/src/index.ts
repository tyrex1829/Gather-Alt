import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;
  email: string;
  name?: string;
  tokenVersion?: number;
  type?: "access" | "refresh";
  service?: string;
};

export function verifyJwt(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export function authMiddleware(jwtSecret: string) {
  return function (req: any, _res: any, next: any) {
    const auth = req.headers.authorization;
    if (!auth) {
      return next(new AppError("Missing Authorization header", 401));
    }
    const token = auth.replace("Bearer ", "");
    try {
      const payload = verifyJwt(token, jwtSecret);
      if (payload.type && payload.type !== "access") {
        return next(new AppError("Invalid token", 401));
      }
      req.user = payload;
      next();
    } catch {
      next(new AppError("Invalid token", 401));
    }
  };
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  const prefix = "[INFO]";
  if (meta) {
    console.log(prefix, message, meta);
  } else {
    console.log(prefix, message);
  }
}

export function logError(message: string, meta?: Record<string, unknown>) {
  const prefix = "[ERROR]";
  if (meta) {
    console.error(prefix, message, meta);
  } else {
    console.error(prefix, message);
  }
}

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}
