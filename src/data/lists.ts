import { NEETCODE_150, TOPICS } from "./neetcode150";

export type ListEntry = {
  id: number;
  slug: string;
  title: string;
  topic: string;
  topicLabel: string;
};

export type ListTopic = {
  id: string;
  label: string;
};

export type PrepList = {
  id: string;
  label: string;
  description: string;
  topics: ListTopic[];
  entries: ListEntry[];
};

const neetcodeTopicLabel = new Map(TOPICS.map((t) => [t.id, t.label]));

const NEETCODE_150_LIST: PrepList = {
  id: "neetcode-150",
  label: "NeetCode 150",
  description:
    "A clustered path through the core interview patterns: arrays, two pointers, trees, graphs, DP and more.",
  topics: TOPICS.map((t) => ({ id: t.id, label: t.label })),
  entries: NEETCODE_150.map((entry) => ({
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    topic: entry.topic,
    topicLabel: neetcodeTopicLabel.get(entry.topic) ?? entry.topic,
  })),
};

export const LISTS: PrepList[] = [NEETCODE_150_LIST];

export function getList(listId: string | undefined): PrepList | null {
  if (!listId) return null;
  return LISTS.find((l) => l.id === listId) ?? null;
}
