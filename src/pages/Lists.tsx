import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { LISTS } from "../data/lists";
import { getStudied } from "../lib/progress";

export function Lists() {
  const studied = getStudied();
  return (
    <div className="page">
      <TopBar>
        <Link className="btn" to="/">
          ← Home
        </Link>
      </TopBar>

      <main>
        <div className="hero">
          <h1>Lists</h1>
          <p>Curated problem lists. A problem shared across lists is stored once and reused — the lesson is fetched a single time.</p>
        </div>

        <div className="option-cards">
          {LISTS.map((list) => {
            const done = list.entries.filter((e) => studied.has(e.slug)).length;
            return (
              <Link key={list.id} to={`/list/${list.id}`} className="option-card">
                <h2>{list.label}</h2>
                <p>{list.description}</p>
                <span className="card-cta">
                  {list.entries.length} problems{done ? ` · ${done} studied` : ""} →
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
