import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { TopBar } from "../components/TopBar";
import { TOPICS, type TopicId } from "../data/neetcode150";
import { getStudied, setStudied } from "../lib/progress";
import { byTopic, loadProblems } from "../lib/problems";
import type { Problem } from "../types";

function difficultyClass(d: Problem["difficulty"]) {
  if (d === "Easy") return "easy";
  if (d === "Medium") return "medium";
  if (d === "Hard") return "hard";
  return "unknown";
}

export function Home() {
  const { topicId } = useParams();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [studied, setStudiedState] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProblems()
      .then(setProblems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
    setStudiedState(getStudied());
  }, []);

  useEffect(() => {
    if (!topicId) return;
    const el = document.getElementById(topicId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topicId, problems]);

  const grouped = useMemo(() => byTopic(problems), [problems]);
  const studiedCount = problems.filter((p) => studied.has(p.slug)).length;

  return (
    <div className="page">
      <TopBar>
        <p className="progress-chip">
          {studiedCount}/{problems.length || 150} studied
        </p>
      </TopBar>

      <main>
      <div className="hero">
        <h1>NeetCode 150</h1>
        <p>A clustered path through the core interview patterns. Mark what you have worked, then open a problem for the statement and lesson.</p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}. Run npm run build:data first.
        </p>
      )}

      <nav className="toc">
        {TOPICS.map((topic) => {
          const list = grouped.get(topic.id) ?? [];
          const done = list.filter((p) => studied.has(p.slug)).length;
          return (
            <Link key={topic.id} to={`/topic/${topic.id}`}>
              {topic.label} {list.length ? `${done}/${list.length}` : ""}
            </Link>
          );
        })}
      </nav>

      {TOPICS.map((topic) => {
        const list = grouped.get(topic.id as TopicId) ?? [];
        const done = list.filter((p) => studied.has(p.slug)).length;
        return (
          <section key={topic.id} id={topic.id} className="topic">
            <div className="topic-head">
              <h2>{topic.label}</h2>
              <span className="muted">
                {done}/{list.length}
              </span>
            </div>
            <ul className="problem-list">
              {list.map((problem) => (
                <li key={problem.slug}>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Mark ${problem.title} as studied`}
                      checked={studied.has(problem.slug)}
                      onChange={(e) => setStudiedState(setStudied(problem.slug, e.target.checked))}
                    />
                  </label>
                  <span className={`diff ${difficultyClass(problem.difficulty)}`}>{problem.difficulty}</span>
                  <Link to={`/problem/${problem.slug}`}>{problem.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      </main>
    </div>
  );
}
