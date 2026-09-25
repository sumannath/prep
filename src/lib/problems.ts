import type { Problem, ProblemIndexEntry } from "../types";

const SLUG = /^[a-z0-9-]+$/;

function isProblem(value: unknown): value is Problem {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "number" &&
    typeof p.slug === "string" &&
    SLUG.test(p.slug) &&
    typeof p.title === "string" &&
    typeof p.leetcodeUrl === "string" &&
    typeof p.problemDescription === "string" &&
    typeof p.hasDescription === "boolean"
  );
}

function isIndexEntry(value: unknown): value is ProblemIndexEntry {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "number" &&
    typeof p.slug === "string" &&
    SLUG.test(p.slug) &&
    typeof p.title === "string"
  );
}

let problemsPromise: Promise<Problem[]> | null = null;
let indexPromise: Promise<ProblemIndexEntry[]> | null = null;
const byId = new Map<number, Problem>();
const bySlug = new Map<string, Problem>();
const indexById = new Map<number, ProblemIndexEntry>();
const lessonCache = new Map<string, Promise<string | null>>();

export function loadProblems(): Promise<Problem[]> {
  problemsPromise ??= (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/problems.json`);
    if (!res.ok) throw new Error("Failed to load problems.json");
    const data: unknown = await res.json();
    if (!Array.isArray(data) || !data.every(isProblem)) {
      throw new Error("Invalid problems.json");
    }
    for (const problem of data) {
      byId.set(problem.id, problem);
      bySlug.set(problem.slug, problem);
    }
    return data;
  })();
  return problemsPromise;
}

export function loadIndex(): Promise<ProblemIndexEntry[]> {
  indexPromise ??= (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/problems-index.json`);
    if (!res.ok) throw new Error("Failed to load problems-index.json");
    const data: unknown = await res.json();
    if (!Array.isArray(data) || !data.every(isIndexEntry)) {
      throw new Error("Invalid problems-index.json");
    }
    for (const entry of data) {
      if (!indexById.has(entry.id)) indexById.set(entry.id, entry);
    }
    return data;
  })();
  return indexPromise;
}

export async function loadProblemMap(): Promise<Map<number, Problem>> {
  await loadProblems();
  return byId;
}

export async function getProblemById(id: number): Promise<Problem | ProblemIndexEntry | null> {
  await loadProblems().catch(() => undefined);
  await loadIndex().catch(() => undefined);
  return byId.get(id) ?? indexById.get(id) ?? null;
}

export async function getProblemBySlug(slug: string): Promise<Problem | null> {
  await loadProblems();
  return bySlug.get(slug) ?? null;
}

export function loadLesson(id: number, slug: string): Promise<string | null> {
  const file = `${id}-${slug}`;
  let cached = lessonCache.get(file);
  if (!cached) {
    cached = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}lessons/${file}.md`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load lesson");
      const type = res.headers.get("content-type") ?? "";
      const text = await res.text();
      const looksLikeHtml =
        type.includes("text/html") ||
        /^\s*<!doctype html/i.test(text) ||
        text.includes('<div id="root">');
      if (looksLikeHtml) return null;
      return text;
    })();
    lessonCache.set(slug, cached);
  }
  return cached;
}
