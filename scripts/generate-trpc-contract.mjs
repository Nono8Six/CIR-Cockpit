import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routerPath = path.join(repoRoot, "backend/functions/api/trpc/router.ts");
const contractPath = path.join(repoRoot, "shared/api/trpc.generated.d.ts");
const mode = process.argv[2] ?? "--check";
const sourceFingerprintFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
  "backend/deno.json",
  "scripts/generate-trpc-contract.mjs",
];

if (mode !== "--check" && mode !== "--write") {
  throw new Error(`Unsupported mode ${mode}. Use --check or --write.`);
}

const program = ts.createProgram([routerPath], {
  allowImportingTsExtensions: true,
  baseUrl: repoRoot,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noCheck: true,
  paths: {
    "@trpc/server": ["node_modules/@trpc/server"],
    "@trpc/server/*": ["node_modules/@trpc/server/*"],
    "zod": ["node_modules/zod"],
    "zod/*": ["node_modules/zod/*"],
  },
  preserveSymlinks: true,
  skipLibCheck: true,
  strict: true,
  target: ts.ScriptTarget.ESNext,
});

const checker = program.getTypeChecker();
const routerSource = program.getSourceFile(routerPath);
if (!routerSource) {
  throw new Error("TypeScript could not load the canonical tRPC router source.");
}

const routerModule = checker.getSymbolAtLocation(routerSource);
const appRouterSymbol = routerModule
  ? checker.getExportsOfModule(routerModule).find((symbol) => symbol.name === "appRouter")
  : undefined;
if (!appRouterSymbol) {
  throw new Error("The canonical tRPC router must export appRouter.");
}

const requirePropertyType = (ownerType, propertyName) => {
  const property = checker.getPropertyOfType(ownerType, propertyName);
  if (!property) {
    throw new Error(`Missing ${propertyName} while projecting the canonical tRPC contract.`);
  }
  return checker.getTypeOfSymbolAtLocation(property, routerSource);
};

const typeFormatFlags =
  ts.TypeFormatFlags.NoTruncation
  | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const renderType = (type) => checker.typeToString(type, routerSource, typeFormatFlags);

const normalizeText = (value) => value.replaceAll("\r\n", "\n");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const sourceEntries = program.getSourceFiles()
  .map((sourceFile) => ({
    path: path.relative(repoRoot, sourceFile.fileName).replaceAll("\\", "/"),
    content: sourceFile.text,
  }))
  .filter(({ path: sourcePath }) =>
    !sourcePath.startsWith("../")
    && !sourcePath.startsWith("node_modules/")
    && sourcePath !== "shared/api/trpc.generated.d.ts"
  );

for (const sourcePath of sourceFingerprintFiles) {
  sourceEntries.push({
    path: sourcePath,
    content: await readFile(path.join(repoRoot, sourcePath), "utf8"),
  });
}

const sourceFingerprint = sha256(
  sourceEntries
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map(({ path: sourcePath, content }) => `${sourcePath}\0${normalizeText(content)}\0`)
    .join(""),
);

const appRouterType = checker.getTypeOfSymbolAtLocation(appRouterSymbol, routerSource);
const routerDefinitionType = requirePropertyType(appRouterType, "_def");
const routerRecordType = requirePropertyType(routerDefinitionType, "record");
const rootConfigType = requirePropertyType(routerDefinitionType, "_config");
const rootTypes = requirePropertyType(rootConfigType, "$types");
const errorShape = renderType(requirePropertyType(rootTypes, "errorShape"));
const transformer = renderType(requirePropertyType(rootTypes, "transformer"));

const procedureTypeNames = {
  mutation: "TRPCMutationProcedure",
  query: "TRPCQueryProcedure",
  subscription: "TRPCSubscriptionProcedure",
};

let procedureCount = 0;

const renderProcedure = (procedureType) => {
  const definition = requirePropertyType(procedureType, "_def");
  const procedureKind = renderType(requirePropertyType(definition, "type")).replaceAll('"', "");
  const procedureTypeName = procedureTypeNames[procedureKind];
  if (!procedureTypeName) {
    throw new Error(`Unsupported tRPC procedure type ${procedureKind}.`);
  }

  const publicTypes = requirePropertyType(definition, "$types");
  const input = renderType(requirePropertyType(publicTypes, "input"));
  const output = renderType(requirePropertyType(publicTypes, "output"));
  procedureCount += 1;
  return `${procedureTypeName}<{ meta: unknown; input: ${input}; output: ${output}; }>`;
};

