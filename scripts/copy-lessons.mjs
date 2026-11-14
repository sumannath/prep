import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// content/<dir> -> public/<dir>
for (const dir of ["lessons", "coding"]) {
  const src = join(root, "content", dir);
  const dest = join(root, "public", dir);
  await mkdir(dest, { recursive: true });
  try {
    await cp(src, dest, { recursive: true, force: true });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") continue;
    throw err;
  }
}
