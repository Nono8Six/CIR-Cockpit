import { z } from "zod/v4";

const nodeEnvSchema = z.enum(["development", "test", "production"]);

const rawEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  DATABASE_URL: z.string().default(""),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  SUPABASE_URL: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
  SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_JWKS_URL: z.string().default(""),
  SUPABASE_JWT_ISSUER: z.string().default(""),
  SUPABASE_JWT_AUDIENCE: z.string().default(""),
  SUPABASE_JWT_ALLOWED_ALGS: z.string().default(""),
  SUPABASE_JWKS_CACHE_TTL_MS: z.string().default(""),
  CORS_ALLOWED_ORIGIN: z.string().default(""),
  RATE_LIMIT_MAX: z.string().default(""),
  RATE_LIMIT_WINDOW_SECONDS: z.string().default(""),
  DRAFT_RATE_LIMIT_MAX: z.string().default(""),
  DRAFT_RATE_LIMIT_WINDOW_SECONDS: z.string().default(""),
  AI_SECRET_ENCRYPTION_KEY: z.string().default(""),
});

export type AppConfig = {
  nodeEnv: z.infer<typeof nodeEnvSchema>;
  host: string;
  port: number;
  databaseUrl: string;
  databasePoolMax: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey: string;
  supabaseJwksUrl: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtAllowedAlgs: string;
  jwksCacheTtlMs: string;
  corsAllowedOrigin: string;
  rateLimitMax: string;
  rateLimitWindowSeconds: string;
  draftRateLimitMax: string;
  draftRateLimitWindowSeconds: string;
  aiSecretEncryptionKey: string;
  raw: Record<string, string | undefined>;
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

let current: AppConfig | null = null;

const readSource = (
  source: Record<string, string | undefined>,
): Record<string, string | undefined> => {
  const next: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    next[key] = value;
  }
  return next;
};

export const loadConfig = (
  source: Record<string, string | undefined> = process.env,
): AppConfig => {
  const raw = readSource(source);
  const parsed = rawEnvSchema.parse({
    NODE_ENV: raw.NODE_ENV,
    HOST: raw.HOST,
    PORT: raw.PORT,
    DATABASE_URL: raw.DATABASE_URL,
    DATABASE_POOL_MAX: raw.DATABASE_POOL_MAX,
    SUPABASE_URL: raw.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: raw.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: raw.SUPABASE_ANON_KEY,
    SUPABASE_JWKS_URL: raw.SUPABASE_JWKS_URL,
    SUPABASE_JWT_ISSUER: raw.SUPABASE_JWT_ISSUER,
    SUPABASE_JWT_AUDIENCE: raw.SUPABASE_JWT_AUDIENCE,
    SUPABASE_JWT_ALLOWED_ALGS: raw.SUPABASE_JWT_ALLOWED_ALGS,
    SUPABASE_JWKS_CACHE_TTL_MS: raw.SUPABASE_JWKS_CACHE_TTL_MS,
    CORS_ALLOWED_ORIGIN: raw.CORS_ALLOWED_ORIGIN,
    RATE_LIMIT_MAX: raw.RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS: raw.RATE_LIMIT_WINDOW_SECONDS,
    DRAFT_RATE_LIMIT_MAX: raw.DRAFT_RATE_LIMIT_MAX,
    DRAFT_RATE_LIMIT_WINDOW_SECONDS: raw.DRAFT_RATE_LIMIT_WINDOW_SECONDS,
    AI_SECRET_ENCRYPTION_KEY: raw.AI_SECRET_ENCRYPTION_KEY,
  });

  const supabaseUrl = normalizeBaseUrl(parsed.SUPABASE_URL.trim());
  current = {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST.trim() || "127.0.0.1",
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL.trim(),
    databasePoolMax: parsed.DATABASE_POOL_MAX,
    supabaseUrl,
    supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY.trim(),
    supabaseAnonKey: parsed.SUPABASE_ANON_KEY.trim(),
    supabaseJwksUrl: parsed.SUPABASE_JWKS_URL.trim() ||
      (supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : ""),
    jwtIssuer: parsed.SUPABASE_JWT_ISSUER.trim() ||
      (supabaseUrl ? `${supabaseUrl}/auth/v1` : ""),
    jwtAudience: parsed.SUPABASE_JWT_AUDIENCE.trim(),
    jwtAllowedAlgs: parsed.SUPABASE_JWT_ALLOWED_ALGS.trim(),
    jwksCacheTtlMs: parsed.SUPABASE_JWKS_CACHE_TTL_MS.trim(),
    corsAllowedOrigin: parsed.CORS_ALLOWED_ORIGIN.trim(),
    rateLimitMax: parsed.RATE_LIMIT_MAX.trim(),
    rateLimitWindowSeconds: parsed.RATE_LIMIT_WINDOW_SECONDS.trim(),
    draftRateLimitMax: parsed.DRAFT_RATE_LIMIT_MAX.trim(),
    draftRateLimitWindowSeconds: parsed.DRAFT_RATE_LIMIT_WINDOW_SECONDS.trim(),
    aiSecretEncryptionKey: parsed.AI_SECRET_ENCRYPTION_KEY.trim(),
    raw,
  };
  return current;
};

export const getConfig = (): AppConfig => current ?? loadConfig();

export const resetConfigForTests = (
  source: Record<string, string | undefined> = process.env,
): AppConfig => {
  current = null;
  return loadConfig(source);
};
