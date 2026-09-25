import type { ReactNode } from "react";
import { Lesson } from "./Lesson";
import type { Problem } from "../types";

export type ProblemLike = Pick<Problem, "id" | "slug" | "title"> & {
  difficulty?: Problem["difficulty"];
  leetcodeUrl?: string;
  problemDescription?: string;
  hasDescription?: boolean;
};

function leetcodeUrlFor(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function ProblemView({
  problem,
  lesson,
  generateHint,
  toolbar,
}: {
  problem: ProblemLike;
  lesson: string | null;
  generateHint: string;
  toolbar?: ReactNode;
}) {
  const url = problem.leetcodeUrl ?? leetcodeUrlFor(problem.slug);
  const difficulty = problem.difficulty;
  return (
    <>
      <div className="problem-hero">
        {difficulty && <span className={`diff ${difficulty.toLowerCase()}`}>{difficulty}</span>}
        <h1>
          {problem.id} - {problem.title}
        </h1>
        <div className="meta-row">
          {toolbar}
          <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
            Open on LeetCode
          </a>
        </div>
      </div>

      {problem.hasDescription && problem.problemDescription ? (
        <>
          <h2>Problem</h2>
          <pre className="statement">{problem.problemDescription}</pre>
        </>
      ) : (
        <p className="muted">Statement not bundled for this problem. Open it on LeetCode to read the prompt.</p>
      )}

      <h2>Lesson</h2>
      {lesson === null ? (
        <p className="muted">Loading lesson…</p>
      ) : lesson ? (
        <Lesson markdown={lesson} />
      ) : (
        <p className="empty-lesson">
          Generate this lesson with <code>{generateHint}</code>
        </p>
      )}
    </>
  );
}
