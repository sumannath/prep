import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";

export function Home() {
  return (
    <div className="page">
      <TopBar />
      <main>
        <div className="hero">
          <h1>Prep</h1>
          <p>Look up the solution for any LeetCode problem by id, or work through a curated problem list.</p>
        </div>

        <div className="option-cards">
          <Link to="/solve" className="option-card">
            <h2>See solution</h2>
            <p>Enter a LeetCode problem id and open its full lesson — restated problem, brute force, optimal approach, complexity and talk-track.</p>
            <span className="card-cta">Look up by id →</span>
          </Link>
          <Link to="/lists" className="option-card">
            <h2>Lists</h2>
            <p>Browse curated problem lists such as NeetCode 150, grouped by pattern with progress tracking. Shared problems are loaded once and reused.</p>
            <span className="card-cta">Browse lists →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
