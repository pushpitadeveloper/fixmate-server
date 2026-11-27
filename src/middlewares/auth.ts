import { NextFunction, Request, Response } from 'express';
import jwt from "jsonwebtoken";
import { getDb } from "../config/db";

export interface AuthRequest extends Request {
  user?: any;
}

function parseCookies(cookieHeader?: string) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  // 1. Bearer token - JWT
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
  const token = authHeader.split(" ")[1];
  try {
    const db = await getDb();
    const session: any = await db.collection("session").findOne({ token })
      || await db.collection("sessions").findOne({ token });
    if (session) {
      const userId = session.userId || session.user_id;
      const user: any = await db.collection("user").findOne({ _id: userId as any })
        || await db.collection("users").findOne({ _id: userId as any });
      if (user) {
        req.user = { id: String(user._id), sub: String(user._id), name: user.name, email: user.email, role: user.role || "customer" };
        return next();
      }
    }
  } catch {}
  // JWT hole try koro, na hole cookie check e jete dao - ekhane 401 diba na
}
  // 2. BetterAuth cookie session - client uses credentials: include, no Bearer
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies["better-auth.session_token"] || cookies["better-auth.session-token"];
    if (sessionToken) {
      const db = await getDb();
      const session: any = await db.collection("session").findOne({ token: sessionToken })
        || await db.collection("sessions").findOne({ token: sessionToken });
      if (session) {
        const userId = session.userId || session.user_id;
        const user: any = await db.collection("user").findOne({ _id: userId as any })
          || await db.collection("users").findOne({ _id: userId as any });
        if (user) {
          req.user = { id: String(user._id), sub: String(user._id), name: user.name, email: user.email, role: user.role || "customer", image: user.image };
          return next();
        }
      }
    }
  } catch {}
  // Challenge 2 - No token -> 401
  return res.status(401).json({ message: "Unauthorized. Please sign in." });
}

export function verifyRole(...allowed: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized. Please sign in." });
    const userRole = req.user?.role || req.user?.user?.role;
    // Admin can do everything
    if (userRole === "admin") return next();
    if (!allowed.includes(userRole)) {
      // Challenge 2 - Wrong role -> 403
      return res.status(403).json({ message: "You do not have permission to do this." });
    }
    next();
  };
}
