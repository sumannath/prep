import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Lesson } from "../components/Lesson";
import { TopBar } from "../components/TopBar";
import { CODING_CATEGORIES, CODING_PROBLEMS, codingProgressKey, loadCodingMarkdown, splitSections } from "../data/coding";
import { getStudied, setStudied } from "../lib/progress";

/** Sections shown before you ask for them; everything else stays folded so it can't spoil the attempt. */
const OPEN_BY_DEFAULT = new Set(["Problem"]);

function sectionId(title: string): string {
  return `sec-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/** "Step 2 · Write the tests first" → "Write the tests first"; "Step 1 · Clarify (first ~5 min)" → "Clarify". */
function stepLabel(title: string): string {
  return title.split(" · ").slice(1).join(" · ").replace(/\s*\(.*\)\s*$/, "");
}

function openSection(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLDetailsElement) el.open = true;
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CodingProblemPage() {
  const { slug = "" } = useParams();
  const idx = CODING_PROBLEMS.findIndex((p) => p.slug === slug);
  const problem = idx >= 0 ? CODING_PROBLEMS[idx] : null;

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studied, setStudiedState] = useState(false);
  const [openAll, setOpenAll] = useState<boolean | null>(null);

  useEffect(() => {
    if (!problem) return;
    let cancelled = false;
    setMarkdown(null);
    setError(null);
    setOpenAll(null);
    setStudiedState(getStudied().has(codingProgressKey(problem.slug)));
    loadCodingMarkdown(problem.slug)
      .then((md) => !cancelled && setMarkdown(md))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, [problem]);

  if (!problem) {
    return (
      <div className="page">
        <TopBar />
        <p className="error">Unknown problem &quot;{slug}&quot;.</p>
        <p>
          <Link to="/coding">← Coding problems</Link>
        </p>
      </div>
    );
  }

  const category = CODING_CATEGORIES.find((c) => c.id === problem.category);
  const prev = idx > 0 ? CODING_PROBLEMS[idx - 1] : null;
  const next = idx < CODING_PROBLEMS.length - 1 ? CODING_PROBLEMS[idx + 1] : null;
  const sections = markdown ? splitSections(markdown) : [];
  const steps = sections.filter((s) => s.title.startsWith("Step "));

  return (
    <div className="page">
      <TopBar>
        <Link to="/coding">← Coding problems</Link>
      </TopBar>

      <article>
        <div className="problem-hero">
          <span className={`diff ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          <span className="muted hero-meta">
            {category?.label} · {problem.source}
          </span>
          <h1>{problem.title}</h1>
          <div className="meta-row">
            <label className="study-toggle">
              <input
                type="checkbox"
                checked={studied}
                onChange={(e) => {
                  setStudied(codingProgressKey(problem.slug), e.target.checked);
                  setStudiedState(e.target.checked);
                }}
              />
              Mark studied
            </label>
            <button type="button" className="btn" onClick={() => setOpenAll(!(openAll ?? false))}>
              {openAll ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {!error && markdown === null && <p className="muted">Loading…</p>}

        {steps.length > 0 && (
          <nav className="step-links" aria-label="Interview steps">
            {steps.map((s, i) => (
              <button key={s.title} type="button" onClick={() => openSection(sectionId(s.title))}>
                <span className="step-num">{i + 1}</span>
                {stepLabel(s.title)}
              </button>
            ))}
          </nav>
        )}

        {sections.map((section) => {
          const [main, ...note] = section.title.split(" · ");
          const isStep = section.title.startsWith("Step ");
          const isRevision = section.title.startsWith("60-second recap");
          return (
            <details
              // Re-mount on toggle-all so each section picks up the new default.
              key={`${problem.slug}-${section.title}-${String(openAll)}`}
              id={sectionId(section.title)}
              className={`study-section${isRevision ? " revision" : ""}`}
              open={openAll ?? OPEN_BY_DEFAULT.has(section.title)}
            >
              <summary>
                {isStep ? (
                  <>
                    <span className="step-kicker">{main}</span> {note.join(" · ")}
                  </>
                ) : (
                  <>
                    {main}
                    {note.length > 0 && <span className="summary-note">{note.join(" · ")}</span>}
                  </>
                )}
              </summary>
              <Lesson markdown={section.body} />
            </details>
          );
        })}

        <nav className="pager">
          {prev ? <Link to={`/coding/${prev.slug}`}>← {prev.title}</Link> : <span />}
          {next ? <Link to={`/coding/${next.slug}`}>{next.title} →</Link> : <span />}
        </nav>
      </article>
    </div>
  );
}

export function CodingRefresherPage() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCodingMarkdown("refresher")
      .then(setMarkdown)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  return (
    <div className="page">
      <TopBar>
        <Link to="/coding">← Coding problems</Link>
      </TopBar>
      <article>
        <div className="hero">
          <h1>Refresher</h1>
          <p>Every problem's approach in one paragraph — read this the night before.</p>
        </div>
        {error && <p className="error">{error}</p>}
        {markdown === null && !error ? <p className="muted">Loading…</p> : markdown && <Lesson markdown={markdown} />}
      </article>
    </div>
  );
}
