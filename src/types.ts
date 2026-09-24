import type { TopicId } from "./data/neetcode150";

export type Problem = {
  id: number;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Unknown";
  topic: TopicId;
  topicLabel: string;
  problemDescription: string;
  starterCode: string;
  leetcodeUrl: string;
  hasDescription: boolean;
};
