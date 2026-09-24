import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lessonPrompt } from "../src/lib/prompt.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const envPath = join(root, ".env");
  return readFile(envPath, "utf8")
    .then((text) => {
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    })
    .catch(() => undefined);
}

function parseArgs(argv) {
  let only = null;
  let concurrency = Number(process.env.CONCURRENCY ?? 6);
  let force = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--only") {
      only = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--only=")) {
      only = arg.slice("--only=".length);
    } else if (arg === "--concurrency") {
      concurrency = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith("--concurrency=")) {
      concurrency = Number(arg.slice("--concurrency=".length));
    } else if (arg === "--force") {
      force = true;
    }
  }
  if (!Number.isFinite(concurrency) || concurrency < 1) concurrency = 6;
  return { only, concurrency, force };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function callOpenRouter({ apiKey, model, prompt }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`OpenRouter ${res.status}: ${body.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty model response");
  }
  return text.trim();
}

async function withRetry(fn, { maxAttempts = 6 } = {}) {
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const status = err?.status;
      if (status !== undefined && status !== 429 && status < 500) throw err;
      if (attempt === maxAttempts) break;
      const wait = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

async function pool(items, concurrency, worker) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

async function main() {
  await loadEnv();
  const { only, concurrency, force } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "z-ai/glm-5.3-flash";
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY in .env");
    process.exit(1);
  }

  const problemsPath = join(root, "public", "data", "problems.json");
  const parsed = JSON.parse(await readFile(problemsPath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("problems.json is not an array");
  }
  const slugOk = /^[a-z0-9-]+$/;
  const problems = parsed.filter(
    (p) => p && typeof p.slug === "string" && slugOk.test(p.slug) && typeof p.title === "string",
  );
  let targets = problems.filter((p) => p.hasDescription);
  if (only) {
    targets = targets.filter((p) => p.slug === only || String(p.id) === only);
    if (targets.length === 0) {
      console.error(`No problem matched --only ${only}`);
      process.exit(1);
    }
  }

  const lessonDir = join(root, "content", "lessons");
  const publicDir = join(root, "public", "lessons");
  await mkdir(lessonDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  let done = 0;
  const total = targets.length;
  await pool(targets, concurrency, async (problem) => {
    const dest = join(lessonDir, `${problem.slug}.md`);
    const pub = join(publicDir, `${problem.slug}.md`);
    if (!force && !only && (await exists(dest))) {
      done += 1;
      console.log(`skip ${done}/${total} ${problem.slug}`);
      if (!(await exists(pub))) await writeFile(pub, await readFile(dest));
      return;
    }
    const prompt = lessonPrompt(problem.title, problem.problemDescription);
    const markdown = await withRetry(() => callOpenRouter({ apiKey, model, prompt }));
    await writeFile(dest, `${markdown}\n`);
    await writeFile(pub, `${markdown}\n`);
    done += 1;
    console.log(`done ${done}/${total} ${problem.slug}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
