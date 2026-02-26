import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const appPath = path.join(repoRoot, 'backend', 'functions', 'api', 'app.ts');
const generatedDir = path.join(repoRoot, 'shared', 'api', 'generated');
const generatedTsPath = path.join(generatedDir, 'rpc-app.ts');
const generatedLegacyDtsPath = path.join(generatedDir, 'rpc-app.d.ts');
const legacyBackendRpcDir = path.join(generatedDir, 'backend-rpc');
const trpcProcedurePaths = [
  'admin.users',
  'admin.agencies',
  'data.entities',
  'data.entity-contacts',
  'data.interactions',
  'data.config',
  'data.profile'
];

const appSource = readFileSync(appPath, 'utf8');

const routeImportBySymbol = new Map();
for (const match of appSource.matchAll(/^import\s+(\w+)\s+from\s+'(\.\/routes\/[^']+)';$/gm)) {
  const [, symbol, importPath] = match;
  routeImportBySymbol.set(symbol, importPath);
}

const mountedRouteSymbols = [];
for (const match of appSource.matchAll(/\.route\(\s*'\/'\s*,\s*(\w+)\s*\)/g)) {
  mountedRouteSymbols.push(match[1]);
}

const rpcPathsTree = {};

const addRoutePath = (fullPath) => {
  const normalizedPath = fullPath.trim();
  if (!normalizedPath.startsWith('/')) {
    throw new Error(`Route invalide (doit commencer par /): ${normalizedPath}`);
  }

  const segments = normalizedPath
    .split('/')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error(`Route invalide (segments vides): ${normalizedPath}`);
  }

  let cursor = rpcPathsTree;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLeaf = index === (segments.length - 1);
    const existing = cursor[segment];

    if (isLeaf) {
      if (existing !== undefined) {
        throw new Error(`Route dupliquee detectee pour ${normalizedPath}`);
      }
      cursor[segment] = normalizedPath;
      continue;
    }

    if (existing === undefined) {
      cursor[segment] = {};
    } else if (typeof existing === 'string') {
      throw new Error(`Conflit de segments detecte autour de ${normalizedPath}`);
    }

    cursor = cursor[segment];
  }
};

const addTrpcProcedurePath = (procedurePath) => {
  const normalizedProcedurePath = procedurePath.trim();
  if (!normalizedProcedurePath) {
    throw new Error('Chemin de procedure tRPC vide detecte.');
  }

  const segments = normalizedProcedurePath
    .split('.')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    throw new Error(`Procedure tRPC invalide: ${normalizedProcedurePath}`);
  }

  let cursor = rpcPathsTree;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLeaf = index === (segments.length - 1);
    const existing = cursor[segment];

    if (isLeaf) {
      if (existing !== undefined) {
        throw new Error(`Procedure tRPC dupliquee detectee pour ${normalizedProcedurePath}`);
      }
      cursor[segment] = `/trpc/${normalizedProcedurePath}`;
      continue;
    }

    if (existing === undefined) {
      cursor[segment] = {};
    } else if (typeof existing === 'string') {
      throw new Error(`Conflit de segments detecte autour de ${normalizedProcedurePath}`);
    }

    cursor = cursor[segment];
  }
};

if (mountedRouteSymbols.length > 0) {
  for (const symbol of mountedRouteSymbols) {
    const relativeImportPath = routeImportBySymbol.get(symbol);
    if (!relativeImportPath) {
      throw new Error(`Import introuvable pour la route montee: ${symbol}`);
    }

    const routeFilePath = path.resolve(path.dirname(appPath), relativeImportPath);
    const routeSource = readFileSync(routeFilePath, 'utf8');
    const postPathMatch = routeSource.match(/\.post\(\s*'([^']+)'/m);
    if (!postPathMatch) {
      throw new Error(`Aucune route POST detectee dans ${path.relative(repoRoot, routeFilePath)}`);
    }

    addRoutePath(postPathMatch[1]);
  }
} else {
  trpcProcedurePaths.forEach(addTrpcProcedurePath);
}

const output = `// GENERATED FILE - DO NOT EDIT\n// Source of truth: backend/functions/api/app.ts\n\nexport type RpcJsonRequest = { json: unknown };\nexport type RpcPost = (request: RpcJsonRequest, init?: RequestInit) => Promise<Response>;\n\ntype RpcPathTree = {\n  readonly [key: string]: string | RpcPathTree;\n};\n\ntype RpcLeaf = {\n  $post: RpcPost;\n};\n\ntype RpcTreeToClient<T extends RpcPathTree> = {\n  [K in keyof T]: T[K] extends string\n    ? RpcLeaf\n    : RpcTreeToClient<Extract<T[K], RpcPathTree>>;\n};\n\nexport const RPC_POST_PATHS = ${JSON.stringify(rpcPathsTree, null, 2)} as const satisfies RpcPathTree;\n\nexport type AppType = RpcTreeToClient<typeof RPC_POST_PATHS>;\n`;

mkdirSync(generatedDir, { recursive: true });
writeFileSync(generatedTsPath, output, 'utf8');

rmSync(generatedLegacyDtsPath, { force: true });
rmSync(legacyBackendRpcDir, { recursive: true, force: true });
