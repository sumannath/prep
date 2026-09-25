import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProblemView } from "../components/ProblemView";
import { TopBar } from "../components/TopBar";
import { getList } from "../data/lists";
import { getProblemBySlug, loadLesson } from "../lib/problems";
import { getStudied, setStudied } from "../lib/progress";
import type { Problem } from "../types";

export function ProblemPage() {
  const { listId = "", slug = "" } = useParams();
  const list = getList(listId);
  const entry = list?.entries.find((e) => e.slug === slug) ?? null;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studied, setStudiedState] = useState(false);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    setError(null);
    setProblem(null);
    setLesson(null);
    getProblemBySlug(entry.slug)
      .then((found) => {
        if (cancelled) return;
        if (!found) throw new Error("Problem data missing — run npm run build:data first");
        setProblem(found);
        setStudiedState(getStudied().has(found.slug));
        return loadLesson(found.id, found.slug);
      })
      .then((md) => {
        if (!cancelled) setLesson(md ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [entry, slug]);

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

  if (!entry) {
    return (
      <div className="page">
        <TopBar>
          <Link to={`/list/${list.id}`}>← {list.label}</Link>
        </TopBar>
        <p className="error">Problem &quot;{slug}&quot; is not part of {list.label}.</p>
      </div>
    );
  }

  const siblings = list.entries.filter((e) => e.topic === entry.topic);
  const idx = siblings.findIndex((e) => e.slug === entry.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  if (error) {
    return (
      <div className="page">
        <TopBar>
          <Link to={`/list/${list.id}?t=${entry.topic}`}>← {entry.topicLabel}</Link>
        </TopBar>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <TopBar>
        <Link to={`/list/${list.id}?t=${entry.topic}`}>← {entry.topicLabel}</Link>
      </TopBar>

      <article>
        {problem ? (
          <ProblemView
            problem={problem}
            lesson={lesson}
            generateHint={`npm run generate:lessons -- --only ${problem.slug}`}
            toolbar={
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
            }
          />
        ) : (
          <p className="muted">Loading…</p>
        )}

        <nav className="pager">
          {prev ? <Link to={`/list/${list.id}/${prev.slug}`}>← {prev.title}</Link> : <span />}
          {next ? <Link to={`/list/${list.id}/${next.slug}`}>{next.title} →</Link> : <span />}
        </nav>
      </article>
    </div>
  );
}
