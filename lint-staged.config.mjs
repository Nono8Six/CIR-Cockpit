/** @type {import('lint-staged').Configuration} */
export default {
  'frontend/src/**/*.{ts,tsx}': 'pnpm --dir frontend exec eslint --max-warnings=0',
  'shared/**/*.ts': 'pnpm --dir frontend exec eslint --max-warnings=0 --no-warn-ignored',
  'backend/src/**/*.ts': () => 'pnpm --dir backend run typecheck',
};
