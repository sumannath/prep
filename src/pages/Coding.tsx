import { useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { CODING_CATEGORIES, CODING_PROBLEMS, codingProgressKey } from "../data/coding";
import { getStudied, setStudied } from "../lib/progress";

export function Coding() {
  const [studied, setStudiedState] = useState<Set<string>>(() => getStudied());
  const doneTotal = CODING_PROBLEMS.filter((p) => studied.has(codingProgressKey(p.slug))).length;

  return (
    <div className="page">
      <TopBar>
        <Link className="btn" to="/">
          ← Home
        </Link>
        <p className="progress-chip">
          {doneTotal}/{CODING_PROBLEMS.length} studied
        </p>
      </TopBar>

      <main>
        <div className="hero">
          <h1>Coding problems</h1>
          <p>
            Code-design and data-structure rounds with hints, a deep dive, a tested Python solution, an interview
            walkthrough and the scale-up follow-up.
          </p>
        </div>

        <div className="round-flow">
          <strong>How a round flows:</strong> clarify (~5 min) → propose a plan and get a nod (5) → code while narrating
          (20) → test out loud (5) → adapt to the follow-up (10) → close with a trade-off question.
        </div>

        <nav className="toc">
          <Link to="/coding/refresher">All refreshers on one page</Link>
          {CODING_CATEGORIES.map((c) => (
            <a key={c.id} href={`#${c.id}`} onClick={(e) => {
              e.preventDefault();
              document.getElementById(c.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}>
              {c.label}
            </a>
          ))}
        </nav>

        {CODING_CATEGORIES.map((category) => {
          const entries = CODING_PROBLEMS.filter((p) => p.category === category.id);
          const done = entries.filter((p) => studied.has(codingProgressKey(p.slug))).length;
          return (
            <section key={category.id} id={category.id} className="topic">
              <div className="topic-head">
                <h2>{category.label}</h2>
                <span className="muted">
                  {done}/{entries.length}
                </span>
              </div>
              <p className="muted topic-blurb">{category.blurb}</p>
              <ul className="problem-list">
                {entries.map((p) => {
                  const key = codingProgressKey(p.slug);
                  return (
                    <li key={p.slug}>
                      <label>
                        <input
                          type="checkbox"
                          aria-label={`Mark ${p.title} as studied`}
                          checked={studied.has(key)}
                          onChange={(e) => setStudiedState(setStudied(key, e.target.checked))}
                        />
                      </label>
                      <span className={`diff ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                      <span className="coding-row">
                        <Link to={`/coding/${p.slug}`}>{p.title}</Link>
                        <span className="muted source-tag">{p.source}</span>
                      </span>
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
