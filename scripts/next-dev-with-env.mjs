import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

function stripSurroundingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseEnvFile(content) {
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Support `export KEY=VALUE` format.
    const normalized = line.startsWith("export ") ? line.slice("export ".length) : line;

    const eqIndex = normalized.indexOf("=");
    if (eqIndex === -1) continue;

    const key = normalized.slice(0, eqIndex).trim();
    let value = normalized.slice(eqIndex + 1).trim();

    value = stripSurroundingQuotes(value);
    result[key] = value;
  }
  return result;
}

const argv = process.argv.slice(2);

let envFile = ".env.production";
const forwardedArgs = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--env-file") {
    envFile = argv[i + 1] ?? envFile;
    i++;
    continue;
  }
  if (arg.startsWith("--env-file=")) {
    envFile = arg.slice("--env-file=".length);
    continue;
  }
  forwardedArgs.push(arg);
}

const envPath = resolve(process.cwd(), envFile);
if (!existsSync(envPath)) {
  console.warn(`[next-dev-with-env] Env file not found: ${envPath}`);
} else {
  const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "NODE_ENV") continue; // avoid Next warning for `next dev`
    process.env[key] = value;
  }
}

const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", ...forwardedArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

