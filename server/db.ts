import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For development, use a fallback database URL if not provided
const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/lifeline_dev';

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Using development fallback. This is NOT suitable for production.");
  console.warn("Please set DATABASE_URL environment variable for production use.");
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });