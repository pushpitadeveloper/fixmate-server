import { NextFunction, Request, Response } from 'express';
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: any;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token nai, login koro" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, process.env.BETTER_AUTH_SECRET!);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token thik nai" });
  }
}

export function verifyRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || req.user?.user?.role;
    if (userRole !== role && userRole !== "admin") {
      return res.status(403).json({ message: "Tomar permission nai" });
    }
    next();
  };
}
