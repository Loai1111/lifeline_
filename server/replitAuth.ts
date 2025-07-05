import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    try {
      console.log("[AUTH DEBUG] Discovering OIDC config with:", {
        issuerUrl: process.env.ISSUER_URL ?? "https://replit.com/oidc",
        clientId: process.env.REPL_ID
      });
      
      const config = await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
      
      console.log("[AUTH DEBUG] OIDC config discovered successfully");
      return config;
    } catch (error) {
      console.error("[AUTH DEBUG] OIDC discovery failed:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  console.log("[SESSION DEBUG] Creating session with config:", {
    nodeEnv: process.env.NODE_ENV,
    secure: process.env.NODE_ENV === 'production',
    ttl: sessionTtl
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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user exists first
  const existingUser = await storage.getUser(claims["sub"]);
  
  if (existingUser) {
    // User exists, just update their info
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: existingUser.role, // Keep existing role
    });
  } else {
    // New user, create without role (they'll select it later)
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: "donor", // Temporary default to satisfy DB constraint
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      if (!claims) {
        console.error("[AUTH DEBUG] No claims found in tokens");
        return verified(new Error("No claims found"));
      }
      
      const user = {
        id: claims.sub,
        claims: claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims.exp
      };
      await upsertUser(claims);
      console.log("[AUTH DEBUG] User verified:", { userId: claims.sub, expires_at: claims.exp });
      verified(null, user);
    } catch (error) {
      console.error("[AUTH DEBUG] Verification error:", error);
      verified(error as Error);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("[AUTH DEBUG] Callback route hit:", {
      hostname: req.hostname,
      sessionID: req.sessionID,
      query: req.query
    });
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Debug logging
  console.log("[AUTH DEBUG] isAuthenticated check:", {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!user,
    hasExpiresAt: user?.expires_at,
    sessionID: req.sessionID,
    path: req.path
  });

  if (!req.isAuthenticated() || !user?.expires_at) {
    console.log("[AUTH DEBUG] Authentication failed - no session or expires_at");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    console.log("[AUTH DEBUG] Token expired and no refresh token available");
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    console.log("[AUTH DEBUG] Attempting to refresh token");
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("[AUTH DEBUG] Token refreshed successfully");
    return next();
  } catch (error) {
    console.error("[AUTH DEBUG] Token refresh failed:", error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
