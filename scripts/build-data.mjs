import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LISTS } from "../src/data/lists.ts";
import {
  SLUG_RE,
  asDifficulty,
  fetchLeetCodeQuestion,
  loadRows,
  withRetry,
} from "./leetcode-dataset.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public", "data", "problems.json");
const outIndexPath = join(root, "public", "data", "problems-index.json");

async function fetchCatalogStatements(slugs, concurrency = 4) {
  const bySlug = new Map();
  let index = 0;
  async function worker() {
    while (index < slugs.length) {
      const slug = slugs[index];
      index += 1;
      try {
        const question = await withRetry(() => fetchLeetCodeQuestion(slug));
        bySlug.set(slug, question);
      } catch (err) {
        console.warn(`LeetCode fetch failed for ${slug}: ${err?.message ?? err}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, slugs.length) }, worker));
  return bySlug;
}

async function main() {
  const rows = await loadRows();

  const byId = new Map();
  for (const row of rows) {
    const id = Number(row.question_id);
    if (!Number.isFinite(id)) continue;
    if (!byId.has(id)) byId.set(id, row);
  }

  const topicLabels = new Map();
  for (const list of LISTS) {
    for (const topic of list.topics) topicLabels.set(topic.id, topic.label);
  }

  const problems = [];
  const leetCode = await fetchCatalogStatements(
    LISTS.flatMap((list) => list.entries.map((entry) => entry.slug)).filter(
      (slug, i, all) => all.indexOf(slug) === i,
    ),
  );
  let fromLeetCode = 0;
  for (const list of LISTS) {
    for (const entry of list.entries) {
      if (problems.some((p) => p.id === entry.id)) continue;
      const row = byId.get(entry.id);
      const lc = leetCode.get(entry.slug) ?? null;
      if (lc) fromLeetCode += 1;
      const problemDescription = lc?.problemDescription ?? (typeof row?.problem_description === "string" ? row.problem_description : "");
      const starterCode = typeof row?.starter_code === "string" ? row.starter_code : "";
      const difficulty = lc?.difficulty ?? asDifficulty(row?.difficulty);
      problems.push({
        id: entry.id,
        slug: entry.slug,
        title: entry.title,
        difficulty,
        problemDescription,
        starterCode,
        leetcodeUrl: `https://leetcode.com/problems/${entry.slug}/`,
        hasDescription: problemDescription.length > 0,
      });
    }
  }

  const index = [];
  const seen = new Set();
  const titleById = new Map(problems.map((p) => [p.id, p.title]));
  for (const row of rows) {
    const id = Number(row.question_id);
    const slug = typeof row.task_id === "string" ? row.task_id : "";
    if (!Number.isFinite(id) || !SLUG_RE.test(slug) || seen.has(id)) continue;
    seen.add(id);
    index.push({
      id,
      slug,
      title: titleById.get(id) ?? titleFromSlug(slug),
      difficulty: asDifficulty(row?.difficulty),
    });
  }
  index.sort((a, b) => a.id - b.id);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(problems, null, 2)}\n`);
  await writeFile(outIndexPath, `${JSON.stringify(index, null, 2)}\n`);
  const missing = problems.filter((p) => !p.hasDescription).length;
  console.log(
    `Wrote ${problems.length} problems (${fromLeetCode} statements from LeetCode, ${missing} missing descriptions) -> ${outPath}`,
  );
  console.log(`Wrote ${index.length} index entries -> ${outIndexPath}`);
  console.log(`Catalog problems covered by dataset rows: ${problems.filter((p) => byId.has(p.id)).length}/${problems.length}`);
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
