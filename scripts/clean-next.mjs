import { rmSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");

if (!existsSync(dir)) process.exit(0);

// In Docker the .next/cache directory can be mounted as a volume / overlayfs layer
// and rmSync will throw EBUSY even with maxRetries.
// Strategy: delete everything inside .next EXCEPT cache, then let next build overwrite.
try {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === "cache") continue; // skip — may be locked in Docker
    try {
      rmSync(join(dir, entry), { recursive: true, force: true });
    } catch {
      // best-effort: next build will overwrite anyway
    }
  }
} catch {
  // If we can't even read .next, that's fine — next build will recreate it
  console.warn("[clean-next] Could not clean .next directory, continuing anyway.");
}
