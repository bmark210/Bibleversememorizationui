import { rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");

try {
  rmSync(dir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : null;
  if (code === "ENOENT") {
    // nothing to remove
  } else if (
    code === "EBUSY" ||
    code === "EPERM" ||
    code === "ENOTEMPTY" ||
    code === "EACCES"
  ) {
    // Docker / overlayfs / mounted cache: lock on .next/cache is common; build can still run
    console.warn(
      `[clean-next] Skipped removing ${dir} (${code}). next build will continue.`,
    );
  } else {
    throw err;
  }
}
