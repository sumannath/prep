export type Problem = {
  id: number;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Unknown";
  problemDescription: string;
  starterCode: string;
  leetcodeUrl: string;
  hasDescription: boolean;
};

export type ProblemIndexEntry = {
  id: number;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Unknown";
};
