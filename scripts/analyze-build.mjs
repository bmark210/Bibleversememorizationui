import { execSync } from "node:child_process";

process.env.ANALYZE = "true";

execSync("node scripts/clean-next.mjs && next build", {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
