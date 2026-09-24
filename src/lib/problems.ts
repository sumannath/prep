import type { Problem } from "../types";
import type { TopicId } from "../data/neetcode150";

const SLUG = /^[a-z0-9-]+$/;

function isProblem(value: unknown): value is Problem {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "number" &&
    typeof p.slug === "string" &&
    SLUG.test(p.slug) &&
    typeof p.title === "string" &&
    typeof p.topic === "string" &&
    typeof p.topicLabel === "string" &&
    typeof p.leetcodeUrl === "string" &&
    typeof p.problemDescription === "string" &&
    typeof p.hasDescription === "boolean"
  );
}

export async function loadProblems(): Promise<Problem[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/problems.json`);
  if (!res.ok) throw new Error("Failed to load problems.json");
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !data.every(isProblem)) {
    throw new Error("Invalid problems.json");
  }
  return data;
}

export function byTopic(problems: Problem[]): Map<TopicId, Problem[]> {
  const map = new Map<TopicId, Problem[]>();
  for (const problem of problems) {
    const list = map.get(problem.topic) ?? [];
    list.push(problem);
    map.set(problem.topic, list);
  }
  return map;
}

export function neighbors(problems: Problem[], slug: string): {
  problem: Problem;
  prev: Problem | null;
  next: Problem | null;
} | null {
  const problem = problems.find((p) => p.slug === slug);
  if (!problem) return null;
  const group = problems.filter((p) => p.topic === problem.topic);
  const i = group.findIndex((p) => p.slug === slug);
  return {
    problem,
    prev: i > 0 ? group[i - 1] : null,
    next: i >= 0 && i < group.length - 1 ? group[i + 1] : null,
  };
}

export async function loadLesson(slug: string): Promise<string | null> {
  const res = await fetch(`${import.meta.env.BASE_URL}lessons/${slug}.md`);
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
}
