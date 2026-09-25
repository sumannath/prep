import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { TopBar } from "../components/TopBar";
import { getList, type ListEntry } from "../data/lists";
import { loadProblemMap } from "../lib/problems";
import { getStudied, setStudied } from "../lib/progress";
import type { Problem } from "../types";

function difficultyClass(d: Problem["difficulty"]) {
  if (d === "Easy") return "easy";
  if (d === "Medium") return "medium";
  if (d === "Hard") return "hard";
  return "unknown";
}

export function ListView() {
  const { listId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const list = getList(listId);
  const [problemMap, setProblemMap] = useState<Map<number, Problem> | null>(null);
  const [studied, setStudiedState] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!list) return;
    let cancelled = false;
    loadProblemMap()
      .then((map) => {
        if (!cancelled) setProblemMap(map);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    setStudiedState(getStudied());
    return () => {
      cancelled = true;
    };
  }, [list]);

  const topicId = searchParams.get("t");
  useEffect(() => {
    if (!topicId) return;
    const el = document.getElementById(topicId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topicId, problemMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, ListEntry[]>();
    if (!list) return map;
    for (const entry of list.entries) {
      const arr = map.get(entry.topic) ?? [];
      arr.push(entry);
      map.set(entry.topic, arr);
    }
    return map;
  }, [list]);

  if (!list) {
    return (
      <div className="page">
        <TopBar />
        <p className="error">Unknown list &quot;{listId}&quot;.</p>
        <p>
          <Link to="/lists">← All lists</Link>
        </p>
      </div>
    );
  }

  const studiedCount = list.entries.filter((e) => studied.has(e.slug)).length;

  return (
    <div className="page">
      <TopBar>
        <Link className="btn" to="/lists">
          ← Lists
        </Link>
        <p className="progress-chip">
          {studiedCount}/{list.entries.length} studied
        </p>
      </TopBar>

      <main>
        <div className="hero">
          <h1>{list.label}</h1>
          <p>{list.description}</p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}. Run npm run build:data first.
          </p>
        )}

        <nav className="toc">
          {list.topics.map((topic) => {
            const entries = grouped.get(topic.id) ?? [];
            const done = entries.filter((e) => studied.has(e.slug)).length;
            return (
              <Link key={topic.id} to={`/list/${list.id}?t=${topic.id}`}>
                {topic.label} {entries.length ? `${done}/${entries.length}` : ""}
              </Link>
            );
          })}
        </nav>

        {list.topics.map((topic) => {
          const entries = grouped.get(topic.id) ?? [];
          const done = entries.filter((e) => studied.has(e.slug)).length;
          return (
            <section key={topic.id} id={topic.id} className="topic">
              <div className="topic-head">
                <h2>{topic.label}</h2>
                <span className="muted">
                  {done}/{entries.length}
                </span>
              </div>
              <ul className="problem-list">
                {entries.map((entry) => {
                  const problem = problemMap?.get(entry.id);
                  return (
                    <li key={entry.slug}>
                      <label>
                        <input
                          type="checkbox"
                          aria-label={`Mark ${entry.title} as studied`}
                          checked={studied.has(entry.slug)}
                          onChange={(e) => setStudiedState(setStudied(entry.slug, e.target.checked))}
                        />
                      </label>
                      <span className={`diff ${difficultyClass(problem?.difficulty ?? "Unknown")}`}>
                        {problem?.difficulty ?? "—"}
                      </span>
                      <Link to={`/list/${list.id}/${entry.slug}`}>
                        {entry.id} - {entry.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
