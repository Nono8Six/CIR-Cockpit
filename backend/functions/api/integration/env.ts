const REQUIRED_INTEGRATION_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'API_INT_ADMIN_EMAIL',
  'API_INT_ADMIN_PASSWORD',
  'API_INT_USER_EMAIL',
  'API_INT_USER_PASSWORD'
] as const;

const readTrimmedEnv = (key: string): string => (Deno.env.get(key) ?? '').trim();

export const integrationEnv = {
  runFlag: readTrimmedEnv('RUN_API_INTEGRATION') === '1',
  supabaseUrl: readTrimmedEnv('SUPABASE_URL').replace(/\/+$/, ''),
  anonKey: readTrimmedEnv('SUPABASE_ANON_KEY'),
  adminEmail: readTrimmedEnv('API_INT_ADMIN_EMAIL'),
  adminPassword: readTrimmedEnv('API_INT_ADMIN_PASSWORD'),
  userEmail: readTrimmedEnv('API_INT_USER_EMAIL'),
  userPassword: readTrimmedEnv('API_INT_USER_PASSWORD'),
  corsOrigin: readTrimmedEnv('API_INT_ORIGIN') || 'http://localhost:3000'
} as const;

export const missingIntegrationEnv = REQUIRED_INTEGRATION_ENV.filter(
  (key) => readTrimmedEnv(key).length === 0
);
