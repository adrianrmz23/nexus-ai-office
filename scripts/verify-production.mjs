import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
let parsedAppUrl = null;
try {
  parsedAppUrl = new URL(appUrl);
} catch {
  parsedAppUrl = null;
}
check(
  "NEXT_PUBLIC_APP_URL",
  Boolean(parsedAppUrl) &&
    (parsedAppUrl.protocol === "https:" || parsedAppUrl.hostname === "localhost"),
  parsedAppUrl
    ? `${parsedAppUrl.protocol}//${parsedAppUrl.host}`
    : "No es una URL válida.",
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let parsedSupabaseUrl = null;
try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch {
  parsedSupabaseUrl = null;
}
check(
  "Supabase URL",
  Boolean(parsedSupabaseUrl) && parsedSupabaseUrl.protocol === "https:",
  parsedSupabaseUrl ? parsedSupabaseUrl.host : "No configurada.",
);

check(
  "Supabase publishable key",
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  "Solo se valida presencia; el valor nunca se imprime.",
);

const encryptionKey = process.env.NEXUS_CREDENTIAL_ENCRYPTION_KEY ?? "";
let encryptionBytes = 0;
try {
  encryptionBytes = Buffer.from(encryptionKey, "base64").length;
} catch {
  encryptionBytes = 0;
}
check(
  "Clave maestra de credenciales",
  encryptionBytes === 32,
  encryptionBytes === 32
    ? "32 bytes en Base64."
    : `Formato inválido (${encryptionBytes} bytes decodificados).`,
);

const gitignorePath = resolve(process.cwd(), ".gitignore");
const gitignore = existsSync(gitignorePath)
  ? readFileSync(gitignorePath, "utf8")
  : "";
check(
  ".env.local ignorado",
  /(^|\n)\.env\*?(\n|$)|(^|\n)\.env\.local(\n|$)/m.test(gitignore) ||
    gitignore.includes(".env*"),
  "Evita subir secretos al repositorio.",
);

for (const migration of [
  "202607260012_repository_storage_rls_fix.sql",
  "202607260013_production_hardening.sql",
]) {
  check(
    migration,
    existsSync(resolve(process.cwd(), "supabase", "migrations", migration)),
    "Migración requerida por el Bloque 12.",
  );
}

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  const symbol = item.passed ? "✓" : "✗";
  console.log(`${symbol} ${item.name}: ${item.detail}`);
}

if (failed.length) {
  console.error(`\nNEXUS no está listo: ${failed.length} comprobaciones fallaron.`);
  process.exit(1);
}

console.log("\nNEXUS superó las comprobaciones locales de producción.");
