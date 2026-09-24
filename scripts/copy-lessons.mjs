import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "content", "lessons");
const dest = join(root, "public", "lessons");

await mkdir(dest, { recursive: true });
try {
  await cp(src, dest, { recursive: true, force: true });
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
    process.exit(0);
  }
  throw err;
}
