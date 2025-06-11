import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { loginSchema, registerSchema } from "@shared/schema";

const PgSession = connectPg(session);

export function setupAuth(app: express.Application) {
  // Session configuration
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: "sessions",
    }),
    secret: process.env.SESSION_SECRET || "family-management-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  }));
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatar?: string;
  };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

export const loadUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.session && req.session.userId) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar || undefined,
        };
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }
  next();
};

export async function registerUser(email: string, password: string, name: string, role: string = "parent") {
  const validation = registerSchema.safeParse({ email, password, name, role });
  if (!validation.success) {
    throw new Error("Invalid user data");
  }

  // Check if user already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, email));
  if (existingUsers.length > 0) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const newUsers = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      name,
      role,
      preferences: {},
    })
    .returning();

  if (!newUsers || newUsers.length === 0) {
    throw new Error("Failed to create user");
  }

  return newUsers[0];
}

export async function authenticateUser(email: string, password: string) {
  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return null;
  }

  const foundUsers = await db.select().from(users).where(eq(users.email, email));
  if (!foundUsers || foundUsers.length === 0) {
    return null;
  }

  const user = foundUsers[0];
  const isValidPassword = await bcrypt.compare(password, user.password);
  return isValidPassword ? user : null;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}