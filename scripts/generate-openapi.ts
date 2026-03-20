import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const swagger2openapi = require("swagger2openapi") as {
  convertObj: (
    obj: Record<string, unknown>,
    options: { patch?: boolean; warnOnly?: boolean },
    cb: (err: Error | null, result: { openapi: Record<string, unknown> }) => void
  ) => void;
};

const DEFAULT_URL =
  process.env.OPENAPI_SPEC_URL?.trim() ||
  "https://bible-memory-db-production.up.railway.app/swagger/doc.json";

function ensureOpenAPI3(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  const openapi = doc.openapi;
  if (typeof openapi === "string" && openapi.startsWith("3.")) {
    return Promise.resolve(doc);
  }
  if (doc.swagger === "2.0") {
    return new Promise((resolve, reject) => {
      swagger2openapi.convertObj(doc, { patch: true }, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result.openapi);
      });
    });
  }
  return Promise.reject(
    new Error("Unsupported API spec: expected swagger: 2.0 or openapi: 3.x")
  );
}

async function main() {
  const res = await fetch(DEFAULT_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenAPI: ${res.status} ${DEFAULT_URL}`);
  }
  const doc = (await res.json()) as Record<string, unknown>;
  fs.writeFileSync("openapi.json", JSON.stringify(doc, null, 2));
  console.log("Wrote openapi.json from", DEFAULT_URL);

  const oas3 = await ensureOpenAPI3(doc);
  fs.writeFileSync("openapi-oas3.json", JSON.stringify(oas3, null, 2));
  console.log("Wrote openapi-oas3.json (OpenAPI 3) for openapi-typescript");
}

void main();
