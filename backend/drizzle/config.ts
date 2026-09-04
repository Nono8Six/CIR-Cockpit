import { getConfig } from "../src/config.ts";

// DATABASE_URL is the Node process connection string. Direct 5432 or
// Supavisor session mode are both acceptable. Transaction mode 6543 remains
// compatible because the client disables prepared statements.
export const getSupabaseDbUrl = (): string => getConfig().databaseUrl;
