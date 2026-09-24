import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parquetReadObjects } from "hyparquet";
import { NEETCODE_150, TOPICS } from "../src/data/neetcode150.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public", "data", "problems.json");

const PARQUET_URLS = [
  "https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/data/train-00000-of-00001.parquet",
  "https://huggingface.co/api/datasets/newfacade/LeetCodeDataset/parquet/default/train/0.parquet",
];

async function downloadParquet() {
  let lastError = null;
  for (const url of PARQUET_URLS) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        lastError = new Error(`${url} -> ${res.status}`);
        continue;
      }
      return await res.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Failed to download LeetCodeDataset parquet");
}

function asDifficulty(value) {
  if (value === "Easy" || value === "Medium" || value === "Hard") return value;
  return "Unknown";
}

async function main() {
  const buf = await downloadParquet();
  const rows = await parquetReadObjects({ file: buf });
  const byId = new Map();
  for (const row of rows) {
    const id = Number(row.question_id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, row);
  }

  const topicLabel = new Map(TOPICS.map((t) => [t.id, t.label]));
  const problems = NEETCODE_150.map((entry) => {
    const row = byId.get(entry.id);
    const problemDescription = typeof row?.problem_description === "string" ? row.problem_description : "";
    const starterCode = typeof row?.starter_code === "string" ? row.starter_code : "";
    const difficulty = asDifficulty(row?.difficulty);
    return {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      difficulty,
      topic: entry.topic,
      topicLabel: topicLabel.get(entry.topic) ?? entry.topic,
      problemDescription,
      starterCode,
      leetcodeUrl: `https://leetcode.com/problems/${entry.slug}/`,
      hasDescription: problemDescription.length > 0,
    };
  });

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(problems, null, 2)}\n`);
  const missing = problems.filter((p) => !p.hasDescription).length;
  console.log(`Wrote ${problems.length} problems (${missing} missing HF descriptions) -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
