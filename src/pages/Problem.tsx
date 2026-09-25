import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Lesson } from "../components/Lesson";
import { TopBar } from "../components/TopBar";
import { getStudied, setStudied } from "../lib/progress";
import { loadLesson, loadProblems, neighbors } from "../lib/problems";
import type { Problem } from "../types";

export function ProblemPage() {
  const { slug = "" } = useParams();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [prev, setPrev] = useState<Problem | null>(null);
  const [next, setNext] = useState<Problem | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studied, setStudiedState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLesson(null);
    setProblem(null);
    loadProblems()
      .then((problems) => {
        const found = neighbors(problems, slug);
        if (!found) throw new Error("Problem not found");
        if (cancelled) return;
        setProblem(found.problem);
        setPrev(found.prev);
        setNext(found.next);
        setStudiedState(getStudied().has(found.problem.slug));
        return loadLesson(found.problem.slug);
      })
      .then((md) => {
        if (!cancelled) setLesson(md ?? "");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="page">
        <TopBar />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="page">
        <TopBar />
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <TopBar>
        <Link to={`/topic/${problem.topic}`}>← {problem.topicLabel}</Link>
      </TopBar>

      <article>
        <div className="problem-hero">
          <span className={`diff ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          <h1>{problem.title}</h1>
          <div className="meta-row">
            <a className="btn" href={problem.leetcodeUrl} target="_blank" rel="noopener noreferrer">
              Open on LeetCode
            </a>
            <label className="study-toggle">
              <input
                type="checkbox"
                checked={studied}
                onChange={(e) => {
                  setStudied(problem.slug, e.target.checked);
                  setStudiedState(e.target.checked);
                }}
              />
              Mark studied
            </label>
          </div>
        </div>

        <nav className="pager">
          {prev ? <Link to={`/problem/${prev.slug}`}>← {prev.title}</Link> : <span />}
          {next ? <Link to={`/problem/${next.slug}`}>{next.title} →</Link> : <span />}
        </nav>

        {problem.hasDescription && (
          <>
            <h2>Problem</h2>
            <pre className="statement">{problem.problemDescription}</pre>
          </>
        )}

        <h2>Lesson</h2>
        {lesson === null ? (
          <p className="muted">Loading lesson…</p>
        ) : lesson ? (
          <Lesson markdown={lesson} />
        ) : (
          <p className="empty-lesson">
            Generate this lesson with{" "}
            <code>npm run generate:lessons -- --only {problem.slug}</code>
          </p>
        )}
      </article>
    </div>
  );
}
