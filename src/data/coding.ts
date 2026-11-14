export type CodingCategoryId = "code-design" | "data-structures" | "integration";

export type CodingProblem = {
  slug: string;
  title: string;
  category: CodingCategoryId;
  source: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

export const CODING_CATEGORIES: { id: CodingCategoryId; label: string; blurb: string }[] = [
  {
    id: "code-design",
    label: "Code design",
    blurb: "Runnable, well-structured classes with tests. Class boundaries are scored as much as the algorithm.",
  },
  {
    id: "data-structures",
    label: "Data structures",
    blurb: "Pick the right structure, hit the target complexity, then adapt as the follow-ups ladder up.",
  },
  {
    id: "integration",
    label: "Integration exercise",
    blurb: "Make a client behave well against an API you don't control: limits, retries and useful logs.",
  },
];

export const CODING_PROBLEMS: CodingProblem[] = [
  { slug: "api-rate-limiter", title: "API rate limiter", category: "code-design", source: "Custom", difficulty: "Medium" },
  { slug: "top-n-collections-by-size", title: "Top N collections by size", category: "code-design", source: "Custom", difficulty: "Medium" },
  { slug: "design-snake-game", title: "Design Snake game", category: "code-design", source: "LC 353", difficulty: "Medium" },
  { slug: "middleware-router", title: "Middleware router", category: "code-design", source: "Custom", difficulty: "Medium" },
  { slug: "count-votes-rank-teams", title: "Count votes / rank teams", category: "code-design", source: "LC 1366 + variant", difficulty: "Medium" },
  { slug: "stock-price-fluctuation", title: "Stock price fluctuation", category: "data-structures", source: "LC 2034", difficulty: "Medium" },
  { slug: "all-oone-data-structure", title: "All O'one data structure", category: "data-structures", source: "LC 432", difficulty: "Hard" },
  { slug: "lru-cache", title: "LRU cache", category: "data-structures", source: "LC 146", difficulty: "Medium" },
  { slug: "time-based-key-value-store", title: "Time-based key-value store", category: "data-structures", source: "LC 981", difficulty: "Medium" },
  { slug: "closest-common-group-in-an-org-chart", title: "Closest common group in an org chart", category: "data-structures", source: "LC 236 + custom", difficulty: "Hard" },
  { slug: "merge-intervals", title: "Merge intervals", category: "data-structures", source: "LC 56", difficulty: "Medium" },
  { slug: "find-leaves-of-binary-tree", title: "Find leaves of binary tree", category: "data-structures", source: "LC 366", difficulty: "Medium" },
  { slug: "number-of-islands", title: "Number of islands", category: "data-structures", source: "LC 200", difficulty: "Medium" },
  { slug: "design-file-system-with-directory-sizes", title: "Design file system with directory sizes", category: "data-structures", source: "LC 1166 + custom", difficulty: "Medium" },
  { slug: "resilient-api-client-rate-limits-and-retries", title: "Resilient API client: rate limits and retries", category: "integration", source: "Custom", difficulty: "Hard" },
];

/** Progress key, prefixed so it never collides with list problems of the same slug (e.g. lru-cache). */
export function codingProgressKey(slug: string): string {
  return `coding:${slug}`;
}

const markdownCache = new Map<string, Promise<string>>();

export function loadCodingMarkdown(name: string): Promise<string> {
  let cached = markdownCache.get(name);
  if (!cached) {
    cached = fetch(`${import.meta.env.BASE_URL}coding/${name}.md`).then(async (res) => {
      const text = await res.text();
      if (!res.ok || /^\s*<!doctype html/i.test(text)) throw new Error("Content missing — run npm run dev or npm run build");
      return text;
    });
    cached.catch(() => markdownCache.delete(name));
    markdownCache.set(name, cached);
  }
  return cached;
}

/** Split a problem file into its `### ` sections so each can be collapsed. */
export function splitSections(markdown: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = [];
  let inFence = false;
  let current: { title: string; lines: string[] } | null = null;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    if (!inFence && line.startsWith("### ")) {
      if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: line.slice(4).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return sections;
}
