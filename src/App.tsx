import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { ProblemPage } from "./pages/Problem";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topic/:topicId" element={<Home />} />
        <Route path="/problem/:slug" element={<ProblemPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
