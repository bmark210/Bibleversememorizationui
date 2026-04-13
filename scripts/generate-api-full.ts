/**
 * Full API generation script.
 *
 * 1. Fetches the latest swagger spec from the backend (or OPENAPI_SPEC_URL env var).
 * 2. Backs up manually-maintained service wrapper files.
 * 3. Runs openapi-typescript-codegen (wipes src/api/services and regenerates).
 * 4. Restores the manual service files so they are never deleted by codegen.
 * 5. Runs openapi-typescript to regenerate src/api/openapi-types.ts.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const swagger2openapi = require("swagger2openapi") as {
  convertObj: (
    obj: Record<string, unknown>,
    options: { patch?: boolean; warnOnly?: boolean },
    cb: (err: Error | null, result: { openapi: Record<string, unknown> }) => void,
  ) => void;
};

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_URL =
  process.env.OPENAPI_SPEC_URL?.trim() ||
  "https://bible-memory-db-production.up.railway.app/swagger/doc.json";

const SERVICES_DIR = path.resolve("src/api/services");
const BACKUP_DIR = path.resolve(".api-manual-backup");

/**
 * These files live inside src/api/services/ but are maintained by hand —
 * they contain business logic, constants, and pagination helpers that cannot
 * be auto-generated from the OpenAPI spec.
 *
 * Add new filenames here whenever you create a new manual wrapper.
 */
const MANUAL_SERVICE_FILES = [
  "catalogVersesPagination.ts",
  "friends.ts",
  "friendsActivity.ts",
  "leaderboard.ts",
  "playerProfile.ts",
  "textBoxes.ts",
  "userStats.ts",
  "userVerseDelete.ts",
  "userVersesPagination.ts",
  "verseOwners.ts",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureOpenAPI3(
  doc: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const openapi = doc.openapi;
  if (typeof openapi === "string" && openapi.startsWith("3.")) {
    return Promise.resolve(doc);
  }
  if (doc.swagger === "2.0") {
    return new Promise((resolve, reject) => {
      swagger2openapi.convertObj(doc, { patch: true }, (err, result) => {
        if (err) { reject(err); return; }
        resolve(result.openapi);
      });
    });
  }
  return Promise.reject(
    new Error("Unsupported API spec: expected swagger: 2.0 or openapi: 3.x"),
  );
}

function backupManualFiles() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let saved = 0;
  for (const file of MANUAL_SERVICE_FILES) {
    const src = path.join(SERVICES_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(BACKUP_DIR, file));
      saved++;
    }
  }
  console.log(`Backed up ${saved} manual service file(s) → ${BACKUP_DIR}`);
}

function restoreManualFiles() {
  let restored = 0;
  for (const file of MANUAL_SERVICE_FILES) {
    const backup = path.join(BACKUP_DIR, file);
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, path.join(SERVICES_DIR, file));
      restored++;
    }
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log(`Restored ${restored} manual service file(s)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch swagger spec
  console.log(`Fetching OpenAPI spec from ${DEFAULT_URL} …`);
  const res = await fetch(DEFAULT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenAPI: ${res.status} ${DEFAULT_URL}`);
  }
  const doc = (await res.json()) as Record<string, unknown>;
  fs.writeFileSync("openapi.json", JSON.stringify(doc, null, 2));
  console.log("Wrote openapi.json");

  const oas3 = await ensureOpenAPI3(doc);
  fs.writeFileSync("openapi-oas3.json", JSON.stringify(oas3, null, 2));
  console.log("Wrote openapi-oas3.json (OpenAPI 3)");

  // 2. Backup manual service wrappers
  backupManualFiles();

  // 3. Run codegen (wipes src/api/services, then regenerates)
  console.log("Running openapi-typescript-codegen …");
  execSync(
    "npx openapi-typescript-codegen --input openapi.json --output src/api --client axios",
    { stdio: "inherit" },
  );

  // 4. Restore manual wrappers
  restoreManualFiles();

  // 5. Generate openapi-types.ts
  console.log("Running openapi-typescript …");
  execSync(
    "npx openapi-typescript openapi-oas3.json -o src/api/openapi-types.ts",
    { stdio: "inherit" },
  );

  console.log("✅  API generation complete.");
}

void main();
