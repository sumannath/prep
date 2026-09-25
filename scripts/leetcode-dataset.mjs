import { parquetReadObjects } from "hyparquet";

export const PARQUET_URLS = [
  "https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/data/train-00000-of-00001.parquet",
  "https://huggingface.co/api/datasets/newfacade/LeetCodeDataset/parquet/default/train/0.parquet",
];

export const SLUG_RE = /^[a-z0-9-]+$/;

export async function downloadParquet() {
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

export async function loadRows() {
  const buf = await downloadParquet();
  return parquetReadObjects({ file: buf });
}

export function asDifficulty(value) {
  if (value === "Easy" || value === "Medium" || value === "Hard") return value;
  return "Unknown";
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

const NAMED_ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "…",
  times: "×",
  divide: "÷",
  minus: "−",
  le: "≤",
  ge: "≥",
};

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body[0] === "#") {
      const code = /^#x/i.test(body)
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

export function htmlToText(html) {
  let text = html;
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => `\n\n${inner.replace(/<[^>]+>/g, "")}\n\n`);
  text = text.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, (_, inner) => `^${inner.replace(/<[^>]+>/g, "")}`);
  text = text.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, (_, inner) => `_${inner.replace(/<[^>]+>/g, "")}`);
  text = text.replace(/<li[^>]*>/gi, "\n- ");
  text = text.replace(/<\/(li|ul|ol|p|div|h[1-6]|tr|blockquote|table|dd|dt)>/gi, "\n");
  text = text.replace(/<(ul|ol|p|div|h[1-6]|table|tr|blockquote|dd|dt)[^>]*>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/t[dh]>/gi, " ");
  text = text.replace(/<[^>]+>/g, "");
  text = decodeEntities(text);
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

const LC_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export async function fetchLeetCodeQuestion(slug) {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": LC_UA,
      Referer: `https://leetcode.com/problems/${slug}/`,
    },
    body: JSON.stringify({
      query: `query question($titleSlug: String!) {
        question(titleSlug: $titleSlug) { content title difficulty isPaidOnly }
      }`,
      variables: { titleSlug: slug },
    }),
  });
  if (!res.ok) throw new Error(`LeetCode GraphQL ${res.status}`);
  const data = await res.json();
  if (data?.errors?.length) throw new Error(`LeetCode GraphQL error: ${data.errors[0]?.message ?? "unknown"}`);
  const question = data?.data?.question;
  if (!question || question.isPaidOnly) return null;
  const content = typeof question.content === "string" ? question.content : "";
  if (!content.trim()) return null;
  return {
    title: typeof question.title === "string" ? question.title : titleFromSlug(slug),
    difficulty: asDifficulty(question.difficulty),
    problemDescription: htmlToText(content),
  };
}

export async function withRetry(fn, { attempts = 3, baseDelay = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

export function rowToProblem(row) {
  const slug = typeof row?.task_id === "string" ? row.task_id : "";
  const id = Number(row?.question_id);
  const problemDescription = typeof row?.problem_description === "string" ? row.problem_description : "";
  return {
    id,
    slug,
    title: titleFromSlug(slug),
    difficulty: asDifficulty(row?.difficulty),
    problemDescription,
    starterCode: typeof row?.starter_code === "string" ? row.starter_code : "",
    leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
    hasDescription: problemDescription.length > 0,
  };
}
