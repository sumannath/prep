import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Home } from "./pages/Home";
import { Lists } from "./pages/Lists";
import { ListView } from "./pages/ListView";
import { ProblemPage } from "./pages/Problem";
import { Solve } from "./pages/Solve";

function PageViews() {
  const location = useLocation();

  useEffect(() => {
    const page_path = location.pathname + location.search;
    window.gtag?.("event", "page_view", {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);

  return null;
}

function TopicRedirect() {
  const { topicId = "" } = useParams();
  return <Navigate to={`/list/neetcode-150?t=${topicId}`} replace />;
}

function ProblemRedirect() {
  const { slug = "" } = useParams();
  return <Navigate to={`/list/neetcode-150/${slug}`} replace />;
}

export default function App() {
  return (
    <HashRouter>
      <PageViews />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/solve" element={<Solve />} />
        <Route path="/solve/:id" element={<Solve />} />
        <Route path="/lists" element={<Lists />} />
        <Route path="/list/:listId" element={<ListView />} />
        <Route path="/list/:listId/:slug" element={<ProblemPage />} />
        <Route path="/topic/:topicId" element={<TopicRedirect />} />
        <Route path="/problem/:slug" element={<ProblemRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
