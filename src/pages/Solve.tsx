import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProblemView, type ProblemLike } from "../components/ProblemView";
import { TopBar } from "../components/TopBar";
import { getProblemById, loadLesson } from "../lib/problems";

export function Solve() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(id);
  const [problem, setProblem] = useState<ProblemLike | null>(null);
  const [lesson, setLesson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(id);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setProblem(null);
      setLesson(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setProblem(null);
    setLesson(null);

    const numeric = Number(id);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      setError(`"${id}" is not a valid LeetCode problem id. Try a number like 424.`);
      setLoading(false);
      return;
    }

    getProblemById(numeric)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setError(`No LeetCode problem with id ${numeric} in the loaded dataset.`);
          return;
        }
        setProblem(found);
        return loadLesson(found.id, found.slug).then((md) => {
          if (!cancelled) setLesson(md);
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) navigate(`/solve/${encodeURIComponent(trimmed)}`);
  }

  const generateHint = problem ? `npm run generate:lessons -- --only ${problem.slug}` : "";

  return (
    <div className="page">
      <TopBar>
        <button type="button" className="btn" onClick={() => navigate("/")}>
          ← Home
        </button>
      </TopBar>

      <main>
        <div className="hero">
          <h1>See solution</h1>
          <p>Enter the LeetCode problem id (the number in the problem URL) to open its lesson.</p>
        </div>

        <form className="solve-form" onSubmit={submit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder="LeetCode id, e.g. 424"
            aria-label="LeetCode problem id"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn">
            Show solution
          </button>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="muted">Loading…</p>}

        {problem && (
          <article>
            <ProblemView problem={problem} lesson={lesson} generateHint={generateHint} />
          </article>
        )}
      </main>
    </div>
  );
}
