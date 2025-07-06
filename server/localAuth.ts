import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import type { Express } from "express";
import session from "express-session";
import { nanoid } from "nanoid";

// Import memorystore using createRequire for CommonJS compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const MemoryStore = require('memorystore');

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory store for development since database connection has issues
  const sessionStore = new (MemoryStore(session))({
    checkPeriod: 86400000, // prune expired entries every 24h
    ttl: sessionTtl,
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'cd93cb7f0482c8287da1a8e1206e7936e3ba0ebe5593ea5f8ab0af1c2c9790ce',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Incorrect email or password." });
        }

        if (!user.password) {
          return done(null, false, { message: "Incorrect email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect email or password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/register", async (req, res, next) => {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    try {
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.upsertUser({
        id: nanoid(),
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      });

      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json({ user: newUser });
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: "Logged out" });
    });
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
