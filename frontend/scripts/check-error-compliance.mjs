import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const TARGETS = [
  path.join(ROOT, 'frontend', 'src'),
  path.join(ROOT, 'backend', 'functions'),
  path.join(ROOT, 'shared')
];

const ALLOWED_TOAST_ERROR_FILES = new Set([
  path.join(ROOT, 'frontend', 'src', 'services', 'errors', 'notify.ts')
]);

const LEGACY_SOURCE_ALLOWLIST = new Set([
  'auth',
  'db',
  'edge',
  'network',
  'validation',
  'client',
  'unknown'
]);

const SOURCE_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;
const SINGLE_TOKEN_SOURCE_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

const shouldScanFile = (filePath) => /\.(ts|tsx|js|jsx)$/.test(filePath);

const isTestFile = (filePath) =>
  /__tests__|\.test\.(ts|tsx|js|jsx)$|_test\.ts$/.test(filePath);

const walk = (dirPath, acc = []) => {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
        continue;
      }
      walk(entryPath, acc);
      continue;
    }
    if (entry.isFile() && shouldScanFile(entryPath)) {
      acc.push(entryPath);
    }
  }
  return acc;
};

const getLineNumber = (input, index) => input.slice(0, index).split('\n').length;

const violations = [];

for (const target of TARGETS) {
  if (!statSync(target, { throwIfNoEntry: false })) {
    continue;
  }

  const files = walk(target);
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');

    const toastPattern = /\btoast\.error\s*\(/g;
    for (const match of content.matchAll(toastPattern)) {
      if (!ALLOWED_TOAST_ERROR_FILES.has(filePath)) {
        violations.push({
          rule: 'toast.error-direct',
          filePath,
          line: getLineNumber(content, match.index ?? 0),
          message: 'Utiliser notifyError() au lieu de toast.error() direct.'
        });
      }
    }

    const throwPattern = /throw\s+new\s+Error\s*\(/g;
    for (const match of content.matchAll(throwPattern)) {
      if (!isTestFile(filePath)) {
        violations.push({
          rule: 'throw-new-error',
          filePath,
          line: getLineNumber(content, match.index ?? 0),
          message: 'Utiliser createAppError()/mappers au lieu de throw new Error().'
        });
      }
    }

    const sourceLiteralPattern = /\bsource\b\s*:\s*['"`]([^'"`]+)['"`]/g;
    for (const match of content.matchAll(sourceLiteralPattern)) {
      const sourceValue = (match[1] ?? '').trim();
      const isValid =
        SOURCE_PATTERN.test(sourceValue)
        || SINGLE_TOKEN_SOURCE_PATTERN.test(sourceValue)
        || LEGACY_SOURCE_ALLOWLIST.has(sourceValue);

      if (!isValid) {
        violations.push({
          rule: 'source-format',
          filePath,
          line: getLineNumber(content, match.index ?? 0),
          message: `Source invalide "${sourceValue}". Format attendu: feature.action`
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Error compliance check failed:\n');
  for (const violation of violations) {
    const relativePath = path.relative(ROOT, violation.filePath).replace(/\\/g, '/');
    console.error(
      `[${violation.rule}] ${relativePath}:${violation.line} - ${violation.message}`
    );
  }
  process.exit(1);
}

console.log('Error compliance check passed.');
