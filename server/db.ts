import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For now, use memory storage until database is properly configured
console.log('Using memory storage for development');

let pool: Pool | undefined;
let db: any;

export { pool, db };