const renderRouterRecord = (recordType, indentation = "") => {
  const lines = ["{"];
  for (const property of checker.getPropertiesOfType(recordType)) {
    const valueType = checker.getTypeOfSymbolAtLocation(property, routerSource);
    const definitionProperty = checker.getPropertyOfType(valueType, "_def");
    let renderedValue;

    if (definitionProperty) {
      const definition = checker.getTypeOfSymbolAtLocation(definitionProperty, routerSource);
      renderedValue = checker.getPropertyOfType(definition, "procedure")
        ? renderProcedure(valueType)
        : renderRouterRecord(valueType, `${indentation}  `);
    } else {
      renderedValue = renderRouterRecord(valueType, `${indentation}  `);
    }

    lines.push(`${indentation}  ${JSON.stringify(property.name)}: ${renderedValue};`);
  }
  lines.push(`${indentation}}`);
  return lines.join("\n");
};

const renderedRouterRecord = renderRouterRecord(routerRecordType);
if (procedureCount === 0) {
  throw new Error("The canonical tRPC router does not expose any procedure.");
}

const contractBody = [
  "// Generated from backend/functions/api/trpc/router.ts. Do not edit manually.",
  `// Client projection: ${procedureCount} procedures with public input/output types only.`,
  "// Run `pnpm run contract:trpc:generate` after changing the canonical router.",
  "",
  "import type {",
  "  TRPCBuiltRouter,",
  "  TRPCMutationProcedure,",
  "  TRPCQueryProcedure,",
  "  TRPCSubscriptionProcedure,",
  "  TRPC_ERROR_CODE_NUMBER,",
  "  inferRouterInputs,",
  "  inferRouterOutputs,",
  '} from "@trpc/server";',
  'import type { z } from "zod/v4";',
  "",
  "type ContractRootTypes = {",
  "  ctx: object;",
  "  meta: object;",
  `  errorShape: ${errorShape};`,
  `  transformer: ${transformer};`,
  "};",
  "",
  `type ContractRouterRecord = ${renderedRouterRecord};`,
  "",
  "export type AppRouter = TRPCBuiltRouter<ContractRootTypes, ContractRouterRecord>;",
  "export type RouterInputs = inferRouterInputs<AppRouter>;",
  "export type RouterOutputs = inferRouterOutputs<AppRouter>;",
  "",
].join("\n");
const contractFingerprint = sha256(contractBody);
const generated = [
  `// Source fingerprint: sha256:${sourceFingerprint}`,
  `// Contract fingerprint: sha256:${contractFingerprint}`,
  contractBody,
].join("\n");

if (mode === "--write") {
  await writeFile(contractPath, generated, "utf8");
  console.log("Updated shared/api/trpc.generated.d.ts from the canonical backend router.");
} else {
  let current;
  try {
    current = await readFile(contractPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error("Missing shared/api/trpc.generated.d.ts. Run pnpm run contract:trpc:generate.");
    }
    throw error;
  }

  const normalizedCurrent = normalizeText(current);
  const currentSourceFingerprint = normalizedCurrent.match(
    /^\/\/ Source fingerprint: sha256:([a-f0-9]{64})$/m,
  )?.[1];
  const currentContractFingerprint = normalizedCurrent.match(
    /^\/\/ Contract fingerprint: sha256:([a-f0-9]{64})$/m,
  )?.[1];
  const currentContractBody = normalizedCurrent
    .replace(/^\/\/ Source fingerprint: sha256:[a-f0-9]{64}\n/m, "")
    .replace(/^\/\/ Contract fingerprint: sha256:[a-f0-9]{64}\n/m, "");

  if (
    currentSourceFingerprint !== sourceFingerprint
    || currentContractFingerprint !== sha256(currentContractBody)
  ) {
    throw new Error("The generated tRPC contract is stale. Run pnpm run contract:trpc:generate.");
  }
  console.log("Canonical tRPC declaration is up to date.");
}
