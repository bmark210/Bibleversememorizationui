import { rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");
try {
  rmSync(dir, { recursive: true, force: true });
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : null;
  if (code !== "ENOENT") throw err;
}
