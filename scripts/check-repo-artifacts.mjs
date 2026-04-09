import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const blockedPatterns = [/\.log$/i, /\.err\.log$/i, /\.tsbuildinfo$/i];
const ignoredDirs = new Set([".git", ".next", "node_modules"]);
const ignoredFiles = new Set([
  "tsconfig.tsbuildinfo",
  "tsconfig.typecheck.tsbuildinfo",
  "tsconfig.unused.tsbuildinfo",
]);

async function walk(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function isBlocked(filePath) {
  return blockedPatterns.some((pattern) => pattern.test(filePath));
}

const allFiles = await walk(rootDir);
const blockedFiles = allFiles.filter((path) =>
  isBlocked(relative(rootDir, path).replaceAll("\\", "/")),
);
const actionableBlockedFiles = blockedFiles.filter(
  (path) => !ignoredFiles.has(relative(rootDir, path).replaceAll("\\", "/")),
);

if (actionableBlockedFiles.length > 0) {
  console.error("Найдены запрещенные runtime-артефакты:");
  for (const blockedFile of actionableBlockedFiles) {
    console.error(`- ${relative(rootDir, blockedFile).replaceAll("\\", "/")}`);
  }
  process.exit(1);
}

console.log("Artifact check passed: запрещенных runtime-артефактов не найдено.");
